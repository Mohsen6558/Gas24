import React, { useEffect, useMemo, useState } from 'react';
import { Check, Flame } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import { currentJalaliMonth, loadActivity, subscribeActivity, type Activity } from '../services/activity';

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/** This month's meter readings as a calendar, with the streak; hidden while the history is unknown. */
const KarkardCalendar: React.FC<{ wsBaseUrl: string; keyNo: string }> = ({ wsBaseUrl, keyNo }) => {
  const [activity, setActivity] = useState<Activity | null>(null);
  const month = useMemo(() => currentJalaliMonth(), []);

  useEffect(() => {
    let alive = true;
    const load = () => loadActivity(wsBaseUrl, keyNo).then((a) => alive && setActivity(a));
    load();
    const off = subscribeActivity(load);
    return () => {
      alive = false;
      off();
    };
  }, [wsBaseUrl, keyNo]);

  if (!activity || month.days.length === 0) return null;
  const doneThisMonth = month.days.filter((d) => activity.karkardDays.has(d.key)).length;
  const blanks = month.days[0].weekday;

  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-slate-800">ثبت‌های {toPersianDigits(month.title)}</h3>
          <p className="text-[10px] font-bold text-slate-400">{toPersianDigits(doneThisMonth)} روز ثبت شده</p>
        </div>
        {activity.streak > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black text-orange-600">
            <Flame size={13} />
            {toPersianDigits(activity.streak)} روز پشت سر هم
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`تقویم ثبت کنتور ${month.title}`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] font-black text-slate-400 pb-1">{w}</div>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {month.days.map((d) => {
          const done = activity.karkardDays.has(d.key);
          return (
            <div
              key={d.key}
              title={done ? 'ثبت شده' : undefined}
              className={`aspect-square rounded-xl flex items-center justify-center text-[11px] font-black ${
                done
                  ? 'bg-orange-500 text-white'
                  : d.isToday
                    ? 'border-2 border-orange-300 text-slate-700'
                    : d.isFuture
                      ? 'text-slate-300'
                      : 'bg-slate-50 text-slate-500'
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} aria-label={`${d.day} ثبت شده`} /> : toPersianDigits(d.day)}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
        {activity.karkardToday
          ? 'امروز ثبت کرده‌اید؛ فردا دوباره عدد کنتور را ثبت کنید تا رشته‌ی روزهایتان ادامه پیدا کند.'
          : 'امروز هنوز ثبت نکرده‌اید؛ با ثبت روزانه امتیاز بگیرید و رشته‌ی روزهایتان را ادامه دهید.'}
      </p>
    </div>
  );
};

export default KarkardCalendar;
