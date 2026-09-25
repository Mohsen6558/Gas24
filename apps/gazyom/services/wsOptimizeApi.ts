

import type {
  ConsumptionData,
  EducationMessage,
  LeaderboardEntry,
  LeaderboardSummary,
  MyRewardClaimedItem,
  Reward,
  Transaction,
} from '../types';

const TOKEN_COOKIE = 'gazyom_token';

export const normalizeWsBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');


export function readGazyomAuthToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export type KeynoListRow = {
  KeyNo: number | string;
  Alias?: string | null;
  Name?: string | null;
};

type ApiPayload = {
  Status?: boolean;
  success?: boolean;
  res?: unknown;
  type?: string;
  msg?: string;
  message?: string;
  count?: number;
};


export function isKeynoListEmptyResponse(data: ApiPayload | null): boolean {
  if (!data) return false;
  if (data.Status === false && data.res === 'Notfind') return true;
  if (data.success === false && data.type === 'notFound') return true;
  return false;
}

function parseKeynoRows(data: ApiPayload | null): KeynoListRow[] | null {
  if (!data) return null;
  if (isKeynoListEmptyResponse(data)) return [];
  const ok = data.success === true || data.Status === true;
  if (!ok) return null;
  const raw = data.res;
  if (!Array.isArray(raw)) return null;
  return raw as KeynoListRow[];
}

export type FetchKeynoListResult =
  | { ok: true; rows: KeynoListRow[] }
  | { ok: false; message: string };


export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

function normalizeFaqRow(item: unknown, index: number): FaqItem | null {
  if (item == null || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const idRaw =
    pickStrRow(r, ['id', 'ID', 'Id', 'FAQId', 'faq_id']) ||
    (pickNumRow(r, ['id', 'ID']) !== 0 ? String(Math.trunc(pickNumRow(r, ['id', 'ID']))) : '');
  const question = pickStrRow(r, [
    'Question',
    'question',
    'Title',
    'title',
    'Q',
    'q',
    'Subject',
    'subject',
    'Name',
    'name',
  ]);
  const answer = pickStrRow(r, [
    'Answer',
    'answer',
    'Text',
    'text',
    'Body',
    'body',
    'Description',
    'description',
    'A',
    'a',
  ]);
  if (!question && !answer) return null;
  const category = pickStrRow(r, [
    'Category',
    'category',
    'CatTitle',
    'cat_title',
    'Group',
    'group',
    'Type',
    'type',
    'Tag',
    'tag',
  ]);
  return {
    id: idRaw || `faq-${index}`,
    question: question || '—',
    answer: answer || '',
    category: category || 'عمومی',
  };
}

export type FetchGetFaqResult =
  | { ok: true; items: FaqItem[]; count: number }
  | { ok: false; message: string; type?: string };


export async function fetchGetFaq(
  baseUrl: string,
  options?: { signal?: AbortSignal }
): Promise<FetchGetFaqResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/get-faq`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: '{}',
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    count?: number;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok) {
    return {
      ok: false,
      message: errMsg || `خطای ${response.status}`,
      type: body?.type,
    };
  }

  if (body?.success === false) {
    if (body?.type === 'notFound') {
      return { ok: true, items: [], count: 0 };
    }
    return {
      ok: false,
      message: errMsg || 'دریافت سوالات متداول ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (!Array.isArray(raw)) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور', type: body?.type };
  }

  const items = raw
    .map((row, i) => normalizeFaqRow(row, i))
    .filter((row): row is FaqItem => row != null);
  const count = typeof body?.count === 'number' ? body.count : items.length;
  return { ok: true, items, count };
}


export async function fetchKeynoList(
  baseUrl: string,
  options?: { signal?: AbortSignal }
): Promise<FetchKeynoListResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/keyno-list`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: '{}',
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let data: ApiPayload | null = null;
  try {
    data = (await response.json()) as ApiPayload;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const msg = data?.msg ?? data?.message ?? `خطای ${response.status}`;
    return { ok: false, message: msg };
  }

  const rows = parseKeynoRows(data);
  if (rows === null) {
    if (isKeynoListEmptyResponse(data)) {
      return { ok: true, rows: [] };
    }
    const msg = data?.msg ?? data?.message ?? 'دریافت لیست اشتراک ناموفق بود';
    return { ok: false, message: msg };
  }

  return { ok: true, rows };
}

