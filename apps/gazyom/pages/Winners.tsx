import React, { useEffect, useState } from 'react';
import { ChevronRight, Trophy, Calendar } from 'lucide-react';
import { SectionLoader } from '../components/SectionLoader';
import { toPersianDigits } from '../services/geminiService';
import { REWARD_PLACEHOLDER, fallbackTo } from '../services/media';
import { fetchWinners, type Winner } from '../services/winners';

const Winners: React.FC<{
  onBack: () => void;
  province: string;
}> = ({ onBack, province }) => {
  const [items, setItems] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setLoadError('');
    fetchWinners(province, ac.signal)
      .then((res) => {
        if (res.ok === false) {
          setLoadError(res.message);
          setItems([]);
          return;
        }
        setItems(res.items);
      })
      .catch(() => {
        // aborted: the page was closed
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [province]);

  return (
    <div className="fixed inset-0 bg-slate-50 z-[70] overflow-y-auto animate-in slide-in-from-left duration-500">
      <header className="p-6 flex items-center gap-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-[7px] active:scale-90 transition-all"><ChevronRight size={20} /></button>
        <h2 className="text-lg font-black">برندگان جوایز</h2>
      </header>

      <div className="p-6 max-w-5xl mx-auto">
        {loading ? (
          <SectionLoader
            className="rounded-[7px] border border-slate-100 bg-white"
            minClassName="min-h-[14rem]"
            label="در حال بارگذاری برندگان…"
          />
        ) : loadError ? (
          <p className="text-center text-sm font-bold text-slate-500 px-4 py-16">{loadError}</p>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((item) => (
              <article key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
                <img
                  src={item.image || REWARD_PLACEHOLDER}
                  alt=""
                  loading="lazy"
                  onError={fallbackTo(REWARD_PLACEHOLDER)}
                  className="w-full aspect-[4/3] object-cover bg-slate-100"
                />
                <div className="p-5 flex flex-col gap-2">
                  <h3 className="text-sm md:text-base font-black text-slate-800 leading-snug">{toPersianDigits(item.title)}</h3>
                  {item.text && (
                    <p className="text-xs md:text-sm font-bold text-slate-500 leading-7 whitespace-pre-line">{toPersianDigits(item.text)}</p>
                  )}
                  {item.date && (
                    <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-50 text-[10px] font-bold text-slate-400">
                      <Calendar size={12} className="shrink-0" />
                      <span>{toPersianDigits(item.date)}</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Trophy size={40} />
            </div>
            <p className="text-sm font-bold text-slate-400">هنوز برنده‌ای اعلام نشده است.</p>
            <p className="text-xs font-bold text-slate-300">برندگان جوایز بعد از اعلام نتایج همین‌جا نمایش داده می‌شوند.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Winners;
