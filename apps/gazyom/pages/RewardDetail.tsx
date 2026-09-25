
import React, { useState, useCallback } from 'react';
import { Reward } from '../types';
import { ArrowRight, CheckCircle2, X, Info, Gift, Copy } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import { redeemReward } from '../services/wsOptimizeApi';

function resolveRewardIdForRedeem(reward: Reward): number | null {
  if (reward.rewardId != null && reward.rewardId > 0) return Math.trunc(reward.rewardId);
  const n = parseInt(String(reward.id).replace(/\D/g, '') || '0', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface RewardDetailProps {
  reward: Reward;
  onBack: () => void;
  wsBaseUrl: string;
  keyNo: string;
  onRedeemSuccess?: (tokenSpent: number) => void;
}

const RewardDetail: React.FC<RewardDetailProps> = ({
  reward,
  onBack,
  wsBaseUrl,
  keyNo,
  onRedeemSuccess,
}) => {
  const [successPayload, setSuccessPayload] = useState<{
    code: string;
    title: string;
    message?: string;
  } | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [claimError, setClaimError] = useState('');

  const tokenCost = reward.requiredGazyom;
  const rewardId = resolveRewardIdForRedeem(reward);

  const handleClaim = async () => {
    if (!wsBaseUrl || !keyNo || rewardId == null) {
      setClaimError('شناسه جایزه نامعتبر است. لیست جوایز را دوباره باز کنید.');
      return;
    }
    setClaimError('');
    setRedeeming(true);
    try {
      const res = await redeemReward(wsBaseUrl, { keyNo, rewardId });
      if (res.ok === false) {
        setClaimError(res.message);
        return;
      }
      const spent = res.token_spent > 0 ? res.token_spent : tokenCost;
      onRedeemSuccess?.(spent);
      setSuccessPayload({
        code: res.code,
        title: res.title,
        message: res.message,
      });
    } catch {
      setClaimError('خطا در ارتباط با سرور');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyCode = useCallback(() => {
    if (!successPayload?.code) return;
    navigator.clipboard.writeText(successPayload.code).catch(() => {});
  }, [successPayload?.code]);

  return (
    <div className="fixed inset-0 bg-slate-50/95 backdrop-blur-md z-[60] overflow-y-auto animate-in fade-in duration-300">
      <div className="min-h-screen flex items-center justify-center p-0 md:p-8">
        <div className="bg-white w-full max-w-6xl md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[80vh] relative">
          
          <button 
            onClick={onBack} 
            className="hidden md:flex absolute top-8 left-8 z-50 w-12 h-12 items-center justify-center bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-all border border-white/30"
          >
            <X size={24} />
          </button>

          <div className="md:w-1/2 relative bg-slate-900 overflow-hidden">
            <img 
              src={reward.image} 
              alt={reward.title} 
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent md:bg-gradient-to-l"></div>
            
            <button 
              onClick={onBack} 
              className="md:hidden absolute top-6 right-6 w-10 h-10 bg-black/30 backdrop-blur-md text-white rounded-xl flex items-center justify-center border border-white/20"
            >
              <ArrowRight size={20} />
            </button>

            <div className="absolute bottom-10 right-10 left-10 text-white space-y-4">
              <div className="flex w-fit flex-col gap-0.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black shadow-xl animate-bounce">
                <span>{toPersianDigits(tokenCost.toLocaleString('en-US'))}</span>
                <span className="text-[10px] font-bold text-white/90">امتیاز مورد نیاز</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-2xl">{reward.title}</h1>
            </div>
          </div>

          <div className="md:w-1/2 p-8 md:p-16 flex flex-col overflow-y-auto bg-white">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Info size={24} />
                  </div>
                  <h3 className="text-xl font-black">توضیحات جایزه</h3>
                </div>
                <p className="text-slate-500 leading-relaxed font-medium text-lg text-justify">
                  {reward.description}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-12 space-y-3">
              {claimError ? (
                <p className="text-center text-sm font-bold text-red-600">{claimError}</p>
              ) : null}
              <button 
                type="button"
                onClick={handleClaim}
                disabled={redeeming || rewardId == null}
                className="w-full bg-green-500 disabled:opacity-50 disabled:pointer-events-none text-white py-6 rounded-2xl font-black text-xl shadow-2xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-4 hover:bg-green-600"
              >
                {redeeming ? 'در حال ثبت…' : `دریافت و کسر ${toPersianDigits(tokenCost.toLocaleString('en-US'))} امتیاز`}
                <Gift size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {successPayload && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-12 text-center space-y-8 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-green-500 to-emerald-400"></div>
            <button type="button" onClick={() => setSuccessPayload(null)} className="absolute top-8 left-8 text-slate-300 hover:text-slate-900 transition-colors"><X size={32}/></button>
            <div className="w-28 h-28 bg-green-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl shadow-green-200">
              <CheckCircle2 size={56} />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-slate-900">تبریک! پاداش فعال شد</h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed px-4 md:px-10">
                {successPayload.message || 'کد جایزه شما صادر شد. آن را کپی کرده و در هنگام خرید ارائه دهید.'}
              </p>
            </div>
            <div className="bg-slate-50 py-8 px-4 rounded-3xl border-4 border-dashed border-slate-200 space-y-4">
              <p className="text-xs font-bold text-slate-500">{successPayload.title}</p>
              <span className="block text-lg md:text-2xl font-black tracking-wide text-slate-800 break-all px-2">
                {successPayload.code ? toPersianDigits(successPayload.code) : '—'}
              </span>
              {successPayload.code ? (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center justify-center gap-2 mx-auto text-xs font-black text-orange-600 hover:text-orange-700"
                >
                  <Copy size={14} />
                  کپی کد
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => { setSuccessPayload(null); onBack(); }}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800"
            >
              بازگشت به ویترین
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardDetail;