type JsonInit = Omit<RequestInit, 'body'> & { body?: unknown };

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';


export function toEnglishDigitsOnly(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const i = FA_DIGITS.indexOf(ch);
    if (i >= 0) {
      out += String(i);
      continue;
    }
    if (ch >= '0' && ch <= '9') out += ch;
  }
  return out;
}


export type GetProfileRow = {
  key_no: number | string;
  alias?: string;
  city_name?: string;
  total_token: number;
  has_google_id?: boolean;
  start_date_jalali?: string | null;
  rewards_count?: number;
};

export type FetchGetProfileResult =
  | { ok: true; mobNo?: string; referCode?: string; count: number; rows: GetProfileRow[] }
  | { ok: false; message: string; type?: string };


export async function fetchGetProfile(
  baseUrl: string,
  params: { keyNo: string | number },
  options?: { signal?: AbortSignal }
): Promise<FetchGetProfileResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }

  const keyStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/get-profile`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyStr }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    mobNo?: string;
    referCode?: string;
    count?: number;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت پروفایل ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (!Array.isArray(raw)) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور' };
  }

  return {
    ok: true,
    mobNo: body?.mobNo,
    referCode: body?.referCode,
    count: typeof body?.count === 'number' ? body.count : raw.length,
    rows: raw as GetProfileRow[],
  };
}


export type SubscriptionSearchRow = {
  KeyNo: string | number;
  Name?: string;
  Address?: string;
  City?: string;
  Serial?: string;
  Primary?: boolean;
};

export type SearchSubscriptionResult =
  | { ok: true; rows: SubscriptionSearchRow[] }
  | { ok: false; message: string; type?: string };


export async function searchSubscription(
  baseUrl: string,
  params: { data: string; type: 1 | 2 | 4; cityid?: number },
  options?: { signal?: AbortSignal }
): Promise<SearchSubscriptionResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const data = toEnglishDigitsOnly(params.data);
  if (!data) {
    return { ok: false, message: 'مقدار جستجو خالی است' };
  }
  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/search`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data,
        type: params.type,
        cityid: params.cityid ?? 0,
      }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    type?: string;
    message?: string;
    msg?: string;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok) {
    return { ok: false, message: errMsg || `خطای ${response.status}` };
  }

  if (body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'جستجو ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (!Array.isArray(raw)) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور' };
  }

  return { ok: true, rows: raw as SubscriptionSearchRow[] };
}

export type SubmitKeynoResult =
  | { ok: true; refCode?: string }
  | { ok: false; message: string; type?: string };


export async function submitNewKeyno(
  baseUrl: string,
  params: { keyNo: string | number; alias: string; googleID?: string },
  options?: { signal?: AbortSignal }
): Promise<SubmitKeynoResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo));
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const aliasTrim = params.alias.trim();
  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/submit-keyno`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        keyNo: keyNoStr,
        alias: aliasTrim,
        googleID: params.googleID ?? '',
      }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    Status?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    refCode?: string;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'ثبت اشتراک ناموفق بود',
      type: body?.type,
    };
  }

  return { ok: true, refCode: body?.refCode };
}


export const submitKeyno = submitNewKeyno;


export type HintRow = {
  id: number;
  message: string;
  token: number;
  is_done?: boolean;
};

export type FetchHintsResult =
  | { ok: true; rows: HintRow[]; count: number }
  | { ok: false; message: string; type?: string };


export async function fetchHints(
  baseUrl: string,
  params: { keyNo: string | number; type: 1 | 2 | 3 | 4 },
  options?: { signal?: AbortSignal }
): Promise<FetchHintsResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/hint`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoNum, type: params.type }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    count?: number;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت ماموریت‌ها ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (!Array.isArray(raw)) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور' };
  }

  const rows = raw as HintRow[];
  return {
    ok: true,
    rows,
    count: typeof body?.count === 'number' ? body.count : rows.length,
  };
}

export type SubmitMissionHintResult =
  | { ok: true; earned_token?: number }
  | { ok: false; message: string; type?: string };


