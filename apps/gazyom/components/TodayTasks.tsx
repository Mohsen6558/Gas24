import React, { useEffect, useState } from 'react';
import { Camera, Disc, ListChecks, CheckCircle2, Flame } from 'lucide-react';
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

  const tile = (key: string, icon: React.ReactNode, title: string, done: boolean, status: string, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={done && key !== 'missions'}
      className={`rounded-xl border px-2 py-2.5 flex flex-col items-center gap-1 text-center transition-all ${
        done ? 'bg-green-50/60 border-green-100' : 'bg-white border-slate-100 hover:border-orange-200 active:scale-95'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-orange-50 text-orange-500'}`}>
        {done ? <CheckCircle2 size={16} /> : icon}
      </div>
      <p className="text-[11px] font-black text-slate-800 leading-tight">{title}</p>
      <p className={`text-[9px] font-bold leading-tight ${done ? 'text-green-600' : 'text-orange-500'}`}>{status}</p>
    </button>
  );

  return (
    <div className="bg-white rounded-2xl p-3.5 md:p-4 shadow-sm border border-slate-100 space-y-2.5">
      <div className="flex items-center gap-2">
        <h3 className="font-black text-sm text-slate-800 flex-1">کارهای امروز</h3>
        {streak > 0 && (
          <span className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 rounded-full text-[10px] font-black">
            <Flame size={11} className="shrink-0" />
            {toPersianDigits(streak)} روز پشت سر هم
          </span>
        )}
        {activity && (
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-[10px] font-black">
            {toPersianDigits(doneCount)} از {toPersianDigits(3)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tile(
          'karkard',
          <Camera size={16} />,
          'ثبت کنتور',
          Boolean(activity?.karkardToday),
          activity?.karkardToday ? 'ثبت شد' : `+${toPersianDigits(KARKARD_REWARD)} گازیوم`,
          onKarkard
        )}
        {tile('wheel', <Disc size={16} />, 'گردونه شانس', Boolean(activity?.wheelToday), activity?.wheelToday ? 'چرخاندید' : 'بچرخانید', onWheel)}
        {tile(
          'missions',
          <ListChecks size={16} />,
          'ماموریت‌ها',
          missionsComplete,
          missionsComplete
            ? 'انجام شد'
            : missionsTotal > 0
              ? `${toPersianDigits(missionsDone)} از ${toPersianDigits(missionsTotal)}`
              : 'مشاهده',
          onMissions
        )}
      </div>
    </div>
  );
};

export default TodayTasks;
