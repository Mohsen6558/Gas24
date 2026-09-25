

import { normalizeWsBaseUrl } from './wsOptimizeApi';


const LS_PREFIX = 'gazyom_target_road_v2_';
const OLD_COOKIE_NAME = 'gazyom_target_road_v1';

export type TargetRoadItem = { id: number; text: string };

function userCacheSeg(): string {
  if (typeof window === 'undefined') return '';
  try {
    const mob = localStorage.getItem('gazyom_mobile');
    const m = mob?.trim();
    if (m) return encodeURIComponent(m);
  } catch {
    // ignore
  }
  return 'nouser';
}

function seg(baseUrl: string, keyNo: string): string {
  const b = encodeURIComponent(normalizeWsBaseUrl(baseUrl));
  return `${b}__${encodeURIComponent(String(keyNo))}`;
}


export function targetAdviceRoadSeg(baseUrl: string, keyNo: string): string {
  return `${seg(baseUrl, keyNo)}__${userCacheSeg()}`;
}

function storageKey(expectedSeg: string): string {
  return LS_PREFIX + expectedSeg;
}

type Stored = { monthKey: string; items: TargetRoadItem[] };

function parseItems(raw: unknown): TargetRoadItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items: TargetRoadItem[] = [];
  for (const it of raw) {
    if (it == null || typeof it !== 'object') continue;
    const rawId = (it as { id?: unknown }).id;
    const id = Number(typeof rawId === 'string' ? rawId.trim() : rawId);
    const text = typeof (it as TargetRoadItem).text === 'string' ? (it as TargetRoadItem).text : '';
    if (!Number.isFinite(id) || !text.trim()) continue;
    items.push({ id, text: text.trim() });
  }
  return items.length > 0 ? items : null;
}


function clearLegacyCookie(): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${OLD_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function targetAdviceRoadRead(expectedSeg: string, currentMonthKey: string): TargetRoadItem[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(expectedSeg));
    if (!raw) return null;
    const o = JSON.parse(raw) as Stored;
    if (!o || typeof o.monthKey !== 'string' || o.monthKey !== currentMonthKey) return null;
    return parseItems(o.items);
  } catch {
    return null;
  }
}

export function targetAdviceRoadWrite(expectedSeg: string, monthKey: string, items: TargetRoadItem[]): void {
  if (typeof localStorage === 'undefined' || items.length === 0) return;
  try {
    localStorage.setItem(
      storageKey(expectedSeg),
      JSON.stringify({
        monthKey,
        items: items.map((x) => ({ id: x.id, text: x.text })),
      } satisfies Stored)
    );
    clearLegacyCookie();
  } catch {
    // ignore
  }
}