export async function submitMissionHint(
  baseUrl: string,
  params: { keyNo: string | number; hintId: number },
  options?: { signal?: AbortSignal }
): Promise<SubmitMissionHintResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/submit-hint`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoStr, hintId: params.hintId }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    earned_token?: number;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'ثبت ماموریت ناموفق بود',
      type: body?.type,
    };
  }

  return {
    ok: true,
    earned_token: typeof body?.earned_token === 'number' ? body.earned_token : undefined,
  };
}

function pickStrRow(r: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function pickNumRow(r: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v.replace(/,/g, ''));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}


export const JALALI_CHART_MONTH_LABELS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

function pickMonthConsumptionValue(monthObj: Record<string, unknown>, mm: string): number {
  const keys = [mm, mm.replace(/^0/, '') || '0', String(parseInt(mm, 10))];
  const uniq = [...new Set(keys)];
  for (const k of uniq) {
    const v = monthObj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(toEnglishDigitsOnly(v).replace(/,/g, ''));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}


function normalizeChartYearMonthMap(raw: unknown): ConsumptionData[] {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const byYear = raw as Record<string, Record<string, unknown>>;
  const yearNums: number[] = [];
  for (const [yk, monthsVal] of Object.entries(byYear)) {
    if (monthsVal == null || typeof monthsVal !== 'object' || Array.isArray(monthsVal)) continue;
    const y = parseInt(toEnglishDigitsOnly(String(yk)).trim(), 10);
    if (!Number.isFinite(y)) continue;
    yearNums.push(y);
  }
  yearNums.sort((a, b) => a - b);
  if (yearNums.length === 0) return [];

  const yCur = yearNums[yearNums.length - 1];
  const yPrev = yearNums.length >= 2 ? yearNums[yearNums.length - 2] : null;
  const curKey = String(yCur);
  const prevKey = yPrev != null ? String(yPrev) : null;
  const monthObjCur = byYear[curKey] ?? {};
  const monthObjPrev = prevKey != null ? (byYear[prevKey] ?? {}) : {};

  const out: ConsumptionData[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    out.push({
      month: JALALI_CHART_MONTH_LABELS[m - 1],
      currentYear: pickMonthConsumptionValue(monthObjCur, mm),
      lastYear: prevKey != null ? pickMonthConsumptionValue(monthObjPrev, mm) : 0,
    });
  }
  return out;
}

function normalizeChartPayloadArray(raw: unknown[]): ConsumptionData[] {
  const out: ConsumptionData[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const month = pickStrRow(r, [
      'month',
      'Month',
      'monthName',
      'MonthName',
      'name',
      'Name',
      'Title',
      'label',
      'JMonth',
      'JalaliMonth',
    ]);
    const currentYear = pickNumRow(r, [
      'currentYear',
      'CurrentYear',
      'thisYear',
      'ThisYear',
      'current',
      'Curr',
      'Year0',
      'Value',
      'value',
      'This',
    ]);
    const lastYear = pickNumRow(r, [
      'lastYear',
      'LastYear',
      'previousYear',
      'PreviousYear',
      'last',
      'Year1',
      'Value2',
      'value2',
      'Last',
    ]);
    if (!month && currentYear === 0 && lastYear === 0) continue;
    out.push({
      month: month || '—',
      currentYear,
      lastYear,
    });
  }
  return out;
}


export function normalizeChartPayload(raw: unknown): ConsumptionData[] {
  if (Array.isArray(raw)) {
    return normalizeChartPayloadArray(raw);
  }
  return normalizeChartYearMonthMap(raw);
}

export type FetchConsumptionChartResult =
  | { ok: true; items: ConsumptionData[]; count: number }
  | { ok: false; message: string; type?: string };


export async function fetchConsumptionChart(
  baseUrl: string,
  params: { keyNo: string | number },
  options?: { signal?: AbortSignal }
): Promise<FetchConsumptionChartResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/chart`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoStr }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    data?: unknown;
    res?: unknown;
    count?: number;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت نمودار مصرف ناموفق بود',
      type: body?.type,
    };
  }

  const items = normalizeChartPayload(body?.data ?? body?.res);
  const count = typeof body?.count === 'number' ? body.count : items.length;
  return { ok: true, items, count };
}

const PLACEHOLDER_REWARD_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';

function mapRewardCategory(raw: string): Reward['category'] {
  const s = raw.toLowerCase();
  if (s.includes('cash') || s.includes('نقد')) return 'cash';
  if (s.includes('voucher') || s.includes('تخفیف') || s.includes('کد')) return 'voucher';
  if (s.includes('lottery') || s.includes('قرعه')) return 'lottery';
  if (s.includes('digital') || s.includes('دیجیتال')) return 'digital';
  return 'voucher';
}


