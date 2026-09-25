
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Sparkles, Tag, Disc, History, Gift } from 'lucide-react';
import { SectionLoader } from '../components/SectionLoader';
import { Reward } from '../types';
import { toPersianDigits } from '../services/geminiService';
import { fetchRewardList } from '../services/wsOptimizeApi';
import { rewardsListHourRead, rewardsListHourWrite } from '../services/dataRefreshCache';

function rewardFilterKey(r: Reward): string {
  const raw = r.categoryLabel?.trim();
  if (raw) return raw;
  switch (r.category) {
    case 'cash':
      return 'تراکنش نقدی';
    case 'voucher':
      return 'کد تخفیف';
    case 'digital':
      return 'دیجیتال';
    case 'lottery':
      return 'قرعه‌کشی';
    default:
      return 'سایر';
  }
}

function filterIconForLabel(label: string): React.ReactNode {
  if (/منتخب|ویژه|برگزیده|featured|today/i.test(label)) {
    return <Sparkles size={16} />;
  }
  return null;
}

interface RewardsProps {
  wsBaseUrl: string;
  keyNo: string;
  onRewardClick: (r: Reward) => void;
  onWheelClick: () => void;
  onHistoryClick: () => void;
  onMyRewardsClick: () => void;
}

const Rewards: React.FC<RewardsProps> = ({
  wsBaseUrl,
  keyNo,
  onRewardClick,
  onWheelClick,
  onHistoryClick,
  onMyRewardsClick,
}) => {
  const [filter, setFilter] = useState('all');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!wsBaseUrl || !keyNo) return;
    const keyNoStr = String(keyNo);
    const cached = rewardsListHourRead<Reward[]>(wsBaseUrl, keyNoStr);
    if (cached) {
      setRewards(cached);
      setLoadError('');
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setLoadError('');
    fetchRewardList(wsBaseUrl, { keyNo }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setLoadError(res.message);
          setRewards([]);
          return;
        }
        rewardsListHourWrite(wsBaseUrl, keyNoStr, res.items);
        setRewards(res.items);
      })
      .catch(() => {
        setLoadError('خطا در دریافت لیست جوایز');
        setRewards([]);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [wsBaseUrl, keyNo]);

  const categoryChips = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rewards) {
      keys.add(rewardFilterKey(r));
    }
    const sorted = Array.from(keys).sort((a, b) => a.localeCompare(b, 'fa'));
    return [
      { id: 'all' as const, label: 'همه جوایز', icon: <Tag size={16} /> as React.ReactNode },
      ...sorted.map((label) => ({
        id: label,
        label,
        icon: filterIconForLabel(label),
      })),
    ];
  }, [rewards]);

  useEffect(() => {
    if (filter === 'all') return;
    const valid = categoryChips.some((c) => c.id === filter);
    if (!valid) setFilter('all');
  }, [filter, categoryChips]);

  const filteredRewards = useMemo(() => {
    if (filter === 'all') return rewards;
    return rewards.filter((r) => rewardFilterKey(r) === filter);
  }, [rewards, filter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg shadow-orange-100"><Gift size={28} /></div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">ویترین پاداش‌ها</h2>
        </div>
        <div className="flex gap-3 md:gap-4">
          <button onClick={onHistoryClick} className="flex-grow md:flex-none bg-white px-4 md:px-6 py-3 rounded-xl border border-slate-200 text-[10px] md:text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><History size={16} className="text-orange-500" /> تراکنش‌ها</button>
          <button onClick={onMyRewardsClick} className="flex-grow md:flex-none bg-slate-900 text-white px-4 md:px-6 py-3 rounded-xl text-[10px] md:text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"><Gift size={16} className="text-orange-400" /> کیف جوایز</button>
        </div>
      </div>

      
      <div onClick={onWheelClick} className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 rounded-[28px] md:rounded-[32px] p-5 md:p-10 text-white shadow-2xl flex items-center justify-between group cursor-pointer relative overflow-hidden transition-all hover:scale-[1.01] gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl animate-pulse"></div>
        
        <div className="relative z-10 flex items-center gap-4 md:gap-8 flex-grow">
          <div className="w-14 h-14 md:w-24 md:h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 animate-spin-slow shadow-2xl shrink-0">
            <Disc size={28} className="md:w-12 md:h-12" />
          </div>
          <div className="space-y-0.5 md:space-y-1 text-right">
            <h3 className="text-base md:text-3xl font-black">گردونه جادویی گازیوم</h3>
            <p className="text-[9px] md:text-base opacity-80 font-bold line-clamp-1">شانس خود را برای دریافت امتیاز رایگان امتحان کنید!</p>
          </div>
        </div>
        
        <div className="bg-white/20 text-white w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-xl group-hover:translate-x-[-4px] transition-transform shrink-0 border border-white/20">
          <ChevronLeft size={20} />
        </div>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {categoryChips.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-6 md:px-8 py-3 md:py-4 rounded-2xl text-xs md:text-sm font-black whitespace-nowrap transition-all flex items-center gap-3 ${
              filter === cat.id 
                ? 'bg-orange-500 text-white shadow-xl shadow-orange-100' 
                : 'bg-white text-slate-500 border border-slate-100 shadow-sm hover:border-orange-200'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {loading && rewards.length === 0 ? (
          <div className="col-span-full">
            <SectionLoader minClassName="min-h-[14rem]" label="در حال بارگذاری جوایز…" />
          </div>
        ) : loadError && rewards.length === 0 ? (
          <p className="col-span-full text-center text-sm font-bold text-slate-500 px-4 py-16">{loadError}</p>
        ) : filteredRewards.length === 0 ? (
          <p className="col-span-full text-center text-sm font-bold text-slate-400 py-16">جایزه‌ای در این بخش نیست.</p>
        ) : (
          filteredRewards.map((reward) => (
          <div key={reward.id} onClick={() => onRewardClick(reward)} className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-50 hover:shadow-2xl transition-all cursor-pointer flex flex-col">
            <div className="relative h-48 md:h-60 overflow-hidden">
              <img src={reward.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-xl shadow-lg border border-white/50 flex flex-col items-center">
                <span className="text-xs md:text-sm font-black text-orange-600">{toPersianDigits(reward.requiredGazyom.toLocaleString())}</span>
                <span className="text-[8px] md:text-[10px] font-bold text-slate-400 text-center leading-tight">امتیاز مورد نیاز</span>
              </div>
            </div>
            <div className="p-5 md:p-6 flex flex-col justify-between flex-grow gap-4">
              <h4 className="text-sm md:text-base font-black text-slate-800 leading-tight">{reward.title}</h4>
              <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                <span className="text-[8px] md:text-[10px] text-slate-400 font-bold">موجود در کل کشور</span>
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-300 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <ChevronLeft size={14} />
                </div>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Rewards;
