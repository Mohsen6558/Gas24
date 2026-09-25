
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toPersianDigits } from '../services/geminiService';
import { fetchConsumptionChart, fetchHints, type HintRow } from '../services/wsOptimizeApi';
import { aggregateConsumptionBySeason, orderChartRowsByJalali } from '../services/chartConsumptionSeasons';
import {
  analysisHintsType3DayRead,
  analysisHintsType3DayWrite,
  chartConsumptionDayRead,
  chartConsumptionDayWrite,
} from '../services/dataRefreshCache';
import { getCurrentJalaliMonth1To12 } from '../services/jalaliMonth';
import type { ConsumptionData } from '../types';
import { TrendingDown, TrendingUp, ChevronLeft, Sparkles, BrainCircuit, Target, Camera, Trophy } from 'lucide-react';
import { SectionLoader } from '../components/SectionLoader';


const HINT_SLOT_COUNT = 5;

const GENERIC_FILLER_HINTS: readonly string[] = [
  'دمای ترموستات یا شیر فشار را در محدودهٔ پیشنهادی نصاب نگه دارید.',
  'بازدید دوره‌ای دودکش و مسیر خروج گاز را جدی بگیرید.',
  'با عایق‌بندی درز پنجره و درب، اتلاف گرمای داخل را کم کنید.',
  'زمان پیشگرم بودن فضا را کوتاه کنید؛ در نبود ساکن دمای رفاه را پایین بیاورید.',
  'مصرف ماهانه را با نمودار همین صفحه با سال قبل مقایسه کنید و روند را کنترل کنید.',
];

interface AnalysisProps {
  wsBaseUrl: string;
  keyNo: string | number;
  onTargetClick: () => void;
  onRankClick: () => void;
  onSelfDeclareClick: () => void;
}