export function normalizeRewardRow(item: unknown): Reward | null {
  if (item == null || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const numId = pickNumRow(r, ['RewardId', 'rewardId', 'Id', 'id', 'ID']);
  const idStr =
    pickStrRow(r, ['Id', 'id', 'RewardId', 'rewardId']) || (numId > 0 ? String(numId) : '');
  if (!idStr) return null;
  const cleanId = toEnglishDigitsOnly(idStr).trim();
  const parsedId = /^\d+$/.test(cleanId) ? parseInt(cleanId, 10) : 0;
  const effectiveRewardId = numId > 0 ? Math.trunc(numId) : parsedId > 0 ? parsedId : 0;
  const title = pickStrRow(r, ['Title', 'title', 'Name', 'name', 'RewardTitle']);
  const image =
    pickStrRow(r, ['Image', 'image', 'Pic', 'pic', 'ImageUrl', 'imageUrl', 'Thumb', 'thumb']) ||
    PLACEHOLDER_REWARD_IMAGE;
  const requiredGazyom = pickNumRow(r, [
    'token_required',
    'TokenRequired',
    'tokenRequired',
    'Token',
    'token',
    'NeedToken',
    'needToken',
    'Gazyom',
    'gazyom',
    'Price',
    'price',
    'Amount',
    'amount',
    'Score',
    'score',
  ]);
  const catRaw = pickStrRow(r, [
    'Category',
    'category',
    'CategoryTitle',
    'categoryTitle',
    'Type',
    'type',
    'Cat',
    'cat',
    'Group',
    'group',
    'Tag',
    'tag',
  ]);
  const category = catRaw ? mapRewardCategory(catRaw) : 'voucher';
  const description = pickStrRow(r, [
    'Text',
    'text',
    'Description',
    'description',
    'Desc',
    'desc',
    'Body',
    'body',
  ]);
  const terms = pickStrRow(r, ['Terms', 'terms', 'Condition', 'condition', 'Rules', 'rules']);
  return {
    id: idStr,
    rewardId: effectiveRewardId > 0 ? effectiveRewardId : undefined,
    title: title || 'جایزه',
    image,
    requiredGazyom,
    category,
    categoryLabel: catRaw || undefined,
    description: description || 'جزئیات این جایزه از طریق اپ قابل مشاهده است.',
    terms: terms || 'شرایط استفاده طبق اعلام سازمان.',
  };
}

export function normalizeRewardsPayload(raw: unknown): Reward[] {
  if (!Array.isArray(raw)) return [];
  const out: Reward[] = [];
  for (const item of raw) {
    const row = normalizeRewardRow(item);
    if (row) out.push(row);
  }
  return out;
}

export type FetchRewardListResult =
  | { ok: true; items: Reward[]; count: number }
  | { ok: false; message: string; type?: string };


export async function fetchRewardList(
  baseUrl: string,
  params: { keyNo: string | number },
  options?: { signal?: AbortSignal }
): Promise<FetchRewardListResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/reward`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoStr }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    Status?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    res?: unknown;
    data?: unknown;
    count?: number;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false || body?.Status === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت لیست جوایز ناموفق بود',
      type: body?.type,
    };
  }

  const rawList = body?.res ?? body?.data;
  const items = normalizeRewardsPayload(rawList);
  const count = typeof body?.count === 'number' ? body.count : items.length;
  return { ok: true, items, count };
}

export type RedeemRewardResult =
  | {
      ok: true;
      used_id: number;
      code: string;
      title: string;
      token_spent: number;
      message?: string;
    }
  | { ok: false; message: string; type?: string };


export async function redeemReward(
  baseUrl: string,
  params: { keyNo: string | number; rewardId: number },
  options?: { signal?: AbortSignal }
): Promise<RedeemRewardResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const rewardId = Math.trunc(params.rewardId);
  if (!Number.isFinite(rewardId) || rewardId < 1) {
    return { ok: false, message: 'شناسه جایزه نامعتبر است' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/redeem-reward`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoNum, rewardId }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت جایزه ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: errMsg || 'پاسخ نامعتبر از سرور',
      type: body?.type,
    };
  }
  const o = raw as Record<string, unknown>;
  const used_id = Math.trunc(pickNumRow(o, ['used_id', 'UsedID']));
  const code = pickStrRow(o, ['code', 'Code']);
  const title = pickStrRow(o, ['title', 'Title']);
  const token_spent = pickNumRow(o, ['token_spent', 'Token', 'token']);

  return {
    ok: true,
    used_id: used_id > 0 ? used_id : 0,
    code,
    title: title || 'جایزه',
    token_spent: token_spent > 0 ? token_spent : 0,
    message: typeof body?.message === 'string' ? body.message : undefined,
  };
}

