import React, { useEffect, useState } from 'react';
import { ChevronRight, Mail, Gift, CheckCircle2, Clock, ChevronLeft } from 'lucide-react';
import type { EducationMessage } from '../types';
import { SectionLoader } from '../components/SectionLoader';
import { toPersianDigits } from '../services/geminiService';
import { loadInbox, markMessageRead, readMessageIds, subscribeInboxRead } from '../services/inbox';
import { loadActivity } from '../services/activity';

const Inbox: React.FC<{
  onBack: () => void;
  wsBaseUrl: string;
  keyNo: string;
  onOpen: (item: EducationMessage) => void;
}> = ({ onBack, wsBaseUrl, keyNo, onOpen }) => {
  const [items, setItems] = useState<EducationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [readIds, setReadIds] = useState(() => readMessageIds(keyNo));
  const [claimedTitles, setClaimedTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError('');
    loadInbox(wsBaseUrl, keyNo).then((res) => {
      if (!alive) return;
      if (res.ok === false) {
        setLoadError(res.message);
        setItems([]);
      } else {
        setItems(res.items);
      }
      setLoading(false);
    });
    loadActivity(wsBaseUrl, keyNo).then((a) => alive && a && setClaimedTitles(a.claimedTitles));
    setReadIds(readMessageIds(keyNo));
    const off = subscribeInboxRead(() => setReadIds(readMessageIds(keyNo)));
    return () => {
      alive = false;
      off();
    };
  }, [wsBaseUrl, keyNo]);

  const open = (item: EducationMessage) => {
    markMessageRead(keyNo, item.id);
    onOpen(item);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[70] overflow-y-auto animate-in slide-in-from-left duration-500">
      <header className="p-6 flex items-center gap-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-[7px] active:scale-90 transition-all"><ChevronRight size={20} /></button>
        <h2 className="text-lg font-black">پیام‌های من</h2>
      </header>

      <div className="p-6 max-w-3xl mx-auto space-y-3">
        {loading ? (
          <SectionLoader className="rounded-[7px] border border-slate-100 bg-white" minClassName="min-h-[14rem]" label="در حال دریافت پیام‌ها…" />
        ) : loadError ? (
          <p className="text-center text-sm font-bold text-slate-500 px-4 py-16">{loadError}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Mail size={40} />
            </div>
            <p className="text-sm font-bold text-slate-400">پیامی برای شما نیست.</p>
          </div>
        ) : (
          items.map((item) => {
            const unread = !readIds.has(item.id);
            const claimed = claimedTitles.has(item.title.trim());
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item)}
                className={`w-full text-right bg-white rounded-2xl border p-4 flex items-start gap-3 shadow-sm active:scale-[0.99] transition-all ${
                  unread ? 'border-orange-200' : 'border-slate-100'
                }`}
              >
                <div className={`relative w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${unread ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
                  <Mail size={20} />
                  {unread && <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" aria-label="خوانده‌نشده" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm leading-snug flex-1 min-w-0 ${unread ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{item.title}</h3>
                    {item.isPersonal && (
                      <span className="shrink-0 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">اختصاصی</span>
                    )}
                  </div>
                  {item.text?.trim() && <p className="text-[11px] font-medium text-slate-500 leading-relaxed line-clamp-2">{item.text}</p>}
                  <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-slate-400">
                    {item.dateJalali && (
                      <span className="flex items-center gap-1"><Clock size={11} />{toPersianDigits(item.dateJalali)}</span>
                    )}
                    {item.tokenReward > 0 &&
                      (claimed ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={11} />امتیازش گرفته شد</span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-500"><Gift size={11} />+{toPersianDigits(item.tokenReward)} گازیوم</span>
                      ))}
                  </div>
                </div>
                <ChevronLeft size={16} className="shrink-0 text-slate-300 self-center" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Inbox;
