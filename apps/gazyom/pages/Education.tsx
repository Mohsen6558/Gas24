
import React, { useEffect, useState } from 'react';
import { BookOpen, Zap, Thermometer, ShieldCheck, PlayCircle, Bookmark } from 'lucide-react';
import type { EducationMessage } from '../types';
import { fetchGetMessages, sortEducationMessagesVideoFirst } from '../services/wsOptimizeApi';
import { educationMessagesHourRead, educationMessagesHourWrite } from '../services/dataRefreshCache';
import {
  getEducationBookmarkIds,
  subscribeEducationBookmarks,
  toggleEducationBookmark,
} from '../services/educationBookmarks';
import { toPersianDigits } from '../services/geminiService';
import { SectionLoader } from '../components/SectionLoader';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1473186578172-c141e6798ee4?auto=format&fit=crop&q=80&w=800';

function iconForMessage(iconRaw: string, category: string) {
  const s = `${iconRaw} ${category}`.toLowerCase();
  if (s.includes('video') || s.includes('play') || s.includes('ویدیو')) return <PlayCircle size={18} />;
  if (s.includes('therm') || s.includes('temp') || s.includes('دما')) return <Thermometer size={18} />;
  if (s.includes('shield') || s.includes('ایمن') || s.includes('درز')) return <ShieldCheck size={18} />;
  if (s.includes('zap') || s.includes('برق') || s.includes('پکیج')) return <Zap size={18} />;
  return <BookOpen size={18} />;
}

function levelFromTitle(title: string): 'easy' | 'medium' | 'high' {
  const t = title.length;
  if (t < 28) return 'easy';
  if (t < 48) return 'medium';
  return 'high';
}

interface EducationProps {
  wsBaseUrl: string;
  onItemClick: (item: EducationMessage) => void;
}

const Education: React.FC<EducationProps> = ({ wsBaseUrl, onItemClick }) => {
  const [items, setItems] = useState<EducationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState(() => getEducationBookmarkIds());

  useEffect(() => {
    return subscribeEducationBookmarks(() => setBookmarkedIds(getEducationBookmarkIds()));
  }, []);

  useEffect(() => {
    if (!wsBaseUrl) return;
    const cached = educationMessagesHourRead<EducationMessage[]>(wsBaseUrl);
    if (cached) {
      setItems(cached);
      setError('');
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError('');
    fetchGetMessages(wsBaseUrl, { type: 0 }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setError(res.message);
          setItems([]);
          return;
        }
        const sorted = sortEducationMessagesVideoFirst(res.items);
        educationMessagesHourWrite(wsBaseUrl, sorted);
        setItems(sorted);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setError('خطا در دریافت آموزش‌ها');
        setItems([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex items-center gap-3 px-1">
        <div className="bg-blue-50 text-blue-600 p-2 rounded-[7px]">
          <BookOpen size={20} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">آموزش و بهینه‌سازی</h2>
      </div>

      <p className="text-xs text-slate-400 font-bold leading-relaxed pr-1">
        با یادگیری روش‌های نوین، هم در مصرف گاز صرفه‌جویی کنید و هم سطح گازیوم خود را ارتقا دهید.
      </p>

      {loading ? (
        <SectionLoader
          className="rounded-[7px] border border-slate-100 bg-white"
          minClassName="min-h-[14rem]"
          label="در حال دریافت آموزش‌ها…"
        />
      ) : error ? (
        <p className="text-center text-sm font-bold text-red-500 py-12">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-sm font-bold text-slate-400 py-12">موردی برای نمایش نیست.</p>
      ) : (
        <div className="space-y-6">
          {items.map((item) => {
            const isVideo = Boolean(item.videoUrl?.trim());
            const level = levelFromTitle(item.title);
            const thumb = item.imageUrl?.trim() || PLACEHOLDER;
            const metaParts: string[] = [];
            if (item.typeLabel) metaParts.push(item.typeLabel);
            if (item.category) metaParts.push(item.category);
            if (item.dateJalali) metaParts.push(item.dateJalali);
            const meta = metaParts.join(' • ');
            const bookmarked = bookmarkedIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                className="group bg-white rounded-[7px] shadow-[0_4px_25px_rgb(0,0,0,0.03)] border border-slate-50 overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="relative h-44 w-full shrink-0 bg-slate-100 md:h-48">
                  <img src={thumb} alt={item.title} className="h-full w-full object-cover" />
                  {isVideo ? (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/50 bg-white/30 text-white backdrop-blur-md transition-transform group-hover:scale-110">
                          <PlayCircle size={32} fill="currentColor" className="text-white/80" />
                        </div>
                      </div>
                      {item.durationSec > 0 ? (
                        <div className="absolute bottom-4 right-4 rounded-[4px] bg-black/40 px-3 py-1 text-[9px] font-bold text-white backdrop-blur-sm">
                          {toPersianDigits(item.durationSec)} ثانیه
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2.5 rounded-[7px] shrink-0 ${
                          level === 'easy'
                            ? 'bg-green-50 text-green-600'
                            : level === 'medium'
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {iconForMessage(item.icon, item.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-slate-800 leading-snug">{item.title}</h4>
                        <span className="text-[9px] font-bold text-slate-400 line-clamp-2">{meta}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={bookmarked ? 'حذف از نشان‌شده‌ها' : 'نشان‌گذاری'}
                      className={`rounded-[7px] p-2 transition-colors shrink-0 ${
                        bookmarked
                          ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                          : 'text-slate-300 hover:bg-slate-50 hover:text-orange-500'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEducationBookmark(item.id);
                      }}
                    >
                      <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 font-medium">
                    {item.text?.trim() ? item.text : 'برای مشاهدهٔ جزئیات ضربه بزنید.'}
                  </p>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-50 gap-2">
                    <span className="text-[9px] font-black text-slate-400">
                      {item.tokenReward > 0
                        ? `${toPersianDigits(item.tokenReward)} گازیوم پاداش`
                        : isVideo
                          ? 'ویدیو آموزشی'
                          : 'مقاله'}
                    </span>
                    <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-4 py-2 rounded-[7px]">
                      {isVideo ? 'مشاهده ویدیو' : 'ادامه مطالعه'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Education;