function normalizeTokenHistoryRow(item: unknown): Transaction | null {
  if (item == null || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const idStr = pickStrRow(r, ['id', 'ID']);
  const idNum = pickNumRow(r, ['id', 'ID']);
  const id = idStr || (idNum !== 0 ? String(Math.trunc(idNum)) : '');
  if (!id) return null;

  const amount = pickNumRow(r, ['amount', 'Amount']);
  const desc = pickStrRow(r, ['description', 'Description']);
  const typeLabel = pickStrRow(r, ['type', 'Type']);
  const description =
    [typeLabel, desc].filter((x) => x.length > 0).join(' — ') || 'تراکنش';

  const date =
    pickStrRow(r, ['datetime', 'DateTime', 'date', 'Date']) || '—';

  let txType: Transaction['type'];
  if (typeof r.is_positive === 'boolean') {
    txType = r.is_positive ? 'earn' : 'spend';
  } else {
    txType = amount >= 0 ? 'earn' : 'spend';
  }

  return { id, date, amount, description, type: txType };
}

export type FetchTokenHistoryResult =
  | { ok: true; rows: Transaction[]; count: number }
  | { ok: false; message: string; type?: string };


export async function fetchTokenHistory(
  baseUrl: string,
  params: {
    keyNo: string | number;
    filter?: 'all' | 'in' | 'out';
    sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  },
  options?: { signal?: AbortSignal }
): Promise<FetchTokenHistoryResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }

  const filter = params.filter ?? 'all';
  const sort = params.sort ?? 'newest';

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/token-history`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoNum, filter, sort }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    count?: number;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت تاریخچه تراکنش‌ها ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (raw !== undefined && raw !== null && !Array.isArray(raw)) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور', type: body?.type };
  }

  const list = Array.isArray(raw) ? raw : [];
  const rows = list
    .map(normalizeTokenHistoryRow)
    .filter((row): row is Transaction => row != null);
  const count = typeof body?.count === 'number' ? body.count : rows.length;
  return { ok: true, rows, count };
}

function inferMyRewardUsedStatus(r: Record<string, unknown>): 'active' | 'used' {
  if (r.IsUsed === true || r.is_used === true || r.used === true) return 'used';
  if (r.IsRedeemed === true || r.is_redeemed === true) return 'used';
  const usedAt = pickStrRow(r, ['UsedDate', 'used_date', 'used_at', 'UsedAt']);
  if (usedAt.length > 0) return 'used';
  if (typeof r.status === 'string' && r.status.toLowerCase() === 'used') return 'used';
  return 'active';
}


export function normalizeMyRewardCodeField(code: unknown): { copy: string; label: string } {
  if (code == null) return { copy: '', label: '' };
  if (typeof code === 'string') {
    const s = code.trim();
    return { copy: s, label: s.length > 28 ? `${s.slice(0, 14)}…${s.slice(-8)}` : s };
  }
  if (typeof code === 'object' && !Array.isArray(code)) {
    const o = code as Record<string, unknown>;
    const inner =
      pickStrRow(o, ['code', 'Code', 'value', 'Value', 'track_id', 'TrackId', 'secret', 'Secret']) ||
      pickStrRow(o, ['title', 'Title']);
    if (inner) {
      return {
        copy: inner,
        label: inner.length > 28 ? `${inner.slice(0, 14)}…${inner.slice(-8)}` : inner,
      };
    }
    try {
      const s = JSON.stringify(code);
      return { copy: s, label: s.length > 32 ? `${s.slice(0, 18)}…` : s };
    } catch {
      return { copy: '', label: '' };
    }
  }
  return { copy: String(code), label: String(code) };
}

export function normalizeMyRewardUsedRow(item: unknown): MyRewardClaimedItem | null {
  if (item == null || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const id =
    pickStrRow(r, ['used_id', 'UsedID', 'id', 'ID']) ||
    (pickNumRow(r, ['used_id', 'UsedID']) !== 0
      ? String(Math.trunc(pickNumRow(r, ['used_id', 'UsedID'])))
      : '');
  if (!id) return null;

  const title = pickStrRow(r, ['title', 'Title', 'name', 'Name']) || 'جایزه';
  const image =
    pickStrRow(r, ['image', 'Image', 'pic', 'Pic']) || PLACEHOLDER_REWARD_IMAGE;
  const date =
    pickStrRow(r, ['assignee_date', 'AssigneeDate', 'assigneeDate', 'date', 'Date']) || '—';
  const { copy, label } = normalizeMyRewardCodeField(r.code);
  const status = inferMyRewardUsedStatus(r);

  return {
    id,
    title,
    image,
    date,
    codeCopy: copy,
    codeLabel: label || '—',
    status,
  };
}

export type FetchMyRewardsResult =
  | { ok: true; items: MyRewardClaimedItem[]; count: number }
  | { ok: false; message: string; type?: string };


export async function fetchMyRewards(
  baseUrl: string,
  params: { keyNo: string | number },
  options?: { signal?: AbortSignal }
): Promise<FetchMyRewardsResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/my-rewards`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoNum }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    count?: number;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok) {
    return {
      ok: false,
      message: errMsg || `خطای ${response.status}`,
      type: body?.type,
    };
  }

  if (body?.success === false) {
    if (body?.type === 'notFound') {
      return { ok: true, items: [], count: 0 };
    }
    return {
      ok: false,
      message: errMsg || 'دریافت کیف جوایز ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (raw !== undefined && raw !== null && !Array.isArray(raw)) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور', type: body?.type };
  }

  const list = Array.isArray(raw) ? raw : [];
  const items = list
    .map(normalizeMyRewardUsedRow)
    .filter((row): row is MyRewardClaimedItem => row != null);
  const count = typeof body?.count === 'number' ? body.count : items.length;
  return { ok: true, items, count };
}

