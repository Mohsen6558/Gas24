
import React, { useState, useEffect } from 'react';
import { ChevronRight, Gift, CheckCircle2, Clock, Calendar, Copy, Check } from 'lucide-react';
import type { MyRewardClaimedItem } from '../types';
import { toPersianDigits } from '../services/geminiService';
import { fetchMyRewards } from '../services/wsOptimizeApi';
import { myRewardsHourRead, myRewardsHourWrite } from '../services/dataRefreshCache';
import { SectionLoader } from '../components/SectionLoader';

const MyRewards: React.FC<{
  onBack: () => void;
  wsBaseUrl: string;
  keyNo: string;
}> = ({ onBack, wsBaseUrl, keyNo }) => {
  const [items, setItems] = useState<MyRewardClaimedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!wsBaseUrl || !keyNo) return;
    const keyNoStr = String(keyNo);
    const cached = myRewardsHourRead<MyRewardClaimedItem[]>(wsBaseUrl, keyNoStr);
    if (cached) {
      setItems(cached);
      setLoadError('');
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setLoadError('');
    fetchMyRewards(wsBaseUrl, { keyNo }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setLoadError(res.message);
          setItems([]);
          return;
        }
        myRewardsHourWrite(wsBaseUrl, keyNoStr, res.items);
        setItems(res.items);
      })
      .catch(() => {
        setLoadError('خطا در دریافت کیف جوایز');
        setItems([]);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [wsBaseUrl, keyNo]);

  const handleCopy = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[70] overflow-y-auto animate-in slide-in-from-left duration-500">
      <header className="p-6 flex items-center gap-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-[7px] active:scale-90 transition-all"><ChevronRight size={20} /></button>
        <h2 className="text-lg font-black">جایزه‌های دریافتی من</h2>
      </header>

      <div className="p-6 space-y-6">
        {loading && items.length === 0 ? (
          <SectionLoader
            className="rounded-[7px] border border-slate-100 bg-white"
            minClassName="min-h-[14rem]"
            label="در حال بارگذاری جوایز دریافتی…"
          />
        ) : loadError && items.length === 0 ? (
          <p className="text-center text-sm font-bold text-slate-500 px-4 py-16">{loadError}</p>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="bg-white rounded-[7px] overflow-hidden shadow-sm border border-slate-100 flex flex-col">
              <div className="flex p-4 gap-4">
                <img src={item.image} alt="" className="w-20 h-20 rounded-[7px] object-cover shrink-0" />
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <h3 className="text-xs font-black text-slate-800 leading-tight">{item.title}</h3>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                    <Calendar size={12} className="shrink-0" />
                    <span>دریافت شده در {toPersianDigits(item.date)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 px-5 py-3 flex justify-between items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {item.status === 'active' ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-[4px]">
                      <Clock size={12} />
                      آماده استفاده
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-[4px]">
                      <CheckCircle2 size={12} />
                      استفاده شده
                    </span>
                  )}
                </div>
                {item.status === 'active' && item.codeCopy.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => handleCopy(item.codeCopy)}
                    className={`relative flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-[7px] border transition-all active:scale-95 max-w-[min(100%,14rem)] ${
                      copiedCode === item.codeCopy 
                        ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-100' 
                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                    }`}
                  >
                    {copiedCode === item.codeCopy ? (
                      <>
                        <Check size={12} className="shrink-0" />
                        کپی شد!
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="shrink-0" />
                        <span className="truncate">کد: {toPersianDigits(item.codeLabel)}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Gift size={40} />
            </div>
            <p className="text-sm font-bold text-slate-400">هنوز جایزه‌ای دریافت نکرده‌اید.</p>
          </div>
        )}
      </div>

      {copiedCode && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-[7px] text-xs font-black shadow-2xl animate-in fade-in slide-in-from-bottom-4 z-[80] flex items-center gap-3 border border-white/10">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check size={14} />
          </div>
          کد هدیه با موفقیت کپی شد
        </div>
      )}
    </div>
  );
};

export default MyRewards;
