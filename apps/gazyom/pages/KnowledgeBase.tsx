
import React, { useState, useEffect } from 'react';
import { ChevronRight, Search, Plus, Minus, HelpCircle } from 'lucide-react';
import { fetchGetFaq, type FaqItem } from '../services/wsOptimizeApi';
import { faqListHourRead, faqListHourWrite } from '../services/dataRefreshCache';
import { SectionLoader } from '../components/SectionLoader';

const KnowledgeBase: React.FC<{ onBack: () => void; wsBaseUrl?: string }> = ({ onBack, wsBaseUrl }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!wsBaseUrl) {
      setFaqs([]);
      setLoadError('آدرس سرویس تنظیم نشده است.');
      return;
    }
    const cached = faqListHourRead<FaqItem[]>(wsBaseUrl);
    if (cached) {
      setFaqs(cached);
      setLoadError(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setLoadError(null);
    fetchGetFaq(wsBaseUrl, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setLoadError(res.message);
          setFaqs([]);
          return;
        }
        faqListHourWrite(wsBaseUrl, res.items);
        setFaqs(res.items);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setLoadError('خطا در دریافت سوالات متداول');
        setFaqs([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl]);

  const filteredFaqs = faqs.filter(
    (item) =>
      item.question.includes(searchQuery) ||
      item.answer.includes(searchQuery) ||
      item.category.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 bg-slate-50 z-[80] overflow-y-auto animate-in slide-in-from-left duration-500">
      <header className="p-6 flex items-center gap-4 bg-white border-b border-slate-100 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 bg-slate-50 rounded-[7px] active:scale-90 transition-all">
          <ChevronRight size={20} />
        </button>
        <h2 className="text-lg font-black">پایگاه دانش و سوالات</h2>
      </header>

      <div className="p-6 space-y-6">
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="جستجوی سوال یا کلمه کلیدی..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-[7px] py-4 pr-12 pl-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
          <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-800 pr-1">سوالات پرتکرار</h3>
          {loading ? (
            <SectionLoader
              className="rounded-[7px] border border-slate-100 bg-white"
              minClassName="min-h-[12rem]"
              label="در حال بارگذاری سوالات متداول…"
            />
          ) : loadError ? (
            <div className="text-center py-12 px-4">
              <HelpCircle size={40} className="mx-auto text-red-200 mb-3" />
              <p className="text-sm font-bold text-red-500">{loadError}</p>
            </div>
          ) : (
            filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white border border-slate-100 rounded-[7px] overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenId((id) => (id === faq.id ? null : faq.id))}
                  className="w-full p-4 flex justify-between items-center text-right gap-4 active:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-1 min-w-0">
                    <span className="text-[8px] font-black text-orange-500 px-2 py-0.5 bg-orange-50 rounded-[4px] shrink-0">
                      {faq.category}
                    </span>
                    <span className="text-[11px] font-black text-slate-700 leading-relaxed">{faq.question}</span>
                  </div>
                  <div className="shrink-0 text-slate-300">
                    {openId === faq.id ? <Minus size={18} /> : <Plus size={18} />}
                  </div>
                </button>

                {openId === faq.id && faq.answer ? (
                  <div className="p-4 pt-0 text-[10px] font-bold text-slate-500 leading-relaxed border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    {faq.answer}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        {!loading && !loadError && filteredFaqs.length === 0 && (
          <div className="text-center py-20">
            <HelpCircle size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-sm font-bold text-slate-400">
              {searchQuery.trim() ? 'نتیجه‌ای برای جستجوی شما پیدا نشد.' : 'سوالی برای نمایش ثبت نشده است.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