export function normalizeEducationMessage(item: unknown): EducationMessage | null {
  if (item == null || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const id = Math.trunc(pickNumRow(r, ['id', 'ID']));
  if (!Number.isFinite(id) || id < 1) return null;
  const title = pickStrRow(r, ['title', 'Title']) || 'آموزش';
  const text = pickStrRow(r, ['text', 'Text', 'body', 'Body']);
  const category = pickStrRow(r, ['category', 'Category']);
  const icon = pickStrRow(r, ['icon', 'Icon']);
  const imageUrl = pickStrRow(r, ['image_url', 'ImageURL', 'imageUrl', 'image', 'Image']);
  const videoUrl = pickStrRow(r, ['video_url', 'VideoURL', 'videoUrl', 'video', 'Video']);
  const typ = Math.trunc(pickNumRow(r, ['type', 'Type']));
  const type: 0 | 1 = typ === 1 ? 1 : 0;
  const typeLabel =
    pickStrRow(r, ['type_label', 'typeLabel', 'TypeLabel']) || (type === 0 ? 'آموزش' : 'پیام');
  const tokenReward = Math.max(0, Math.trunc(pickNumRow(r, ['token_reward', 'tokenReward', 'Token'])));
  let durationSec = Math.trunc(pickNumRow(r, ['duration', 'Duration']));
  if (!Number.isFinite(durationSec) || durationSec < 0) durationSec = 0;
  const isPersonal =
    r.is_personal === true ||
    r.is_personal === 1 ||
    r.isPersonal === true ||
    String(r.is_personal).toLowerCase() === 'true';
  const dateJalali =
    pickStrRow(r, ['date_jalali', 'dateJalali', 'DateJalali']) || null;
  return {
    id,
    title,
    text,
    category,
    icon,
    imageUrl,
    videoUrl,
    type,
    typeLabel,
    tokenReward,
    durationSec,
    isPersonal,
    dateJalali,
  };
}


export function sortEducationMessagesVideoFirst(items: EducationMessage[]): EducationMessage[] {
  return [...items].sort((a, b) => {
    const av = a.videoUrl?.trim() ? 1 : 0;
    const bv = b.videoUrl?.trim() ? 1 : 0;
    return bv - av;
  });
}

export type FetchGetMessagesResult =
  | { ok: true; items: EducationMessage[]; count: number }
  | { ok: false; message: string; type?: string };


export async function fetchGetMessages(
  baseUrl: string,
  params: { keyNo?: string | number; type?: 0 | 1 },
  options?: { signal?: AbortSignal }
): Promise<FetchGetMessagesResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const msgType = params.type === 1 ? 1 : 0;

  let jsonBody: Record<string, unknown>;
  if (msgType === 1) {
    const keyNoStr = toEnglishDigitsOnly(String(params.keyNo ?? '')).trim();
    if (!keyNoStr) {
      return { ok: false, message: 'شماره اشتراک نامعتبر است' };
    }
    const keyNoNum = Number(keyNoStr);
    if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
      return { ok: false, message: 'شماره اشتراک نامعتبر است' };
    }
    jsonBody = { keyNo: keyNoNum, type: 1 };
  } else {
    jsonBody = { type: 0 };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/get-messages`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(jsonBody),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    count?: number;
    res?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت پیام‌ها ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.res;
  if (!Array.isArray(raw)) {
    return { ok: true, items: [], count: 0 };
  }

  const items = raw
    .map((row) => normalizeEducationMessage(row))
    .filter((row): row is EducationMessage => row != null);
  const count = typeof body?.count === 'number' ? body.count : items.length;
  return { ok: true, items, count };
}

export type ClaimMessageTokenResult =
  | { ok: true; addedToken: number; message?: string }
  | { ok: false; message: string; type?: string };


export async function claimMessageToken(
  baseUrl: string,
  params: { keyNo: string | number; messageId: number },
  options?: { signal?: AbortSignal }
): Promise<ClaimMessageTokenResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const messageId = Math.trunc(params.messageId);
  if (!Number.isFinite(messageId) || messageId < 1) {
    return { ok: false, message: 'شناسه پیام نامعتبر است' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/claim-message-token`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoNum, messageId }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let resBody: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    added_token?: number;
    addedToken?: number;
  } | null = null;
  try {
    resBody = (await response.json()) as typeof resBody;
  } catch {
    resBody = null;
  }

  const errMsg = resBody?.message ?? resBody?.msg ?? '';

  if (!response.ok || resBody?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت امتیاز ناموفق بود',
      type: resBody?.type,
    };
  }

  const added =
    typeof resBody?.added_token === 'number'
      ? resBody.added_token
      : typeof resBody?.addedToken === 'number'
        ? resBody.addedToken
        : 0;

  return {
    ok: true,
    addedToken: added,
    message: typeof resBody?.message === 'string' ? resBody.message : undefined,
  };
}

