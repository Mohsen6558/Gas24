// Popup banner shown to signed-in users when they reach the main screen.
// Configured in banner.json next to the app (src/my/banner.json, served as
// my.gas24.ir/banner.json); that file is not part of the build, so a new picture, link or
// schedule goes live with a git pull. Field reference: README, «بنر تبلیغاتی اپ».

export type PromoBanner = {
  /** A new id starts the view count again (for a new campaign). */
  id: string;
  enabled?: boolean;
  /** Absolute URL, or a path on my.gas24.ir such as /banners/yalda.jpg */
  image: string;
  /** Optional. Without it the banner only opens as a popup with a close button. */
  link?: string;
  /** Text of the button under the picture when there is a link; default «مشاهده». */
  buttonText?: string;
  /** How many times one user sees it at most; default 3. */
  maxViews?: number;
  /** Province keys (kerman, ardabil, …); empty or missing = every province. */
  provinces?: string[];
  /** ISO dates/times, e.g. "2026-12-20" or "2026-12-20T18:00:00+03:30"; both optional. */
  from?: string;
  until?: string;
  alt?: string;
};

const CONFIG_URL = '/banner.json';
const VIEWS_KEY = 'gazyom_banner_views';
const SESSION_KEY = 'gazyom_banner_session';
export const DEFAULT_MAX_VIEWS = 3;

function readViews(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Counted per banner and per mobile number, so another account on the same phone still sees it.
const viewKey = (bannerId: string, mobile: string) => `${bannerId}|${mobile}`;

export function viewsOf(bannerId: string, mobile: string): number {
  const n = Number(readViews()[viewKey(bannerId, mobile)]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function recordView(bannerId: string, mobile: string) {
  try {
    const views = readViews();
    views[viewKey(bannerId, mobile)] = viewsOf(bannerId, mobile) + 1;
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
    sessionStorage.setItem(SESSION_KEY, bannerId);
  } catch {
    // storage disabled: the banner may show again next time, nothing breaks
  }
}

/** Logout clears localStorage; the view counts survive it so the limit still holds. */
export function keepBannerViewsAcross(clear: () => void) {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(VIEWS_KEY);
  } catch {
    // ignore
  }
  clear();
  try {
    if (saved) localStorage.setItem(VIEWS_KEY, saved);
  } catch {
    // ignore
  }
}

function shownThisSession(bannerId: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === bannerId;
  } catch {
    return false;
  }
}

function inWindow(b: PromoBanner, now: number): boolean {
  const from = b.from ? Date.parse(b.from) : NaN;
  const until = b.until ? Date.parse(b.until) : NaN;
  if (!Number.isNaN(from) && now < from) return false;
  if (!Number.isNaN(until) && now > until) return false;
  return true;
}

/** Only http(s) and same-site paths; anything else (javascript:, typos) means "no link". */
export function safeBannerLink(raw?: string): string {
  const link = (raw || '').trim();
  if (/^https?:\/\//i.test(link)) return link;
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  return '';
}

/** Links on my.gas24.ir open in place; everything else in a new tab/window. */
export function opensInPlace(link: string): boolean {
  try {
    return new URL(link, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** First banner that is on, in its dates, meant for this province, and not seen too often. */
export async function pickBanner(
  mobile: string,
  province: string,
  signal?: AbortSignal
): Promise<PromoBanner | null> {
  let banners: unknown;
  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-store', signal });
    if (!res.ok) return null;
    banners = (await res.json())?.banners;
  } catch {
    return null;
  }
  if (!Array.isArray(banners)) return null;

  const now = Date.now();
  for (const raw of banners as PromoBanner[]) {
    if (!raw || typeof raw !== 'object') continue;
    if (raw.enabled === false || !raw.id || !raw.image) continue;
    if (Array.isArray(raw.provinces) && raw.provinces.length > 0 && !raw.provinces.includes(province)) continue;
    if (!inWindow(raw, now)) continue;
    if (shownThisSession(raw.id)) return null;
    const max = Number.isFinite(raw.maxViews) && (raw.maxViews as number) > 0 ? (raw.maxViews as number) : DEFAULT_MAX_VIEWS;
    if (viewsOf(raw.id, mobile) >= max) continue;
    return raw;
  }
  return null;
}
