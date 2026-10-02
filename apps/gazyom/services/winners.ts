// «برندگان جوایز» page, opened from the rewards tab. The list lives in winners.json next to the
// app (src/my/winners.json, served as my.gas24.ir/winners.json); like banner.json it is not part
// of the build, so a new winner goes live with a git pull. Field reference: README, «برندگان جوایز».

import { normalizeImageUrl } from './media';

export type Winner = {
  id: string;
  enabled?: boolean;
  /** Absolute URL, or a path on my.gas24.ir such as /winners/1405-07-car.jpg */
  image?: string;
  title: string;
  text?: string;
  /** Free text shown on the card, e.g. «مهر ۱۴۰۵». */
  date?: string;
  /** Province keys (kerman, ardabil, …); empty or missing = every province. */
  provinces?: string[];
};

export type WinnersResult = { ok: true; items: Winner[] } | { ok: false; message: string };

const LIST_URL = '/winners.json';
const LOAD_ERROR = 'خطا در دریافت لیست برندگان';

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Winners that are on and meant for this province, in file order (newest first by convention). */
export async function fetchWinners(province: string, signal?: AbortSignal): Promise<WinnersResult> {
  let list: unknown;
  try {
    const res = await fetch(LIST_URL, { cache: 'no-store', signal });
    if (!res.ok) return { ok: false, message: LOAD_ERROR };
    list = (await res.json())?.winners;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: LOAD_ERROR };
  }
  if (!Array.isArray(list)) return { ok: true, items: [] };

  const items: Winner[] = [];
  (list as Partial<Winner>[]).forEach((raw, i) => {
    if (!raw || typeof raw !== 'object' || raw.enabled === false) return;
    const title = text(raw.title);
    if (!title) return;
    if (Array.isArray(raw.provinces) && raw.provinces.length > 0 && !raw.provinces.includes(province)) return;
    items.push({
      id: text(raw.id) || `winner-${i}`,
      title,
      text: text(raw.text),
      date: text(raw.date),
      image: normalizeImageUrl(text(raw.image)),
    });
  });
  return { ok: true, items };
}
