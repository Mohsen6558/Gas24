// «پیام‌های من»: the subscription's personal messages plus public announcements, newest first.
// Read state stays on the device, per subscription; screens showing the unread badge subscribe.

import type { EducationMessage } from '../types';
import { fetchGetMessages, normalizeWsBaseUrl } from './wsOptimizeApi';

const MAX_AGE_MS = 60_000;
const readKey = (keyNo: string | number) => `gazyom_inbox_read_${String(keyNo)}`;

export type InboxResult = { ok: true; items: EducationMessage[] } | { ok: false; message: string };

const cache = new Map<string, { t: number; promise: Promise<InboxResult> }>();
const listeners = new Set<() => void>();

async function fetchInbox(baseUrl: string, keyNo: string | number): Promise<InboxResult> {
  const [personal, announcements] = await Promise.all([
    fetchGetMessages(baseUrl, { keyNo }).catch(() => null),
    fetchGetMessages(baseUrl, { type: 1 }).catch(() => null),
  ]);
  if (!personal?.ok && !announcements?.ok) {
    return { ok: false, message: (personal && !personal.ok && personal.message) || 'خطا در دریافت پیام‌ها' };
  }
  const byId = new Map<number, EducationMessage>();
  for (const res of [personal, announcements]) {
    if (res?.ok) res.items.forEach((m) => byId.set(m.id, m));
  }
  const items = [...byId.values()].sort(
    (a, b) => (b.dateUnix ?? 0) - (a.dateUnix ?? 0) || (b.dateJalali ?? '').localeCompare(a.dateJalali ?? '') || b.id - a.id
  );
  return { ok: true, items };
}

export function loadInbox(baseUrl: string, keyNo: string | number): Promise<InboxResult> {
  const key = `${normalizeWsBaseUrl(baseUrl)}|${String(keyNo)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < MAX_AGE_MS) return hit.promise;
  const promise = fetchInbox(baseUrl, keyNo).then((res) => {
    if (!res.ok) cache.delete(key);
    return res;
  });
  cache.set(key, { t: Date.now(), promise });
  return promise;
}

export function readMessageIds(keyNo: string | number): Set<number> {
  try {
    const ids = JSON.parse(localStorage.getItem(readKey(keyNo)) || '[]');
    return new Set(Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set();
  }
}

export function markMessageRead(keyNo: string | number, id: number) {
  const ids = readMessageIds(keyNo);
  if (ids.has(id)) return;
  ids.add(id);
  try {
    // keep the list short; old messages expire on the server anyway
    localStorage.setItem(readKey(keyNo), JSON.stringify([...ids].slice(-300)));
  } catch {
    // storage disabled: the message just stays unread
  }
  listeners.forEach((fn) => fn());
}

export function unreadCount(items: EducationMessage[], keyNo: string | number): number {
  const read = readMessageIds(keyNo);
  return items.filter((m) => !read.has(m.id)).length;
}

export function subscribeInboxRead(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