function normalizeLeaderboardRow(item: unknown): LeaderboardEntry | null {
  if (item == null || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const rank = Math.trunc(pickNumRow(r, ['rank', 'Rank']));
  const token = Math.trunc(pickNumRow(r, ['token', 'Token', 'TotalToken', 'total_token']));
  const mobNo = pickStrRow(r, ['mob_no', 'mobNo', 'MobNo']);
  const isMe = r.is_me === true || r.isMe === true || r.is_me === 1;
  if (!Number.isFinite(rank) || rank < 1) return null;
  return {
    rank,
    mobNo: mobNo || '—',
    isMe,
    token: Number.isFinite(token) && token >= 0 ? token : 0,
  };
}

function normalizeLeaderboardSummary(raw: unknown): LeaderboardSummary | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  const scopeRaw = pickStrRow(s, ['scope', 'Scope']).toLowerCase();
  const scope: 'city' | 'province' = scopeRaw === 'province' ? 'province' : 'city';
  return {
    myRank: Math.max(1, Math.trunc(pickNumRow(s, ['my_rank', 'myRank', 'MyRank'])) || 1),
    myToken: Math.max(0, Math.trunc(pickNumRow(s, ['my_token', 'myToken', 'MyToken']))),
    totalUsers: Math.max(0, Math.trunc(pickNumRow(s, ['total_users', 'totalUsers']))),
    totalTokensAll: Math.max(0, Math.trunc(pickNumRow(s, ['total_tokens_all', 'totalTokensAll']))),
    scope,
    cityName: pickStrRow(s, ['city_name', 'cityName', 'CityName']) || '—',
  };
}

export type FetchLeaderboardResult =
  | { ok: true; summary: LeaderboardSummary; rows: LeaderboardEntry[] }
  | { ok: false; message: string; type?: string };


