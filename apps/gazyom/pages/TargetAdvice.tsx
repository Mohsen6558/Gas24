import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Target, Loader2 } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import {
  fetchConsumptionChart,
  fetchHints,
  JALALI_CHART_MONTH_LABELS,
} from '../services/wsOptimizeApi';
import { chartConsumptionDayRead, chartConsumptionDayWrite } from '../services/dataRefreshCache';
import { getCurrentJalaliMonth1To12, getCurrentJalaliYearMonthKey } from '../services/jalaliMonth';
import {
  targetAdviceRoadRead,
  targetAdviceRoadSeg,
  targetAdviceRoadWrite,
} from '../services/targetAdviceRoadCache';
import type { ConsumptionData } from '../types';

const MAX_HINT_FETCH_ATTEMPTS_PER_SLOT = 6;

function normalizeHintForCompare(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function wordSet(s: string): Set<string> {
  const n = normalizeHintForCompare(s);
  const parts = n.split(/[\s\u200c.,;:،؛!?؟()[\]{}«»]+/).filter((w) => w.length > 1);
  return new Set(parts);
}


function hintsTextTooSimilar(a: string, b: string): boolean {
  const na = normalizeHintForCompare(a);
  const nb = normalizeHintForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const short = na.length <= nb.length ? na : nb;
  const long = na.length <= nb.length ? nb : na;
  if (short.length >= 10 && long.includes(short) && short.length / long.length > 0.75) return true;
  const A = wordSet(a);
  const B = wordSet(b);
  if (A.size === 0 || B.size === 0) return na === nb;
  let inter = 0;
  for (const w of A) {
    if (B.has(w)) inter += 1;
  }
  const union = A.size + B.size - inter;
  const j = union > 0 ? inter / union : 0;
  return j > 0.55;
}

const TargetAdvice: React.FC<{
  onBack: () => void;
  wsBaseUrl: string;
  keyNo: string | number;
}> = ({ onBack, wsBaseUrl, keyNo }) => {
  const [chartRows, setChartRows] = useState<ConsumptionData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');

  const [roadItems, setRoadItems] = useState<{ id: number; text: string }[]>([]);
  const [roadLoading, setRoadLoading] = useState(false);
  const [roadError, setRoadError] = useState('');

  useEffect(() => {
    if (!wsBaseUrl || !keyNo) return;
    const keyNoStr = String(keyNo);
    const cached = chartConsumptionDayRead<ConsumptionData[]>(wsBaseUrl, keyNoStr);
    if (cached) {
      setChartRows(cached);
      setChartError('');
      setChartLoading(false);
      return;
    }
    const ac = new AbortController();
    setChartLoading(true);
    setChartError('');
    fetchConsumptionChart(wsBaseUrl, { keyNo }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setChartError(res.message);
          setChartRows([]);
          return;
        }
        chartConsumptionDayWrite(wsBaseUrl, keyNoStr, res.items);
        setChartRows(res.items);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setChartError('خطا در دریافت نمودار مصرف');
        setChartRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setChartLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl, keyNo]);

  useEffect(() => {
    if (!wsBaseUrl || !keyNo) return;
    const keyNoStr = String(keyNo);
    const roadSeg = targetAdviceRoadSeg(wsBaseUrl, keyNoStr);
    const monthKey = getCurrentJalaliYearMonthKey();
    const fromCache = targetAdviceRoadRead(roadSeg, monthKey);
    if (fromCache && fromCache.length > 0) {
      setRoadItems(fromCache);
      setRoadError('');
      setRoadLoading(false);
      return;
    }

    const ac = new AbortController();
    setRoadLoading(true);
    setRoadError('');
    setRoadItems([]);

    (async () => {
      const collected: { id: number; text: string }[] = [];
      let lastErr = '';

      for (let slot = 0; slot < 3; slot++) {
        if (ac.signal.aborted) return;
        let added = false;
        for (let attempt = 0; attempt < MAX_HINT_FETCH_ATTEMPTS_PER_SLOT; attempt++) {
          if (ac.signal.aborted) return;
          try {
            const res = await fetchHints(wsBaseUrl, { keyNo, type: 4 }, { signal: ac.signal });
            if (res.ok === false) {
              lastErr = res.message;
              break;
            }
            const row0 = res.rows[0];
            const raw = row0?.message?.trim() || '';
            if (!raw) continue;
            if (collected.some((c) => hintsTextTooSimilar(c.text, raw))) continue;
            collected.push({
              id: row0.id ?? -(slot * 1000 + attempt),
              text: raw,
            });
            added = true;
            break;
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            lastErr = 'خطا در دریافت نقشه راه';
            break;
          }
        }
        if (!added && lastErr) break;
      }

      
      if (collected.length > 0) {
        targetAdviceRoadWrite(roadSeg, monthKey, collected);
      }
      if (ac.signal.aborted) return;
      setRoadItems(collected);
      if (collected.length === 0) setRoadError(lastErr || 'توصیه‌ای دریافت نشد.');
      else setRoadError('');
    })()
      .catch(() => {
        if (ac.signal.aborted) return;
        setRoadError('خطا در دریافت نقشه راه');
        setRoadItems([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setRoadLoading(false);
      });

    return () => ac.abort();
  }, [wsBaseUrl, keyNo]);

  const { targetM3, monthLabel } = useMemo(() => {
    const jm = getCurrentJalaliMonth1To12();
    const label = JALALI_CHART_MONTH_LABELS[jm - 1] ?? JALALI_CHART_MONTH_LABELS[0];
    const row = chartRows.find((r) => r.month === label);
    const lastYear = typeof row?.lastYear === 'number' && Number.isFinite(row.lastYear) ? row.lastYear : 0;
    if (lastYear <= 0) {
      return { targetM3: null as number | null, monthLabel: label };
    }
    return { targetM3: Math.round(lastYear * 0.8), monthLabel: label };
  }, [chartRows]);

  return (
    <div className="fixed inset-0 bg-slate-50 z-[80] overflow-y-auto animate-in slide-in-from-left duration-500">
      <header className="p-6 flex items-center gap-4 bg-white border-b border-slate-100 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-[7px] active:scale-90 transition-all text-slate-500">
          <ChevronRight size={20} />
        </button>
        <h2 className="text-lg font-black">نقشه راه هدف ماه</h2>
      </header>

      <div className="p-6 space-y-8 pb-12">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[7px] p-8 text-white shadow-xl relative overflow-hidden">
          <Target size={120} className="absolute -left-10 -bottom-10 opacity-10 rotate-12" />
          <div className="relative z-10 space-y-4">
            {chartLoading && chartRows.length === 0 ? (
              <div className="flex items-center gap-3 py-2" role="status">
                <Loader2 className="h-8 w-8 shrink-0 animate-spin text-white/90" aria-hidden />
                <span className="text-sm font-bold text-white/90">در حال محاسبهٔ هدف…</span>
              </div>
            ) : chartError && chartRows.length === 0 ? (
              <p className="text-sm font-bold opacity-90">{chartError}</p>
            ) : targetM3 != null ? (
              <h3 className="text-xl font-black">
                هدف ماه {monthLabel}: زیر {toPersianDigits(targetM3)} متر مکعب
              </h3>
            ) : (
              <h3 className="text-xl font-black">
                هدف ماه {monthLabel}: دادهٔ مصرف پارسال برای این ماه در دسترس نیست
              </h3>
            )}
            <p className="text-sm opacity-80 leading-relaxed font-bold">
              {targetM3 != null
                ? 'بر اساس مصرف پارسال همین ماه از نمودار، هدف با ۲۰٪ صرفه‌جویی پیشنهاد شده است. برای رسیدن به این هدف، انجام این ۳ مرحله توصیه می‌شود:'
                : 'پس از ثبت دادهٔ کافی در سامانه، هدف عددی اینجا نمایش داده می‌شود. انجام این ۳ مرحله همچنان توصیه می‌شود:'}
            </p>
          </div>
        </div>

        {roadError ? (
          <p className="rounded-[7px] border border-amber-100 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-800">
            {roadError}
          </p>
        ) : null}

        <div className="space-y-4">
          {roadLoading && roadItems.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-12 bg-white rounded-[7px] border border-slate-100">
              <Loader2 className="h-7 w-7 animate-spin text-orange-500" aria-hidden />
              <span className="text-sm font-bold text-slate-800">در حال دریافت توصیه‌ها…</span>
            </div>
          ) : roadItems.length === 0 && !roadLoading ? (
            <p className="rounded-[7px] border border-slate-200 bg-white px-4 py-6 text-center text-sm font-bold text-slate-800">
              توصیه‌ای برای نمایش نیست.
            </p>
          ) : (
            roadItems.map((item, idx) => (
              <div
                key={`${idx}-${item.id}`}
                className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-black leading-relaxed text-slate-800 whitespace-pre-line">
                  {toPersianDigits(String(idx + 1))}. {item.text}
                </p>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onBack}
          className="w-full bg-slate-900 text-white py-5 rounded-[7px] font-black text-sm shadow-xl active:scale-95 transition-all"
        >
          متوجه شدم، شروع می‌کنم
        </button>
      </div>
    </div>
  );
};

export default TargetAdvice;
