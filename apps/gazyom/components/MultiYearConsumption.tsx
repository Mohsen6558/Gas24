import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarRange, TrendingDown, TrendingUp, Table2 } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import { JALALI_CHART_MONTH_LABELS, type ConsumptionYear } from '../services/wsOptimizeApi';
import { getCurrentJalaliMonth1To12, getCurrentJalaliYearMonthKey } from '../services/jalaliMonth';

// Series colors by recency (this year, last year, two and three years back); validated as a
// categorical set on white (dataviz validator: CVD and normal-vision separation pass; the last two
// are under 3:1 contrast, so the legend and the table view carry identity too).
const YEAR_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

const fa = (n: number) => toPersianDigits(Math.round(n).toLocaleString('en-US'));
const pct = (now: number, before: number) => Math.round(((now - before) / before) * 100);

function Change({ value, suffix }: { value: number; suffix: string }) {
  if (value === 0) return <span className="text-slate-500">بدون تغییر {suffix}</span>;
  const down = value < 0;
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 ${down ? 'text-green-600' : 'text-red-600'}`}>
      <Icon size={13} className="shrink-0" />
      {toPersianDigits(Math.abs(value))}٪ {down ? 'کمتر' : 'بیشتر'} {suffix}
    </span>
  );
}

/** Monthly use of the last (up to) four Jalali years, yearly totals and this year's best and worst month. */
const MultiYearConsumption: React.FC<{ years: ConsumptionYear[] }> = ({ years }) => {
  const [showTable, setShowTable] = useState(false);

  const view = useMemo(() => {
    const thisYear = parseInt(getCurrentJalaliYearMonthKey().split('-')[0], 10);
    const thisMonth = getCurrentJalaliMonth1To12();
    // months still ahead in the current year are not data, nor are the zeros after its last bill
    const shown = years
      .map((y) => {
        const months = y.months.map((v, i) => (y.year === thisYear && i + 1 > thisMonth ? null : v));
        if (y.year === thisYear) {
          for (let i = months.length - 1; i >= 0 && (months[i] == null || months[i] === 0); i--) months[i] = null;
        }
        return { year: y.year, months };
      })
      .filter((y) => y.months.some((v) => v != null && v > 0))
      .slice(-4);
    if (shown.length === 0) return null;

    const newestFirst = [...shown].reverse();
    const colorOf = new Map(newestFirst.map((y, i) => [y.year, YEAR_COLORS[i]]));
    const rows = JALALI_CHART_MONTH_LABELS.map((label, i) => {
      const row: Record<string, string | number | null> = { month: label };
      shown.forEach((y) => (row[String(y.year)] = y.months[i]));
      return row;
    });

    const totals = newestFirst.map((y, i) => {
      const known = y.months.filter((v): v is number => v != null);
      const prev = newestFirst[i + 1];
      const full = known.length === 12 && prev && prev.months.every((v) => v != null);
      const prevTotal = prev ? prev.months.reduce((s: number, v) => s + (v ?? 0), 0) : 0;
      const total = known.reduce((s, v) => s + v, 0);
      return { year: y.year, total, change: full && prevTotal > 0 ? pct(total, prevTotal) : null };
    });

    // this year against the same months last year: only finished months that already have a bill
    const cur = shown.find((y) => y.year === thisYear);
    const prev = shown.find((y) => y.year === thisYear - 1);
    let compare: null | {
      upTo: string;
      cur: number;
      prev: number;
      best?: { month: string; change: number };
      worst?: { month: string; change: number };
    } = null;
    if (cur && prev) {
      const months = [];
      for (let m = 0; m < thisMonth - 1; m++) {
        const c = cur.months[m];
        const p = prev.months[m];
        if (c != null && c > 0 && p != null) months.push({ m, c, p });
      }
      if (months.length > 0) {
        const changes = months.filter((x) => x.p > 0).map((x) => ({ month: JALALI_CHART_MONTH_LABELS[x.m], change: pct(x.c, x.p) }));
        const best = changes.length ? changes.reduce((b, x) => (x.change < b.change ? x : b)) : undefined;
        const worst = changes.length ? changes.reduce((w, x) => (x.change > w.change ? x : w)) : undefined;
        compare = {
          upTo: JALALI_CHART_MONTH_LABELS[months[months.length - 1].m],
          cur: months.reduce((s, x) => s + x.c, 0),
          prev: months.reduce((s, x) => s + x.p, 0),
          best: best && best.change < 0 ? best : undefined,
          worst: worst && worst.change > 0 ? worst : undefined,
        };
      }
    }
    return { shown, newestFirst, colorOf, rows, totals, compare, thisYear };
  }, [years]);

  if (!view) return null;
  const { newestFirst, colorOf, rows, totals, compare, thisYear } = view;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><CalendarRange size={20} /></div>
        <div>
          <h3 className="text-lg font-black text-slate-800">مصرف سال‌های اخیر</h3>
          <p className="text-[10px] font-bold text-slate-400">مصرف ماهانه به متر مکعب</p>
        </div>
      </div>

      {compare && (
        <div className="rounded-2xl bg-slate-50 p-4 space-y-2 text-xs font-bold text-slate-600 leading-relaxed">
          <p>
            امسال از فروردین تا {compare.upTo}: <span className="font-black text-slate-800">{fa(compare.cur)} متر مکعب</span> ·{' '}
            {compare.prev > 0 ? <Change value={pct(compare.cur, compare.prev)} suffix="از همین بازه‌ی پارسال" /> : null}
          </p>
          {compare.best && (
            <p>
              بهترین ماه امسال: <span className="font-black text-slate-800">{compare.best.month}</span> ·{' '}
              <Change value={compare.best.change} suffix="از پارسال" />
            </p>
          )}
          {compare.worst ? (
            <p>
              بیشترین افزایش: <span className="font-black text-slate-800">{compare.worst.month}</span> ·{' '}
              <Change value={compare.worst.change} suffix="از پارسال" />
            </p>
          ) : (
            <p className="text-green-600">امسال در هیچ ماهی بیشتر از پارسال مصرف نکرده‌اید.</p>
          )}
        </div>
      )}

      <div className="h-64 md:h-72 w-full min-w-0" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              reversed
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
              tickFormatter={(v: string) => v.slice(0, 3)}
            />
            <YAxis
              orientation="right"
              width={40}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v) => toPersianDigits(v)}
            />
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: 12, fontSize: 12, fontWeight: 700 }}
              labelFormatter={(label) => `ماه: ${label}`}
              formatter={(value: number | string, name: string) => [`${fa(Number(value))} متر مکعب`, `سال ${toPersianDigits(name)}`]}
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ direction: 'rtl', fontSize: 11, fontWeight: 700, color: '#334155' }}
              formatter={(value: string) => <span style={{ color: '#334155' }}>{toPersianDigits(value)}</span>}
            />
            {newestFirst
              .slice()
              .reverse()
              .map((y) => (
                <Line
                  key={y.year}
                  type="monotone"
                  dataKey={String(y.year)}
                  name={String(y.year)}
                  stroke={colorOf.get(y.year)}
                  strokeWidth={y.year === thisYear ? 3 : 2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {totals.map((t) => (
          <div key={t.year} className="rounded-2xl border border-slate-100 p-3 space-y-1">
            <p className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
              <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: colorOf.get(t.year) }} />
              {toPersianDigits(t.year)}
              {t.year === thisYear ? ' (تا امروز)' : ''}
            </p>
            <p className="text-base font-black text-slate-800">
              {fa(t.total)} <span className="text-[10px] font-bold text-slate-400">متر مکعب</span>
            </p>
            {t.change != null && (
              <p className="text-[10px] font-bold">
                <Change value={t.change} suffix="از سال قبل" />
              </p>
            )}
          </div>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="flex items-center gap-2 text-[11px] font-black text-blue-600"
          aria-expanded={showTable}
        >
          <Table2 size={14} />
          {showTable ? 'بستن جدول' : 'نمایش جدول ماه‌به‌ماه'}
        </button>
        {showTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[11px] font-bold text-slate-600">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-right py-2 pl-2">ماه</th>
                  {newestFirst.map((y) => (
                    <th key={y.year} className="text-left py-2 px-2">{toPersianDigits(y.year)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={String(r.month)} className="border-t border-slate-50">
                    <td className="text-right py-1.5 pl-2">{r.month}</td>
                    {newestFirst.map((y) => {
                      const v = r[String(y.year)];
                      return (
                        <td key={y.year} className="text-left py-1.5 px-2 tabular-nums">
                          {v == null ? '—' : fa(Number(v))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiYearConsumption;