export async function fetchLeaderboard(
  baseUrl: string,
  params: { keyNo: string | number; isCity?: boolean },
  options?: { signal?: AbortSignal }
): Promise<FetchLeaderboardResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }

  const isCity = params.isCity !== false;

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/leaderboard`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoNum, isCity }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    summary?: unknown;
    top_20?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'دریافت جدول رتبه‌بندی ناموفق بود',
      type: body?.type,
    };
  }

  const summary = normalizeLeaderboardSummary(body?.summary);
  if (!summary) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور', type: body?.type };
  }

  const rawList = body?.top_20;
  const list = Array.isArray(rawList) ? rawList : [];
  const rows = list
    .map((row) => normalizeLeaderboardRow(row))
    .filter((row): row is LeaderboardEntry => row != null);

  return { ok: true, summary, rows };
}

export type SpinLuckyWheelResult =
  | { ok: true; amount: number; message?: string }
  | { ok: false; message: string; type?: string };


export async function spinLuckyWheel(
  baseUrl: string,
  params: { keyNo: string | number },
  options?: { signal?: AbortSignal }
): Promise<SpinLuckyWheelResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }
  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/luky-wheel`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyNo: keyNoNum }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: {
    success?: boolean;
    message?: string;
    msg?: string;
    type?: string;
    amount?: unknown;
    Amount?: unknown;
  } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';

  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'چرخش گردونه ناموفق بود',
      type: body?.type,
    };
  }

  const raw = body?.amount ?? body?.Amount;
  let amount = 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    amount = Math.trunc(raw);
  } else if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(toEnglishDigitsOnly(raw.trim()));
    if (Number.isFinite(n)) amount = Math.trunc(n);
  }
  if (amount < 1) {
    return { ok: false, message: errMsg || 'پاسخ نامعتبر از سرور (مبلغ جایزه)', type: body?.type };
  }

  return { ok: true, amount, message: typeof body?.message === 'string' ? body.message : undefined };
}

export type SubmitKarkardResult =
  | { ok: true }
  | { ok: false; message: string; type?: string };


export async function submitKarkard(
  baseUrl: string,
  params: {
    keyNo: string | number;
    counterNumber: number;
    
    imageFile: string;
  },
  options?: { signal?: AbortSignal }
): Promise<SubmitKarkardResult> {
  const token = readGazyomAuthToken();
  if (!token) {
    return { ok: false, message: 'توکن یافت نشد' };
  }

  const keyNoStr = toEnglishDigitsOnly(String(params.keyNo)).trim();
  if (!keyNoStr) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }
  const keyNoNum = Number(keyNoStr);
  if (!Number.isFinite(keyNoNum) || !Number.isInteger(keyNoNum) || keyNoNum < 1) {
    return { ok: false, message: 'شماره اشتراک نامعتبر است' };
  }

  const cn = params.counterNumber;
  if (!Number.isFinite(cn) || !Number.isInteger(cn) || cn < 0) {
    return { ok: false, message: 'رقم کنتور نامعتبر است' };
  }

  let imagePayload = params.imageFile.trim();
  const b64Idx = imagePayload.indexOf('base64,');
  if (b64Idx >= 0) {
    imagePayload = imagePayload.slice(b64Idx + 7).trim();
  }
  if (!imagePayload) {
    return { ok: false, message: 'تصویر کنتور ارسال نشده است' };
  }

  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/submit-karkard`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        keyNo: keyNoNum,
        counterNumber: cn,
        imageFile: imagePayload,
      }),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }

  let body: { success?: boolean; message?: string; msg?: string; type?: string } | null = null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  const errMsg = body?.message ?? body?.msg ?? '';
  if (!response.ok || body?.success === false) {
    return {
      ok: false,
      message: errMsg || 'ثبت کارکرد ناموفق بود',
      type: body?.type,
    };
  }

  return { ok: true };
}


export async function authorizedJsonPost(
  baseUrl: string,
  pathAfterWsOptimize: string,
  init: JsonInit = {}
): Promise<Response> {
  const token = readGazyomAuthToken();
  if (!token) {
    throw new Error('توکن یافت نشد');
  }
  const path = pathAfterWsOptimize.replace(/^\/+/, '');
  const url = `${normalizeWsBaseUrl(baseUrl)}/api/index.php/ws-optimize/${path}`;
  const { body, headers: hdrs, ...rest } = init;
  const headers = new Headers(hdrs);
  headers.set('Accept', 'application/json');
  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, {
    ...rest,
    method: init.method ?? 'POST',
    headers,
    body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : (body as BodyInit | undefined),
  });
}
