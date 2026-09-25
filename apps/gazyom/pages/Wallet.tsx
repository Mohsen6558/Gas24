
import React, { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import { ChevronRight, ArrowUpLeft, ArrowDownRight, RefreshCcw, Info } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import { fetchGetProfile, fetchTokenHistory } from '../services/wsOptimizeApi';
import { SectionLoader } from '../components/SectionLoader';

const Wallet: React.FC<{
  onBack: () => void;
  wsBaseUrl: string;
  keyNo: string;
  
  profileTotalToken: number;
  onTotalTokenFromProfile?: (total: number) => void;
}> = ({ onBack, wsBaseUrl, keyNo, profileTotalToken, onTotalTokenFromProfile }) => {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => {
    if (!wsBaseUrl || !keyNo) return;
    const ac = new AbortController();
    let cancelled = false;

    const loadTx = (signal: AbortSignal | undefined, showLoader: boolean) => {
      if (!wsBaseUrl || !keyNo) return;
      if (showLoader) {
        setListLoading(true);
        setListError('');
      }
      fetchTokenHistory(wsBaseUrl, { keyNo, filter: 'all', sort: 'newest' }, { signal })
        .then((res) => {
          if (cancelled) return;
          if (res.ok === false) {
            setListError(res.message);
            setTransactions([]);
            return;
          }
          setListError('');
          setTransactions(res.rows);
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          if (cancelled) return;
          setListError('خطا در دریافت تاریخچه');
          setTransactions([]);
        })
        .finally(() => {
          if (!cancelled && showLoader) setListLoading(false);
        });
    };

    loadTx(ac.signal, true);

    fetchGetProfile(wsBaseUrl, { keyNo }, { signal: ac.signal })
      .then((res) => {
        if (cancelled || res.ok === false) return;
        const row =
          res.rows.find((r) => String(r.key_no) === String(keyNo)) ?? res.rows[0];
        if (row != null) {
          const token = typeof row.total_token === 'number' ? row.total_token : 0;
          onTotalTokenFromProfile?.(token);
        }
      })
      .catch(() => {});

    const onVis = () => {
      if (document.visibilityState !== 'visible' || cancelled) return;
      loadTx(undefined, false);
    };
    document.addEventListener('visibilitychange', onVis);

    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || cancelled) return;
      loadTx(undefined, false);
    }, 15_000);

    return () => {
      cancelled = true;
      ac.abort();
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(id);
    };
  }, [wsBaseUrl, keyNo, onTotalTokenFromProfile]);

  const handleCashout = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  const balanceText = toPersianDigits(profileTotalToken.toLocaleString('en-US'));

  return (
    <div className="fixed inset-0 bg-slate-50 z-[60] overflow-y-auto animate-in slide-in-from-bottom-full duration-500">
      <header className="p-6 flex items-center gap-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-[7px] active:scale-90 transition-all"><ChevronRight size={20} /></button>
        <h2 className="text-lg font-black">کیف پول و تراکنش‌ها</h2>
      </header>

      <div className="p-6 space-y-8">
        
        <div className="bg-slate-900 rounded-[7px] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <p className="text-xs opacity-60 mb-2">موجودی گازیوم</p>
            <div className="text-4xl font-black mb-8">{balanceText}</div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleCashout}
                className={`w-full py-4 rounded-[7px] font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  showComingSoon ? 'bg-slate-700 text-slate-300' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                }`}
              >
                {showComingSoon ? (
                  <>این قابلیت بزودی فعال خواهد شد</>
                ) : (
                  <>
                    <RefreshCcw size={16} />
                    تبدیل به نقد
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        
        <div className="space-y-4">
          <h3 className="font-black text-sm px-1">تاریخچه تراکنش‌ها</h3>
          <div className="space-y-3">
            {listLoading && transactions.length === 0 ? (
              <SectionLoader
                className="rounded-[7px] border border-slate-100 bg-white"
                minClassName="min-h-[10rem]"
                label="در حال بارگذاری تراکنش‌ها…"
              />
            ) : listError && transactions.length === 0 ? (
              <p className="text-center text-xs font-bold text-slate-500 px-2 py-8">{listError}</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-xs font-bold text-slate-400 py-8">تراکنشی ثبت نشده است.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-[7px] flex items-center gap-4 border border-slate-100 shadow-sm">
                  <div className={`p-3 rounded-[7px] ${tx.type === 'earn' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                    {tx.type === 'earn' ? <ArrowDownRight size={20} /> : <ArrowUpLeft size={20} />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-[11px] font-black leading-snug">{tx.description}</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">{toPersianDigits(tx.date)}</p>
                  </div>
                  <div className={`text-sm font-black shrink-0 ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0
                      ? `+${toPersianDigits(tx.amount.toLocaleString('en-US'))}`
                      : toPersianDigits(tx.amount.toLocaleString('en-US'))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-[7px] border border-orange-100 flex gap-3">
            <Info className="text-orange-500 shrink-0" size={20} />
            <div>
              <h4 className="text-xs font-black text-orange-900 mb-2">قوانین نقد کردن</h4>
              <p className="text-[10px] text-orange-800/80 leading-relaxed font-bold">
                  هر {toPersianDigits('1,000')} گازیوم معادل {toPersianDigits('100')} هزار تومان وجه نقد می‌باشد. مبالغ نقدی فقط به حساب صاحب اشتراک گاز واریز می‌گردد.
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