const Analysis: React.FC<AnalysisProps> = ({
  wsBaseUrl,
  keyNo,
  onTargetClick,
  onRankClick,
  onSelfDeclareClick,
}) => {
  const [chartRows, setChartRows] = useState<ConsumptionData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');

  const [hintRows, setHintRows] = useState<HintRow[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [hintsError, setHintsError] = useState('');

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
    const cached = analysisHintsType3DayRead<HintRow[]>(wsBaseUrl, keyNoStr);
    if (cached !== null && Array.isArray(cached)) {
      setHintsError('');
      setHintRows(cached);
      setHintsLoading(false);
      return;
    }

    const ac = new AbortController();
    setHintsLoading(true);
    setHintsError('');
    fetchHints(wsBaseUrl, { keyNo, type: 3 }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setHintsError(res.message);
          setHintRows([]);
          return;
        }
        analysisHintsType3DayWrite(wsBaseUrl, keyNoStr, res.rows);
        setHintRows(res.rows);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setHintsError('خطا در دریافت راهنماها');
        setHintRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setHintsLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl, keyNo]);

  
  const chartOrdered = useMemo(() => orderChartRowsByJalali(chartRows), [chartRows]);

  
  const chartDisplayData = useMemo(
    () =>
      aggregateConsumptionBySeason(chartOrdered).map((r) => ({
        ...r,
        پارسال: r.lastYear,
        امسال: r.currentYear,
      })),
    [chartOrdered]
  );

  
  const { diff, percent } = useMemo(() => {
    const jm = getCurrentJalaliMonth1To12();
    const slice = chartOrdered.slice(0, jm);
    if (slice.length === 0) {
      return { diff: 0, percent: 0 };
    }
    const sumCur = slice.reduce((a, r) => a + r.currentYear, 0);
    const sumLast = slice.reduce((a, r) => a + r.lastYear, 0);
    const rawDiff = sumLast - sumCur;
    const diffRounded = Math.round(rawDiff);

    let percentVal = 0;
    if (rawDiff > 0) {
      percentVal = sumLast > 0 ? Math.round((rawDiff / sumLast) * 100) : 0;
    } else if (rawDiff < 0) {
      const worse = -rawDiff;
      percentVal =
        sumLast > 0
          ? Math.round((worse / sumLast) * 100)
          : sumCur > 0
            ? Math.round((worse / sumCur) * 100)
            : 0;
    }

    return { diff: diffRounded, percent: percentVal };
  }, [chartOrdered]);

  
  const displayHintRows = useMemo((): HintRow[] => {
    if (hintsError) return [];
    const fromApi = hintRows.slice(0, HINT_SLOT_COUNT);
    if (fromApi.length >= HINT_SLOT_COUNT) return fromApi;
    const out: HintRow[] = [...fromApi];
    let g = 0;
    while (out.length < HINT_SLOT_COUNT) {
      out.push({
        id: -4000 - out.length,
        message:
          GENERIC_FILLER_HINTS[g % GENERIC_FILLER_HINTS.length] ??
          'مصرف بهینه را در نمودار همین صفحه دنبال کنید.',
        token: 0,
        is_done: false,
      });
      g += 1;
    }
    return out;
  }, [hintRows, hintsError]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100">
          <BrainCircuit size={28} />
        </div>
        <h2 className="text-3xl font-black text-slate-800">تحلیل عمیق مصرف</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch gap-8">
        
        <div className="flex flex-col gap-6 min-h-0 lg:min-h-[min(78vh,42rem)]">
          <div className="flex min-h-[22rem] flex-col flex-1 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:min-h-[26rem]">
            <div className="flex justify-between items-end gap-3 shrink-0 mb-6">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black text-slate-500">مجموع صرفه‌جویی فصل</span>
                <p className="text-[9px] font-bold text-slate-400 leading-snug">
                   از فروردین تا ماه جاری
                </p>
                <div
                  className={`text-4xl font-black flex items-center gap-2 ${
                    diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-700'
                  }`}
                >
                  {toPersianDigits(diff)}{' '}
                  <span className="text-xs font-bold text-slate-400">متر مکعب</span>
                </div>
              </div>
              <div
                className={`flex max-w-[11rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-[11px] font-black leading-tight sm:max-w-none sm:flex-row sm:gap-2 sm:px-4 sm:text-xs ${
                  diff > 0
                    ? 'bg-green-50 text-green-600'
                    : diff < 0
                      ? 'bg-red-50 text-red-600'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {diff > 0 ? (
                  <TrendingDown size={16} className="shrink-0" />
                ) : diff < 0 ? (
                  <TrendingUp size={16} className="shrink-0" />
                ) : null}
                <span>
                  {diff === 0
                    ? '۰٪ تغییر نسبت به پارسال'
                    : diff > 0
                      ? `${toPersianDigits(percent)}٪ بهبود  `
                      : `${toPersianDigits(percent)}٪ افزایش `}
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0 min-w-0 w-full flex flex-col">
              {chartLoading && chartRows.length === 0 ? (
                <SectionLoader className="flex-1" minClassName="min-h-[12rem]" label="در حال بارگذاری نمودار…" />
              ) : chartRows.length === 0 ? (
                <div className="flex min-h-[12rem] flex-1 items-center justify-center px-4 text-center text-xs font-bold text-slate-400">
                  {chartError || 'داده‌ای برای نمودار ثبت نشده است.'}
                </div>
              ) : (
                <div className="flex min-h-[14rem] w-full min-w-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%" className="!max-w-none">
                    <BarChart
                      data={chartDisplayData}
                      margin={{ top: 8, right: 4, bottom: 4, left: 0 }}
                      barCategoryGap="3%"
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 'bold' }}
                        tickFormatter={(v) => toPersianDigits(String(v))}
                      />
                      <YAxis width={40} axisLine={false} tickLine={false} tickFormatter={(v) => toPersianDigits(v)} />
                      <Tooltip
                        wrapperStyle={{ outline: 'none' }}
                        contentStyle={{
                          direction: 'rtl',
                          textAlign: 'right',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        formatter={(value: number | string, name: string) => [
                          `${toPersianDigits(Math.round(Number(value)))} متر مکعب`,
                          name === 'امسال' || name === 'currentYear' ? 'امسال' : 'پارسال',
                        ]}
                        labelFormatter={(label) => `فصل: ${toPersianDigits(String(label))}`}
                      />
                      <Bar dataKey="پارسال" name="پارسال" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="امسال" name="امسال" radius={[4, 4, 0, 0]}>
                        {chartDisplayData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.currentYear < entry.lastYear ? '#22c55e' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onSelfDeclareClick}
            className="w-full bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 flex items-center justify-between group relative overflow-hidden active:scale-[0.98] transition-all"
          >
            <div className="absolute -left-4 -bottom-4 opacity-10 scale-150"><Camera size={100} /></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                <Camera size={32} />
              </div>
              <div className="text-right">
                <h3 className="text-xl font-black">خوداظهاری و ثبت کنتور</h3>
                <p className="text-xs font-bold text-blue-100 opacity-80 mt-1">تایید فوری و دریافت ۵۰ امتیاز پاداش</p>
              </div>
            </div>
            <ChevronLeft size={24} className="relative z-10 opacity-60" />
          </button>
        </div>

        
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 bg-orange-100 rounded-xl"><Sparkles size={20} className="text-orange-600" /></div>
            <h3 className="text-lg font-black text-slate-800">توصیه‌های شخصی‌سازی شده</h3>
          </div>

          {hintsError ? (
            <p className="text-sm font-bold text-red-500 text-center bg-white rounded-2xl border border-red-100 py-6 px-4">{hintsError}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-4">
            {hintsLoading && hintRows.length === 0 && !hintsError ? (
              <SectionLoader
                className="rounded-2xl border border-slate-100 bg-white"
                minClassName="min-h-[10rem]"
                label="در حال بارگذاری توصیه‌ها…"
              />
            ) : (
              displayHintRows.map((row, idx) => (
                <div
                  key={row.id}
                  className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-6 group transition-all ${
                    row.is_done ? 'border-indigo-100 opacity-80' : 'border-slate-100 hover:border-orange-200'
                  } ${row.id < 0 ? 'bg-slate-50/60' : ''}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-lg ${
                      idx % 3 === 0 ? 'bg-orange-500' : idx % 3 === 1 ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`}
                  >
                    {toPersianDigits(idx + 1)}
                  </div>
                  <div className="min-w-0 flex-1 text-right space-y-1">
                    <p className={`text-sm font-bold text-slate-700 leading-relaxed ${row.is_done ? 'line-through opacity-60' : ''}`}>
                      {row.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={onTargetClick} className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-center hover:bg-slate-50 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Target size={24} /></div>
              <div className="text-right"><h4 className="text-sm font-black text-slate-800">هدف‌گذاری ماه</h4><p className="text-[10px] text-slate-400 font-bold">نقشه راه صرفه‌جویی</p></div>
            </button>
            <button onClick={onRankClick} className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-center hover:bg-slate-50 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0"><Trophy size={24} /></div>
              <div className="text-right"><h4 className="text-sm font-black text-slate-800">رتبه در شهر</h4><p className="text-[10px] text-slate-400 font-bold">قهرمانان مصرف بهینه</p></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
