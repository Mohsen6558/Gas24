

export type DailyMission = {
  id: number;
  title: string;
  points: number;
  completed: boolean;
};

const DONE_PREFIX = 'gazyom_daily_hints_done_v1';
const LIST_PREFIX = 'gazyom_daily_hints_list_v1';

export function getLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailyHintsDoneKey(keyNo: string): string {
  return `${DONE_PREFIX}_${keyNo}_${getLocalDateKey()}`;
}

export function dailyHintsListKey(keyNo: string): string {
  return `${LIST_PREFIX}_${keyNo}_${getLocalDateKey()}`;
}

export function readDoneHintIds(keyNo: string): Set<number> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(dailyHintsDoneKey(keyNo));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    const ids = arr
      .map((x) => (typeof x === 'number' ? x : typeof x === 'string' ? parseInt(x, 10) : NaN))
      .filter((n): n is number => Number.isFinite(n) && n > 0);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function appendDoneHintId(keyNo: string, hintId: number): void {
  if (typeof localStorage === 'undefined') return;
  const set = readDoneHintIds(keyNo);
  set.add(hintId);
  localStorage.setItem(dailyHintsDoneKey(keyNo), JSON.stringify([...set]));
}

export function readMissionsCache(keyNo: string): DailyMission[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(dailyHintsListKey(keyNo));
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const out: DailyMission[] = [];
    for (const item of arr) {
      if (item == null || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const id = Number(o.id);
      if (!Number.isFinite(id)) continue;
      out.push({
        id,
        title: typeof o.title === 'string' ? o.title : '',
        points: typeof o.points === 'number' ? o.points : 0,
        completed: o.completed === true,
      });
    }
    return out;
  } catch {
    return null;
  }
}

export function writeMissionsCache(keyNo: string, missions: DailyMission[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      dailyHintsListKey(keyNo),
      JSON.stringify(
        missions.map((m) => ({
          id: m.id,
          title: m.title,
          points: m.points,
          completed: m.completed,
        }))
      )
    );
  } catch {
    // ignore
  }
}

export function mergeMissionsWithDoneLocal(keyNo: string, missions: DailyMission[]): DailyMission[] {
  const doneLocal = readDoneHintIds(keyNo);
  return missions.map((m) => ({
    ...m,
    id: Number(m.id),
    completed: Boolean(m.completed) || doneLocal.has(Number(m.id)),
  }));
}


export function buildMissionsFromHintRows(
  rows: { id: number; message: string; token?: number; is_done?: boolean }[],
  keyNo: string
): DailyMission[] {
  const doneLocal = readDoneHintIds(keyNo);
  return rows.map((r) => {
    const id = Number(r.id);
    return {
      id,
      title: r.message,
      points: typeof r.token === 'number' ? r.token : 0,
      completed: r.is_done === true || doneLocal.has(id),
    };
  });
}


const SMART_HINT_T2_KEY = 'gazyom_dashboard_smart_hint_type2_v1';
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

type SmartHintT2Cache = { keyNo: string; message: string; savedAt: number };

export function readSmartHintType2Cache(keyNo: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SMART_HINT_T2_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as SmartHintT2Cache;
    if (!o || typeof o.message !== 'string' || o.message.trim() === '') return null;
    if (String(o.keyNo) !== String(keyNo)) return null;
    const saved = typeof o.savedAt === 'number' ? o.savedAt : 0;
    if (!Number.isFinite(saved) || Date.now() - saved > TWENTY_FOUR_H_MS) return null;
    return o.message.trim();
  } catch {
    return null;
  }
}

export function writeSmartHintType2Cache(keyNo: string, message: string): void {
  if (typeof localStorage === 'undefined') return;
  const trimmed = message.trim();
  if (!trimmed) return;
  try {
    const payload: SmartHintT2Cache = {
      keyNo: String(keyNo),
      message: trimmed,
      savedAt: Date.now(),
    };
    localStorage.setItem(SMART_HINT_T2_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}
