
import React, { useState, useEffect, useMemo } from 'react';
import { UserLevel, Subscription, type ConsumptionData, type Reward } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, ChevronLeft, Zap, CloudSun, Trophy, ChevronDown, Check, Plus, Circle, CheckCircle2, Loader2 } from 'lucide-react';
import { SectionLoader } from '../components/SectionLoader';
import { getWeatherAdvice, toPersianDigits } from '../services/geminiService';
import {
  fetchConsumptionChart,
  fetchGetProfile,
  fetchHints,
  fetchRewardList,
  submitMissionHint,
} from '../services/wsOptimizeApi';
import {
  appendDoneHintId,
  buildMissionsFromHintRows,
  mergeMissionsWithDoneLocal,
  readMissionsCache,
  readSmartHintType2Cache,
  writeMissionsCache,
  writeSmartHintType2Cache,
} from '../services/dailyHintsCache';
import {
  chartConsumptionDayRead,
  chartConsumptionDayWrite,
  rewardsListHourRead,
  rewardsListHourWrite,
} from '../services/dataRefreshCache';
import { orderChartRowsByJalali } from '../services/chartConsumptionSeasons';

interface Mission {
  id: number;
  title: string;
  points: number;
  completed: boolean;
}

interface DashboardProps {
  activeSub: Subscription;
  subscriptions: Subscription[];
  wsBaseUrl: string;
  onSwitchSub: (index: number) => void;
  onRewardClick: (r: any) => void;
  onLeaderboardClick: () => void;
  onAddSub: () => void;
  onSeeAllRewards?: () => void;
  
