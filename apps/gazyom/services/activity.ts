// What the customer did, read from the token history (every reward leaves a row there): today's
// meter reading and wheel spin, the meter-reading streak and calendar, referral rewards and the
// lessons whose reward was claimed. Kept in memory for a minute so switching tabs does not refetch;
// anything that adds a row (reading, wheel, claim) calls invalidateActivity() and listeners reload.

import type { Transaction } from '../types';
import { JALALI_CHART_MONTH_LABELS, fetchTokenHistory, normalizeWsBaseUrl, toEnglishDigitsOnly } from './wsOptimizeApi';

// Daftar counts "today" on the Jalali calendar in Tehran time (meter reading and wheel limits).
const TZ = 'Asia/Tehran';
const MAX_AGE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Activity = {
  /** Jalali days ('1405/07/10') with a meter reading */
  karkardDays: Set<string>;
  karkardToday: boolean;
  wheelToday: boolean;
  /** Days in a row with a reading, counted back from today (or from yesterday while today is still open). */
  streak: number;
  referralCount: number;
  referralTokens: number;
  /** Titles of lessons and messages whose reward was claimed («پاداش مشاهده پیام: …»). */
  claimedTitles: Set<string>;
};

let dayFmt: Intl.DateTimeFormat | null = null;
let weekdayFmt: Intl.DateTimeFormat | null = null;

function parts(d: Date) {
  dayFmt ??= new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
    calendar: 'persian',
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const p = dayFmt.formatToParts(d);
  const num = (t: string) => parseInt(toEnglishDigitsOnly(p.find((x) => x.type === t)?.value ?? ''), 10);
  return { y: num('year'), m: num('month'), d: num('day') };
}

const keyOf = (y: number, m: number, d: number) => `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;

/** Jalali day key in Tehran, e.g. '1405/07/10'. */
export function jalaliKey(date: Date): string {
  const { y, m, d } = parts(date);
  return keyOf(y, m, d);
}

// Persian/Arabic digits to Latin, keeping separators (toEnglishDigitsOnly drops everything else).
const latinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** Day key of a history row ('1405/07/10 14:30'); Gregorian dates are converted. */
function rowDayKey(raw: string): string {
  const m = latinDigits(raw).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y > 1700) return jalaliKey(new Date(Date.UTC(y, mo - 1, d, 12)));
  return keyOf(y, mo, d);
}

function streakFrom(days: Set<string>, now: Date): number {
  let t = now.getTime();
  if (!days.has(jalaliKey(now))) t -= DAY_MS;
  let n = 0;
  while (days.has(jalaliKey(new Date(t)))) {
    n += 1;
    t -= DAY_MS;
  }
  return n;
}

export function activityFromRows(rows: Transaction[], now = new Date()): Activity {
  const today = jalaliKey(now);
  const karkardDays = new Set<string>();
  const claimedTitles = new Set<string>();
  let wheelToday = false;
  let referralCount = 0;
  let referralTokens = 0;
  for (const row of rows) {
    const day = rowDayKey(row.date);
    if (row.kind === 'karkard' && row.amount > 0 && day) karkardDays.add(day);
    if (row.kind === 'wheel' && day === today) wheelToday = true;
    if (row.kind === 'referral' && row.amount > 0) {
      referralCount += 1;
      referralTokens += row.amount;
    }
    if (row.kind === 'education') {
      const title = (row.note ?? '').match(/مشاهده پیام\s*:\s*(.+)$/)?.[1]?.trim();
      if (title) claimedTitles.add(title);
    }
  }
  return {
    karkardDays,
    karkardToday: karkardDays.has(today),
    wheelToday,
    streak: streakFrom(karkardDays, now),
    referralCount,
    referralTokens,
    claimedTitles,
  };
}

type Entry = { t: number; promise: Promise<Activity | null>; value?: Activity | null };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

const cacheKey = (baseUrl: string, keyNo: string | number) => `${normalizeWsBaseUrl(baseUrl)}|${String(keyNo)}`;

/** Activity of one subscription; null when the history could not be read. */
export function loadActivity(baseUrl: string, keyNo: string | number): Promise<Activity | null> {
  const key = cacheKey(baseUrl, keyNo);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < MAX_AGE_MS) return hit.promise;
  const entry: Entry = { t: Date.now(), promise: Promise.resolve(null) };
  entry.promise = fetchTokenHistory(baseUrl, { keyNo, filter: 'all', sort: 'newest' })
    .then((res) => (res.ok ? activityFromRows(res.rows) : null))
    .catch(() => null)
    .then((value) => {
      entry.value = value;
      if (value === null) cache.delete(key); // try again next time
      return value;
    });
  cache.set(key, entry);
  return entry.promise;
}

/** Last loaded activity without fetching (for screens that open on top of one that loaded it). */
export function peekActivity(baseUrl: string, keyNo: string | number): Activity | null {
  return cache.get(cacheKey(baseUrl, keyNo))?.value ?? null;
}

/** Call after anything that adds a history row; open screens reload. */
export function invalidateActivity() {
  cache.clear();
  listeners.forEach((fn) => fn());
}

export function subscribeActivity(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Referral rewards across all the user's subscriptions (the reward lands on one of them). */
export async function loadReferralStats(baseUrl: string, keyNos: string[]): Promise<{ count: number; tokens: number } | null> {
  const all = await Promise.all(keyNos.map((k) => loadActivity(baseUrl, k)));
  if (all.every((a) => a === null)) return null;
  return all.reduce(
    (sum, a) => ({ count: sum.count + (a?.referralCount ?? 0), tokens: sum.tokens + (a?.referralTokens ?? 0) }),
    { count: 0, tokens: 0 }
  );
}

export type CalendarDay = { key: string; day: number; weekday: number; isToday: boolean; isFuture: boolean };

/** The current Jalali month in Tehran: its name and days (weekday 0 = Saturday). */
export function currentJalaliMonth(now = new Date()): { title: string; days: CalendarDay[] } {
  weekdayFmt ??= new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });
  const { y, m, d } = parts(now);
  const order = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const first = new Date(now.getTime() - (d - 1) * DAY_MS);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 31; i++) {
    const date = new Date(first.getTime() + i * DAY_MS);
    const p = parts(date);
    if (p.m !== m) break;
    days.push({
      key: keyOf(p.y, p.m, p.d),
      day: p.d,
      weekday: Math.max(0, order.indexOf(weekdayFmt.format(date))),
      isToday: p.d === d,
      isFuture: p.d > d,
    });
  }
  return { title: `${JALALI_CHART_MONTH_LABELS[m - 1]} ${y}`, days };
}
