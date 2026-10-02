import React, { useEffect, useState } from 'react';
import { Camera, Disc, ListChecks, CheckCircle2, Flame, ChevronLeft } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import { loadActivity, subscribeActivity, type Activity } from '../services/activity';

// Daftar's reward for a meter reading (submit-karkard, once a day).
const KARKARD_REWARD = 50;

type Props = {
  wsBaseUrl: string;
  keyNo: string;
  missionsDone: number;
  missionsTotal: number;
  onKarkard: () => void;
  onWheel: () => void;
  onMissions: () => void;
};

/** «کارهای امروز» on the home screen: today's meter reading, wheel spin and missions at a glance. */
const TodayTasks: React.FC<Props> = ({ wsBaseUrl, keyNo, missionsDone, missionsTotal, onKarkard, onWheel, onMissions }) => {
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => loadActivity(wsBaseUrl, keyNo).then((a) => alive && setActivity(a));
    setActivity(null);
    load();
    const off = subscribeActivity(load);
    return () => {
      alive = false;
      off();
    };
  }, [wsBaseUrl, keyNo]);

  const missionsComplete = missionsTotal > 0 && missionsDone >= missionsTotal;
  const doneCount = (activity?.karkardToday ? 1 : 0) + (activity?.wheelToday ? 1 : 0) + (missionsComplete ? 1 : 0);
  const streak = activity?.streak ?? 0;

  const row = (
    key: string,
    icon: React.ReactNode,
    title: string,
    done: boolean,
    status: string,
    action: string,
    onClick: () => void,
    extra?: React.ReactNode
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={done && key !== 'missions'}
      className={`w-full text-right rounded-2xl border p-4 flex items-center gap-3 transition-all ${
        done ? 'bg-green-50/60 border-green-100' : 'bg-white border-slate-100 hover:border-orange-200 active:scale-[0.99]'
      }`}
    >
      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-orange-50 text-orange-500'}`}>
        {done ? <CheckCircle2 size={20} /> : icon}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs md:text-sm font-black text-slate-800">{title}</p>
        <p className={`text-[10px] md:text-[11px] font-bold ${done ? 'text-green-600' : 'text-slate-400'}`}>{done ? status : action}</p>
        {extra}
      </div>
      {!done && <ChevronLeft size={16} className="shrink-0 text-slate-300" />}
    </button>
  );

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-base md:text-lg text-slate-800">کارهای امروز</h3>
        {activity && (
          <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-black">
            {toPersianDigits(doneCount)} از {toPersianDigits(3)} انجام شد
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {row(
          'karkard',
          <Camera size={20} />,
          'ثبت عدد کنتور',
          Boolean(activity?.karkardToday),
          'امروز ثبت شد',
          `ثبت کنید و ${toPersianDigits(KARKARD_REWARD)} گازیوم بگیرید`,
          onKarkard,
          streak > 0 ? (
            <p className="flex items-center gap-1 text-[10px] font-black text-orange-600">
              <Flame size={12} className="shrink-0" />
              {toPersianDigits(streak)} روز پشت سر هم
            </p>
          ) : null
        )}
        {row('wheel', <Disc size={20} />, 'گردونه شانس', Boolean(activity?.wheelToday), 'امروز چرخاندید', 'نوبت امروز را بچرخانید', onWheel)}
        {row(
          'missions',
          <ListChecks size={20} />,
          'ماموریت‌های روزانه',
          missionsComplete,
          'همه انجام شد',
          missionsTotal > 0 ? `${toPersianDigits(missionsDone)} از ${toPersianDigits(missionsTotal)} انجام شده` : 'ماموریت‌های امروز را ببینید',
          onMissions
        )}
      </div>
    </div>
  );
};

export default TodayTasks;
