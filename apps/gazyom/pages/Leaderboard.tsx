
import React, { useEffect, useState } from 'react';
import { ChevronRight, Trophy, Crown, Star, UserCircle2, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import type { LeaderboardEntry, LeaderboardSummary } from '../types';
import { fetchLeaderboard } from '../services/wsOptimizeApi';
import { leaderboardHourRead, leaderboardHourWrite } from '../services/dataRefreshCache';

interface LeaderboardProps {
  onBack: () => void;
  wsBaseUrl: string;
  keyNo: string | number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack, wsBaseUrl, keyNo }) => {
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!wsBaseUrl || !keyNo) return;
    const keyNoStr = String(keyNo);
    const cached = leaderboardHourRead<{ summary: LeaderboardSummary; rows: LeaderboardEntry[] }>(
      wsBaseUrl,
      keyNoStr
    );
    if (cached) {
      setSummary(cached.summary);
      setRows(cached.rows);
      setError('');
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError('');
    fetchLeaderboard(wsBaseUrl, { keyNo, isCity: true }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setError(res.message);
          setSummary(null);
          setRows([]);
          return;
        }
        leaderboardHourWrite(wsBaseUrl, keyNoStr, { summary: res.summary, rows: res.rows });
        setSummary(res.summary);
        setRows(res.rows);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setError('خطا در دریافت رتبه‌بندی');
        setSummary(null);
        setRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl, keyNo]);

  const first = rows[0];
  const second = rows[1];
  const third = rows[2];
  const rest = rows.slice(3);

  const gapToFirst =
    summary && first && summary.myRank > 1
      ? Math.max(0, first.token - summary.myToken)
      : 0;

  const scopeLabel =
    summary?.scope === 'city'
      ? summary.cityName && summary.cityName !== '—'
        ? `شهر ${summary.cityName}`
        : 'رتبه در شهر'
      : 'رتبه در استان';

  return (
    <div className="fixed inset-0 bg-[#020617] z-[80] overflow-y-auto animate-in slide-in-from-bottom duration-700 flex flex-col font-vazir">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[-20%] w-[140%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white rounded-full animate-ping delay-500"></div>
        <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse delay-700"></div>
      </div>

      <header className="p-6 flex items-center justify-between sticky top-0 z-30 bg-slate-950/40 backdrop-blur-2xl border-b border-white/5">
        <button
          type="button"
          onClick={onBack}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-[12px] text-white active:scale-90 transition-all border border-white/10"
        >
          <ChevronRight size={20} />
        </button>
        <div className="text-center px-2">
          <h2 className="text-sm font-black text-white tracking-wide">تالار افتخارات گازیوم</h2>
          <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">{scopeLabel}</p>
        </div>
        <div className="w-10 shrink-0 flex justify-end">
          <Trophy size={20} className="text-yellow-400/80" />
        </div>
      </header>

      <div className="p-6 space-y-8 relative z-10 flex-grow pb-48">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" aria-hidden />
            <p className="text-sm font-bold text-white/60">در حال بارگذاری رتبه‌ها…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 px-4">
            <p className="text-sm font-black text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {first ? (
              <div className="flex justify-center items-end gap-2 pt-12 pb-16">
                {second ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-full border-2 border-slate-400/30 shadow-[0_0_30px_rgba(148,163,184,0.2)] flex items-center justify-center text-slate-300 relative group">
                      <UserCircle2 size={32} strokeWidth={1.5} />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center text-[10px] font-black text-slate-900 border-2 border-slate-900">
                        {toPersianDigits(second.rank)}
                      </div>
                    </div>
                    <div className="h-28 w-20 bg-gradient-to-t from-slate-400/5 to-slate-400/20 rounded-t-[12px] flex flex-col items-center justify-end pb-4 border-t border-x border-white/10 relative">
                      <span className="text-[9px] font-black text-white/60 mb-1 text-center px-1 line-clamp-2">{second.mobNo}</span>
                      <span className="text-[11px] font-black text-slate-300">
                        {toPersianDigits(second.token.toLocaleString('en-US'))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-20" />
                )}

                <div className="flex flex-col items-center gap-4 scale-110 -translate-y-4">
                  <div className="relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce flex flex-col items-center">
                      <Crown size={32} fill="currentColor" />
                      <Sparkles size={12} className="absolute -right-2 top-0" />
                    </div>
                    <div
                      className={`w-24 h-24 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-xl rounded-full border-2 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.4)] flex items-center justify-center text-yellow-400 ${
                        first.isMe ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''
                      }`}
                    >
                      <UserCircle2 size={48} strokeWidth={1} />
                    </div>
                  </div>
                  <div className="h-40 w-24 bg-gradient-to-t from-yellow-500/10 to-yellow-500/30 rounded-t-[12px] flex flex-col items-center justify-end pb-6 border-t border-x border-yellow-400/20 relative shadow-[0_0_30px_rgba(250,204,21,0.1)]">
                    <div className="absolute -top-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-[12px] font-black text-slate-900 shadow-xl border-4 border-slate-900">
                      {toPersianDigits(first.rank)}
                    </div>
                    <span className="text-[10px] font-black text-white mb-1 text-center px-1 line-clamp-2">{first.mobNo}</span>
                    <span className="text-sm font-black text-yellow-400">
                      {toPersianDigits(first.token.toLocaleString('en-US'))}
                    </span>
                  </div>
                </div>

                {third ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-full border-2 border-orange-400/30 shadow-[0_0_30px_rgba(251,146,60,0.2)] flex items-center justify-center text-orange-400 relative">
                      <UserCircle2 size={32} strokeWidth={1.5} />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center text-[10px] font-black text-slate-900 border-2 border-slate-900">
                        {toPersianDigits(third.rank)}
                      </div>
                    </div>
                    <div className="h-24 w-20 bg-gradient-to-t from-orange-400/5 to-orange-400/20 rounded-t-[12px] flex flex-col items-center justify-end pb-4 border-t border-x border-white/10 relative">
                      <span className="text-[9px] font-black text-white/60 mb-1 text-center px-1 line-clamp-2">{third.mobNo}</span>
                      <span className="text-[11px] font-black text-orange-300">
                        {toPersianDigits(third.token.toLocaleString('en-US'))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-20" />
                )}
              </div>
            ) : (
              <p className="text-center text-sm font-bold text-white/50 py-16">هنوز رکوردی در این محدوده ثبت نشده است.</p>
            )}

            {rest.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">سایر برگزیدگان</span>
                  <TrendingUp size={14} className="text-slate-500" />
                </div>
                {rest.map((user) => (
                  <div
                    key={`${user.rank}-${user.mobNo}`}
                    className={`bg-white/[0.03] backdrop-blur-sm p-4 rounded-[16px] border flex items-center justify-between group transition-all hover:bg-white/[0.08] hover:translate-x-[-4px] ${
                      user.isMe ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-xs font-black text-white/20 w-6 text-center shrink-0">
                        {toPersianDigits(user.rank)}
                      </span>
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 flex items-center justify-center text-white/30 group-hover:text-white/60 transition-colors shrink-0">
                        <UserCircle2 size={24} strokeWidth={1.5} />
                      </div>
                      <span className="text-xs font-bold text-white/80 truncate">{user.mobNo}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-white">
                        {toPersianDigits(user.token.toLocaleString('en-US'))}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {summary && !loading && !error ? (
        <div className="fixed bottom-0 left-0 right-0 p-6 z-40 max-w-md mx-auto pointer-events-none">
          <div className="pointer-events-auto bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-[24px] p-1 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>

            <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[20px] p-6 flex flex-col gap-5 border border-white/10 relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl border border-white/10 backdrop-blur-md">
                      <UserCircle2 size={36} strokeWidth={1} />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-slate-900 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-[0_0_15px_rgba(250,204,21,0.5)] border-4 border-slate-900">
                      <Star size={14} fill="currentColor" />
                    </div>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-black text-white leading-snug">
                      {summary.scope === 'city' ? 'جایگاه شما در شهر' : 'جایگاه شما در استان'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {summary.cityName && summary.cityName !== '—' ? (
                        <span className="text-[10px] font-bold text-blue-200 px-2 py-0.5 bg-blue-500/20 rounded-full border border-blue-400/20 truncate max-w-[10rem]">
                          {summary.cityName}
                        </span>
                      ) : null}
                      <span className="text-[10px] font-bold text-slate-400">
                        {toPersianDigits(summary.totalUsers)} شرکت‌کننده
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">رتبه فعلی</span>
                  <div className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">
                    <span className="text-xs font-normal opacity-50 ml-1">#</span>
                    {toPersianDigits(summary.myRank)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white/5 rounded-[12px] p-3 border border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">کل گازیوم شما</span>
                  <span className="text-xs font-black text-white truncate">
                    {toPersianDigits(summary.myToken.toLocaleString('en-US'))}
                  </span>
                </div>
                <div className="bg-white/5 rounded-[12px] p-3 border border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">تا رتبه اول</span>
                  <span className="text-xs font-black text-orange-400 truncate">
                    {summary.myRank <= 1
                      ? '—'
                      : toPersianDigits(gapToFirst.toLocaleString('en-US'))}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30"></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Leaderboard;