  onTotalTokenFromProfile?: (total: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  activeSub, 
  subscriptions, 
  wsBaseUrl,
  onSwitchSub, 
  onRewardClick, 
  onLeaderboardClick,
  onAddSub,
  onSeeAllRewards,
  onTotalTokenFromProfile,
}) => {
  
  const [serverGazyom, setServerGazyom] = useState<number | null>(null);
  const [missionGazyomExtra, setMissionGazyomExtra] = useState(0);
  const [level] = useState(UserLevel.Gold);
  const [aiTip, setAiTip] = useState('در حال دریافت پیشنهاد…');
  const [weatherData, setWeatherData] = useState<{ temp: string, status: string, advice: string } | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [hintsError, setHintsError] = useState('');
  const [submittingHintId, setSubmittingHintId] = useState<number | null>(null);

  const [chartRows, setChartRows] = useState<ConsumptionData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');

  const chartOrderedRows = useMemo(() => orderChartRowsByJalali(chartRows), [chartRows]);

  const [rewardPreview, setRewardPreview] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    getWeatherAdvice().then(setWeatherData);
  }, []);

  
  useEffect(() => {
    if (!wsBaseUrl || !activeSub?.number) return;
    const keyNoStr = String(activeSub.number);
    const cached = readSmartHintType2Cache(keyNoStr);
    if (cached) {
      setAiTip(cached);
      return;
    }
    const ac = new AbortController();
    fetchHints(wsBaseUrl, { keyNo: activeSub.number, type: 2 }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setAiTip(res.message || 'فعلاً پیشنهادی برای نمایش ثبت نشده است.');
          return;
        }
        const msg = res.rows[0]?.message?.trim();
        if (!msg) {
          setAiTip('پیشنهادی برای امروز ثبت نشده است.');
          return;
        }
        writeSmartHintType2Cache(keyNoStr, msg);
        setAiTip(msg);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setAiTip('خطا در دریافت پیشنهاد. بعداً دوباره تلاش کنید.');
      });
    return () => ac.abort();
  }, [wsBaseUrl, activeSub.number]);

  useEffect(() => {
    if (!wsBaseUrl || !activeSub?.number) return;
    const ac = new AbortController();
    setProfileLoading(true);
    fetchGetProfile(wsBaseUrl, { keyNo: activeSub.number }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) return;
        const row =
          res.rows.find((r) => String(r.key_no) === String(activeSub.number)) ?? res.rows[0];
        if (row != null) {
          const token = typeof row.total_token === 'number' ? row.total_token : 0;
          onTotalTokenFromProfile?.(token);
          if (typeof row.total_token === 'number') {
            setServerGazyom(row.total_token);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setProfileLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl, activeSub.number]);

  useEffect(() => {
    if (!wsBaseUrl || !activeSub?.number) return;
    const keyNoStr = String(activeSub.number);
    const cached = readMissionsCache(keyNoStr);
    if (cached !== null) {
      setHintsError('');
      setMissions(mergeMissionsWithDoneLocal(keyNoStr, cached));
      setHintsLoading(false);
      return;
    }

    const ac = new AbortController();
    setHintsLoading(true);
    setHintsError('');
    fetchHints(wsBaseUrl, { keyNo: activeSub.number, type: 1 }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setHintsError(res.message);
          setMissions([]);
          return;
        }
        const next = buildMissionsFromHintRows(res.rows, keyNoStr);
        setMissions(next);
        writeMissionsCache(keyNoStr, next);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setHintsError('خطا در دریافت ماموریت‌ها');
        setMissions([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setHintsLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl, activeSub.number]);

  useEffect(() => {
    if (!wsBaseUrl || !activeSub?.number) return;
    const keyNoStr = String(activeSub.number);
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
    fetchConsumptionChart(wsBaseUrl, { keyNo: activeSub.number }, { signal: ac.signal })
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
        setChartError('خطا در دریافت نمودار مصرف');
        setChartRows([]);
      })
      .finally(() => setChartLoading(false));
    return () => ac.abort();
  }, [wsBaseUrl, activeSub.number]);

  useEffect(() => {
    if (!wsBaseUrl || !activeSub?.number) return;
    const keyNoStr = String(activeSub.number);
    const cached = rewardsListHourRead<Reward[]>(wsBaseUrl, keyNoStr);
    if (cached) {
      setRewardPreview(cached.slice(0, 3));
      setRewardsError('');
      setRewardsLoading(false);
      return;
    }
    const ac = new AbortController();
    setRewardsLoading(true);
    setRewardsError('');
    fetchRewardList(wsBaseUrl, { keyNo: activeSub.number }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setRewardsError(res.message);
          setRewardPreview([]);
          return;
        }
        rewardsListHourWrite(wsBaseUrl, keyNoStr, res.items);
        setRewardPreview(res.items.slice(0, 3));
      })
      .catch(() => {
        setRewardsError('خطا در دریافت جوایز');
        setRewardPreview([]);
      })
      .finally(() => setRewardsLoading(false));
    return () => ac.abort();
  }, [wsBaseUrl, activeSub.number]);

  const displayGazyom = (serverGazyom ?? 0) + missionGazyomExtra;

  useEffect(() => {
    setMissionGazyomExtra(0);
  }, [activeSub.number]);

  const handleCompleteMission = async (missionId: number) => {
    if (!wsBaseUrl || !activeSub?.number) return;
    const m = missions.find((x) => x.id === missionId);
    if (!m || m.completed) return;
    setHintsError('');
    setSubmittingHintId(missionId);
    try {
      const res = await submitMissionHint(wsBaseUrl, {
        keyNo: activeSub.number,
        hintId: missionId,
      });
      const keyNoStr = String(activeSub.number);
      if (res.ok === false) {
        if (res.type === 'duplicate') {
          appendDoneHintId(keyNoStr, missionId);
          setMissions((prev) => {
            const next = prev.map((row) => (row.id === missionId ? { ...row, completed: true } : row));
            writeMissionsCache(keyNoStr, next);
            return next;
          });
          return;
        }
        setHintsError(res.message);
        return;
      }
      appendDoneHintId(keyNoStr, missionId);
      setMissions((prev) => {
        const next = prev.map((row) => (row.id === missionId ? { ...row, completed: true } : row));
        writeMissionsCache(keyNoStr, next);
        return next;
      });
      if (res.ok === true && typeof res.earned_token === 'number' && res.earned_token > 0) {
        setMissionGazyomExtra((x) => x + res.earned_token!);
      }
    } finally {
      setSubmittingHintId(null);
    }
  };

  const completedCount = missions.filter((m) => m.completed).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-3xl font-black text-slate-800">گرمای پایدار</h1>
          <div className="relative inline-block">
            <button 
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all"
            >
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] md:text-xs font-black text-slate-600">{activeSub.name}</span>
              <ChevronDown size={10} className={`text-slate-400 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {showSwitcher && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-100 animate-in zoom-in duration-200">
                <div className="p-2 space-y-1">
                  {subscriptions.map((sub, idx) => (
                    <button
                      key={sub.number}
                      onClick={() => { onSwitchSub(idx); setShowSwitcher(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-right transition-colors ${
                        sub.number === activeSub.number ? 'bg-orange-50 text-orange-600' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black">{sub.name}</span>
                        <span className="text-[10px] opacity-60 font-bold">{toPersianDigits(sub.number)}</span>
                      </div>
                      {sub.number === activeSub.number && <Check size={14} />}
                    </button>
                  ))}
                  <button onClick={onAddSub} className="w-full flex items-center justify-center gap-2 py-3 text-blue-600 bg-blue-50 rounded-xl text-xs font-black mt-2">
                    <Plus size={16} /> افزودن اشتراک
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        
        <button onClick={onLeaderboardClick} className="bg-gradient-to-br from-yellow-400 to-orange-500 p-0.5 rounded-2xl shadow-xl shadow-orange-100 active:scale-95 transition-all group shrink-0">
          <div className="bg-white/10 backdrop-blur-md px-3 py-2 md:px-6 md:py-4 rounded-[14px] flex items-center gap-2 md:gap-4 border border-white/20">
            <div className="flex flex-col items-start">
              <span className="flex min-h-[1.75rem] items-center text-sm font-black text-white md:min-h-[2.25rem] md:text-xl">
                {profileLoading ? (
                  <Loader2 className="h-6 w-6 shrink-0 animate-spin text-white/90 md:h-8 md:w-8" aria-hidden />
                ) : (
                  toPersianDigits(displayGazyom.toLocaleString('en-US'))
                )}
              </span>
              <span className="text-[8px] md:text-[10px] font-bold text-white/80">گازیوم</span>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center border border-white/30">
              <Trophy size={16} className="text-white fill-white md:hidden" />
              <Trophy size={24} className="text-white fill-white hidden md:block" />
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-8 flex flex-col">
          
          <div className="grid grid-cols-1 md:grid-cols-2 md:items-stretch gap-6">
            
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-100 flex flex-col justify-between h-full min-h-0 order-1 md:order-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CloudSun size={24} />
                    <span className="font-black text-lg">وضعیت جوی</span>
                  </div>
                  <p className="text-xs opacity-80 font-bold">{weatherData?.status || 'در حال دریافت...'}</p>
                </div>
                <div className="text-3xl font-black">{toPersianDigits(weatherData?.temp || '--')}°</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 mt-6">
                <p className="text-xs font-bold leading-relaxed">{weatherData?.advice || 'منتظر تحلیل هوش مصنوعی...'}</p>
              </div>
            </div>

            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full min-h-[18rem] order-2 md:order-1">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <TrendingDown className="text-green-500" size={18} />
                  <h3 className="font-black text-sm text-slate-800">روند مصرف</h3>
                </div>
              </div>
              <div className="flex flex-1 min-h-0 min-w-0 w-full flex-col">
                {chartLoading && chartRows.length === 0 ? (
                  <SectionLoader className="flex-1" minClassName="min-h-[11rem]" label="در حال بارگذاری نمودار…" />
                ) : chartRows.length === 0 ? (
                  <div className="flex flex-1 min-h-[11rem] items-center justify-center px-4 text-center text-xs font-bold text-slate-400">
                    {chartError || 'داده‌ای برای روند مصرف ثبت نشده است.'}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[12rem] w-full min-w-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%" className="!max-w-none">
                      <BarChart
                        data={chartOrderedRows}
                        margin={{ top: 6, right: 4, bottom: 2, left: 0 }}
                        barCategoryGap="3%"
                        barGap={2}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 'bold' }}
                          tickFormatter={(v) => toPersianDigits(String(v))}
                        />
                        <YAxis
                          width={34}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => toPersianDigits(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: 'none',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                            direction: 'rtl',
                            textAlign: 'right',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                          formatter={(value: number | string, name: string) => [
                            `${toPersianDigits(Math.round(Number(value)))} متر مکعب`,
                            name === 'امسال' ? 'امسال' : 'پارسال',
                          ]}
                          labelFormatter={(label) => `ماه: ${toPersianDigits(String(label))}`}
                        />
                        <Bar name="امسال" dataKey="currentYear" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar name="پارسال" dataKey="lastYear" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          
          <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-xl shadow-blue-100 flex items-center gap-6 relative overflow-hidden group order-3">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
              <Zap size={28} className="fill-white" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">پیشنهاد هوشمند امروز</span>
              <p className="text-xs md:text-sm font-black leading-relaxed">{aiTip}</p>
            </div>
          </div>

          
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6 order-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base md:text-lg text-slate-800">ماموریت‌های روزانه</h3>
              <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-[10px] font-black">
                {missions.length > 0
                  ? `${toPersianDigits(completedCount)} از ${toPersianDigits(missions.length)}`
                  : hintsLoading
                  ? '…'
                  : '—'}
              </div>
            </div>
            {hintsError && (
              <p className="text-[10px] text-red-500 font-bold text-center">{hintsError}</p>
            )}
            {hintsLoading && missions.length === 0 && !hintsError && (
              <SectionLoader minClassName="min-h-[8rem]" label="در حال بارگذاری ماموریت‌ها…" />
            )}
            {!hintsLoading && missions.length === 0 && !hintsError && (
              <p className="text-sm font-bold text-slate-400 text-center py-8">ماموریت فعالی نیست.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {missions.map((mission) =>
                mission.completed ? (
                  <div
                    key={mission.id}
                    className="p-4 rounded-2xl border transition-all flex items-center justify-between gap-2 bg-indigo-50/50 border-indigo-100"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-indigo-600 shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="text-[10px] md:text-[11px] font-black leading-snug opacity-50 line-through text-slate-600">
                          {mission.title}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-500/90">
                          +{toPersianDigits(mission.points)} گازیوم
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    key={mission.id}
                    type="button"
                    disabled={submittingHintId !== null}
                    onClick={() => handleCompleteMission(mission.id)}
                    className="w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-2 bg-white border-slate-100 text-right hover:border-indigo-200 hover:bg-indigo-50/30 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-slate-300 shrink-0">
                        <Circle size={20} />
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="text-[10px] md:text-[11px] font-black leading-snug text-slate-700">
                          {mission.title}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-500/90">
                          +{toPersianDigits(mission.points)} گازیوم · برای ثبت ضربه بزنید
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white">
                      {submittingHintId === mission.id ? '…' : 'ثبت'}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        
        <div className="lg:col-span-4 space-y-8">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-lg text-slate-800">جوایز پیشنهادی</h3>
            <button
              type="button"
              onClick={() => onSeeAllRewards?.()}
              className="text-xs text-orange-500 font-bold hover:underline"
            >
              مشاهده همه
            </button>
          </div>
          <div className="space-y-6">
            {rewardsLoading && rewardPreview.length === 0 ? (
              <SectionLoader minClassName="min-h-[8rem]" label="در حال بارگذاری جوایز…" />
            ) : rewardPreview.length === 0 ? (
              <p className="text-center text-xs font-bold text-slate-400 px-2 py-6 leading-relaxed">
                {rewardsError || 'جایزه‌ای برای نمایش نیست.'}
              </p>
            ) : (
              rewardPreview.map((reward) => (
                <div
                  key={reward.id}
                  onClick={() => onRewardClick(reward)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="h-40 relative">
                    <img
                      src={reward.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 right-4 flex flex-col items-end gap-0.5 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-xl text-white text-[10px] font-black">
                      <span>{toPersianDigits(String(reward.requiredGazyom))}</span>
                      <span className="text-[8px] font-bold text-white/85">امتیاز مورد نیاز</span>
                    </div>
                  </div>
                  <div className="p-5 flex justify-between items-center gap-2">
                    <h4 className="text-xs font-black text-slate-800 line-clamp-2">{reward.title}</h4>
                    <ChevronLeft size={16} className="text-slate-300 group-hover:text-orange-500 shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
