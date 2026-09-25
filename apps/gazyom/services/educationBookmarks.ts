const STORAGE_KEY = 'gazyom_edu_bookmarks';
const CHANGE_EVENT = 'gazyom-edu-bookmarks';

function parseIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => Math.trunc(Number(x)))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

export function getEducationBookmarkIds(): Set<number> {
  return new Set(parseIds());
}

export function setEducationBookmarkIds(ids: Set<number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}


export function toggleEducationBookmark(id: number): boolean {
  const s = getEducationBookmarkIds();
  if (s.has(id)) s.delete(id);
  else s.add(id);
  setEducationBookmarkIds(s);
  return s.has(id);
}

export function isEducationBookmarked(id: number): boolean {
  return getEducationBookmarkIds().has(id);
}

export function subscribeEducationBookmarks(listener: () => void): () => void {
  const onCustom = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
