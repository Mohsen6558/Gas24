

import { normalizeWsBaseUrl } from './wsOptimizeApi';

const LS = 'gazyom_data_refresh_v1_';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type TimedBox<T> = { t: number; d: T };

function safeParse<T>(raw: string | null): TimedBox<T> | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as TimedBox<T>;
    if (!o || typeof o.t !== 'number' || o.t < 1) return null;
    return o;
  } catch {
    return null;
  }
}

function readTimed<T>(key: string, maxAgeMs: number): T | null {
  if (typeof localStorage === 'undefined') return null;
  const box = safeParse<T>(localStorage.getItem(LS + key));
  if (!box) return null;
  if (Date.now() - box.t > maxAgeMs) return null;
  return box.d;
}

function writeTimed<T>(key: string, data: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS + key, JSON.stringify({ t: Date.now(), d: data } satisfies TimedBox<T>));
  } catch {
    // ignore
  }
}

function seg(baseUrl: string, keyNo?: string): string {
  const b = encodeURIComponent(normalizeWsBaseUrl(baseUrl));
  return keyNo != null && keyNo !== '' ? `${b}__${encodeURIComponent(String(keyNo))}` : b;
}


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

function segUser(baseUrl: string, keyNo: string): string {
  return `${seg(baseUrl, keyNo)}__${userCacheSeg()}`;
}


export function chartConsumptionDayRead<T>(baseUrl: string, keyNo: string): T | null {
  return readTimed<T>(`day_chart__${seg(baseUrl, keyNo)}`, DAY_MS);
}

export function chartConsumptionDayWrite<T>(baseUrl: string, keyNo: string, data: T): void {
  writeTimed(`day_chart__${seg(baseUrl, keyNo)}`, data);
}


export function analysisHintsType3DayRead<T>(baseUrl: string, keyNo: string): T | null {
  return readTimed<T>(`day_analysis_hints_t3__${segUser(baseUrl, keyNo)}`, DAY_MS);
}

export function analysisHintsType3DayWrite<T>(baseUrl: string, keyNo: string, data: T): void {
  writeTimed(`day_analysis_hints_t3__${segUser(baseUrl, keyNo)}`, data);
}


export function rewardsListHourRead<T>(baseUrl: string, keyNo: string): T | null {
  return readTimed<T>(`hour_rewards__${seg(baseUrl, keyNo)}`, HOUR_MS);
}

export function rewardsListHourWrite<T>(baseUrl: string, keyNo: string, data: T): void {
  writeTimed(`hour_rewards__${seg(baseUrl, keyNo)}`, data);
}


export function educationMessagesHourRead<T>(baseUrl: string): T | null {
  return readTimed<T>(`hour_edu_msg_t0__${seg(baseUrl)}`, HOUR_MS);
}

export function educationMessagesHourWrite<T>(baseUrl: string, data: T): void {
  writeTimed(`hour_edu_msg_t0__${seg(baseUrl)}`, data);
}


export function faqListHourRead<T>(baseUrl: string): T | null {
  return readTimed<T>(`hour_faq__${seg(baseUrl)}`, HOUR_MS);
}

export function faqListHourWrite<T>(baseUrl: string, data: T): void {
  writeTimed(`hour_faq__${seg(baseUrl)}`, data);
}


export function myRewardsHourRead<T>(baseUrl: string, keyNo: string): T | null {
  return readTimed<T>(`hour_my_rewards__${seg(baseUrl, keyNo)}`, HOUR_MS);
}

export function myRewardsHourWrite<T>(baseUrl: string, keyNo: string, data: T): void {
  writeTimed(`hour_my_rewards__${seg(baseUrl, keyNo)}`, data);
}


export function leaderboardHourRead<T>(baseUrl: string, keyNo: string): T | null {
  return readTimed<T>(`hour_leaderboard__${seg(baseUrl, keyNo)}`, HOUR_MS);
}

export function leaderboardHourWrite<T>(baseUrl: string, keyNo: string, data: T): void {
  writeTimed(`hour_leaderboard__${seg(baseUrl, keyNo)}`, data);
}


export function tokenHistoryHourRead<T>(baseUrl: string, keyNo: string): T | null {
  return readTimed<T>(`hour_token_hist__${seg(baseUrl, keyNo)}`, HOUR_MS);
}

export function tokenHistoryHourWrite<T>(baseUrl: string, keyNo: string, data: T): void {
  writeTimed(`hour_token_hist__${seg(baseUrl, keyNo)}`, data);
}
