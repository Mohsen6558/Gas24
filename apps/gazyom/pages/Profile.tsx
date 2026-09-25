
import React, { useState, useEffect } from 'react';
import { Share2, HelpCircle, LogOut, ChevronLeft, Copy, Check, UserCircle2, Hash, Plus, Trash2, X, Settings, Gift, Coins, Heart, Loader2 } from 'lucide-react';
import { SectionLoader } from '../components/SectionLoader';
import { Subscription } from '../types';
import { toPersianDigits } from '../services/geminiService';
import { fetchGetProfile } from '../services/wsOptimizeApi';
import AddSubscriptionFlow from '../components/AddSubscriptionFlow';

interface ProfileProps {
  subscriptions: Subscription[];
  activeSubIndex: number;
  onSwitchSub: (index: number) => void;
  onAddSub: (sub: Subscription) => void;
  wsBaseUrl: string;
  onRemoveSub: (index: number) => void;
  onWalletClick: () => void;
  onKBClick: () => void;
  onMyRewardsClick: () => void;
  onTotalTokenFromProfile?: (total: number) => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  subscriptions, 
  activeSubIndex, 
  onSwitchSub, 
  onAddSub, 
  wsBaseUrl,
  onRemoveSub,
  onWalletClick, 
  onKBClick, 
  onMyRewardsClick, 
  onTotalTokenFromProfile,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubSearchResults, setAddSubSearchResults] = useState(0);
  const [profileMobNo, setProfileMobNo] = useState('');
  const [profileCityName, setProfileCityName] = useState('');
  const [profileTotalToken, setProfileTotalToken] = useState(0);
  const [profileRewardsCount, setProfileRewardsCount] = useState(0);
  const [profileReferCode, setProfileReferCode] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  const activeSub = subscriptions[activeSubIndex];

  useEffect(() => {
    if (!showAddModal) setAddSubSearchResults(0);
  }, [showAddModal]);

  useEffect(() => {
    if (!wsBaseUrl || !activeSub?.number) return;
    const ac = new AbortController();
    setProfileLoading(true);
    fetchGetProfile(wsBaseUrl, { keyNo: activeSub.number }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) return;
        if (res.mobNo) setProfileMobNo(String(res.mobNo));
        if (res.referCode != null && res.referCode !== '') setProfileReferCode(String(res.referCode));
        const row =
          res.rows.find((r) => String(r.key_no) === String(activeSub.number)) ?? res.rows[0];
        if (row) {
          setProfileCityName(row.city_name?.trim() ?? '');
          const token = typeof row.total_token === 'number' ? row.total_token : 0;
          setProfileTotalToken(token);
          onTotalTokenFromProfile?.(token);
          setProfileRewardsCount(typeof row.rewards_count === 'number' ? row.rewards_count : 0);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setProfileLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl, activeSub?.number, activeSubIndex]);

  const handleLogout = () => { localStorage.clear(); window.location.reload(); };
  const copyToClipboard = (text: string) => { 
    navigator.clipboard.writeText(text); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2500); 
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-16">
      
      
      <div className="bg-white rounded-[28px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-slate-100 space-y-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="relative">
            <div className="w-24 h-24 md:w-40 md:h-40 bg-slate-100 rounded-[24px] md:rounded-[40px] border border-slate-200 shadow-xl flex items-center justify-center text-slate-300 overflow-hidden">
              <UserCircle2 className="w-16 h-16 md:w-28 md:h-28" strokeWidth={1} />
            </div>
            <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-orange-500 w-8 h-8 md:w-12 md:h-12 rounded-xl border-2 md:border-4 border-white flex items-center justify-center text-white shadow-lg">
              <Check size={16} md:size={24} />
            </div>
          </div>
          <div className="text-center md:text-right space-y-2 flex-grow">
            <h2 className="flex min-h-[2.5rem] items-center justify-center text-2xl font-black tracking-wide text-slate-800 md:min-h-[3rem] md:justify-start md:text-4xl">
              {profileLoading ? (
                <Loader2 className="h-9 w-9 shrink-0 animate-spin text-orange-500 md:h-11 md:w-11" aria-hidden />
              ) : profileMobNo ? (
                toPersianDigits(profileMobNo)
              ) : (
                '—'
              )}
            </h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] md:text-xs font-black border border-blue-100">کاربر فعال گازیوم</span>
              {profileCityName ? (
                <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] md:text-xs font-black border border-slate-100">
                  {profileCityName}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        
        <div className="bg-slate-50/50 rounded-3xl p-4 md:p-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs md:text-sm font-black text-slate-500 flex items-center gap-2"><Hash size={16} /> مدیریت اشتراک‌های فعال</h3>
            <button onClick={() => setShowAddModal(true)} className="text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 hover:bg-blue-50 transition-all"><Plus size={14} /> افزودن جدید</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subscriptions.map((sub, idx) => (
              <div 
                key={sub.number} 
                onClick={() => onSwitchSub(idx)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  idx === activeSubIndex ? 'bg-white border-orange-200 shadow-md scale-[1.02]' : 'bg-white/50 border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${idx === activeSubIndex ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Hash size={18} />
                  </div>
                  <div className="text-right truncate">
                    <span className={`text-xs font-black block truncate ${idx === activeSubIndex ? 'text-slate-800' : 'text-slate-500'}`}>{sub.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{toPersianDigits(sub.number)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {idx === activeSubIndex ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveSub(idx); }} 
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        
        
        <div className="lg:col-span-5 space-y-6">
          {profileLoading ? (
            <SectionLoader
              className="rounded-[28px] border border-slate-100 bg-white md:rounded-[40px]"
              minClassName="min-h-[16rem]"
              label="در حال دریافت امتیاز و کد دعوت…"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button onClick={onWalletClick} className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center gap-3 md:gap-6 group text-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-50 text-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0"><Coins size={24} md:size={32} /></div>
                  <div className="space-y-0.5 md:space-y-1">
                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">امتیازهای من</span>
                    <div className="text-sm md:text-xl font-black text-slate-800">
                      {toPersianDigits(profileTotalToken.toLocaleString('en-US'))}
                    </div>
                  </div>
                </button>
                <button onClick={onMyRewardsClick} className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center gap-3 md:gap-6 group text-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0"><Gift size={24} md:size={32} /></div>
                  <div className="space-y-0.5 md:space-y-1">
                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">جوایز دریافتی</span>
                    <div className="text-sm md:text-xl font-black text-slate-800">
                      {toPersianDigits(profileRewardsCount)} مورد
                    </div>
                  </div>
                </button>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[28px] md:rounded-[40px] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-all duration-1000"></div>
                <div className="relative z-10 space-y-4 md:space-y-6 text-right">
                  <div className="space-y-1">
                    <h3 className="text-base md:text-xl font-black flex items-center gap-2 md:gap-3"><Share2 size={18} md:size={24} /> دعوت از دوستان</h3>
                    <p className="text-[10px] md:text-sm opacity-70 font-bold">{toPersianDigits(100)} گازیوم هدیه برای هر دعوت</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 flex justify-between items-center border border-white/20 gap-2">
                    <span className="text-lg md:text-2xl font-black tracking-widest break-all text-left dir-ltr">
                      {profileReferCode ? toPersianDigits(profileReferCode) : '—'}
                    </span>
                    <button
                      type="button"
                      disabled={!profileReferCode}
                      onClick={() => profileReferCode && copyToClipboard(profileReferCode)}
                      className={`shrink-0 p-2 md:p-3 rounded-lg md:rounded-xl transition-all disabled:opacity-40 ${
                        copied ? 'bg-green-500' : 'bg-white text-indigo-700'
                      }`}
                    >
                      {copied ? <Check size={16} md:size={20} /> : <Copy size={16} md:size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base md:text-xl font-black text-slate-800 flex items-center gap-2 md:gap-3 px-1"><Settings size={20} md:size={24} className="text-slate-400" /> تنظیمات و پشتیبانی</h3>
            <div className="space-y-3">
              <button onClick={onKBClick} className="w-full bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
                <div className="flex items-center gap-4 text-right">
                  <div className="p-2 md:p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500"><HelpCircle size={20} md:size={24} /></div>
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-black text-slate-700">سوالات متداول</span>
                    <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">پاسخ به مشکلات رایج</span>
                  </div>
                </div>
                <ChevronLeft size={16} md:size={20} className="text-slate-200" />
              </button>

              <button onClick={handleLogout} className="w-full bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
                <div className="flex items-center gap-4 text-right">
                  <div className="p-2 md:p-3 bg-red-50 rounded-xl text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all"><LogOut size={20} md:size={24} /></div>
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-black text-red-600">خروج از حساب</span>
                    <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">پایان نشست فعلی</span>
                  </div>
                </div>
                <ChevronLeft size={16} md:size={20} className="text-slate-200" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-10 pb-6 flex flex-col items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
          <span>تولید شده با</span>
          <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
          <span>تو شرکت فناوران پیشرو</span>
        </div>
        <div className="w-10 h-0.5 bg-slate-200 rounded-full"></div>
      </div>

      
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg min-h-0 flex flex-col overflow-hidden rounded-[32px] md:rounded-[40px] shadow-2xl animate-in zoom-in duration-300 relative text-right max-h-[min(92vh,100dvh-1.5rem)]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 left-6 md:top-8 md:left-8 text-slate-300 hover:text-slate-900 transition-colors z-20"
            >
              <X size={24} md:size={32} />
            </button>
            <div
              className={`shrink-0 px-8 text-right transition-[padding] duration-200 md:px-12 ${
                addSubSearchResults > 0 ? 'space-y-1 pt-11 pb-1 md:pt-14' : 'space-y-2 pt-14 pb-2 md:pt-16'
              }`}
            >
              <h3
                className={`font-black text-slate-900 ${
                  addSubSearchResults > 0 ? 'text-lg md:text-2xl' : 'text-xl md:text-3xl'
                }`}
              >
                افزودن اشتراک جدید
              </h3>
              {addSubSearchResults === 0 && (
                <p className="text-xs text-slate-400 font-bold">جستجو با شماره اشتراک، شناسه قبض یا کد پستی</p>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-8 pb-6 md:px-12 md:pb-10">
              <AddSubscriptionFlow
                baseUrl={wsBaseUrl}
                variant="modal"
                defaultExpanded={false}
                onResultsChange={setAddSubSearchResults}
                onSuccess={(num, name) => {
                  onAddSub({ number: num, name });
                  setShowAddModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
