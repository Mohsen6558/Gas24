
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Bookmark, Clock, CheckCircle2, Gift, Lock, BookOpen, Loader2 } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import type { EducationMessage } from '../types';
import { fetchGetMessages, claimMessageToken, sortEducationMessagesVideoFirst } from '../services/wsOptimizeApi';
import { educationMessagesHourRead, educationMessagesHourWrite } from '../services/dataRefreshCache';
import { SectionLoader } from '../components/SectionLoader';
import {
  isEducationBookmarked,
  subscribeEducationBookmarks,
  toggleEducationBookmark,
} from '../services/educationBookmarks';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1473186578172-c141e6798ee4?auto=format&fit=crop&q=80&w=1200';

function claimStorageKey(keyNo: string | number, messageId: number) {
  return `gazyom_msg_claimed_${String(keyNo)}_${messageId}`;
}

function youtubeEmbedSrc(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u, 'https://youtu.be');
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

interface EducationDetailProps {
  item: EducationMessage;
  wsBaseUrl: string;
  keyNo: string | number;
  onBack: () => void;
  onItemSelect: (item: EducationMessage) => void;
  onClaimSuccess?: (addedToken: number) => void;
}

const EducationDetail: React.FC<EducationDetailProps> = ({
  item,
  wsBaseUrl,
  keyNo,
  onBack,
  onItemSelect,
  onClaimSuccess,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [related, setRelated] = useState<EducationMessage[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const isVideo = Boolean(item.videoUrl?.trim());
  const thumb = item.imageUrl?.trim() || PLACEHOLDER;
  const yt = item.videoUrl ? youtubeEmbedSrc(item.videoUrl) : null;
  const hasReward = item.tokenReward > 0;

  useEffect(() => {
    setIsBookmarked(isEducationBookmarked(item.id));
    return subscribeEducationBookmarks(() => {
      setIsBookmarked(isEducationBookmarked(item.id));
    });
  }, [item.id]);

  useEffect(() => {
    setClaimError('');
    setClaimedAmount(0);
    const stored = localStorage.getItem(claimStorageKey(keyNo, item.id)) === '1';

    if (!hasReward) {
      setClaimed(false);
      setTimeLeft(0);
      return;
    }

    if (stored) {
      setClaimed(true);
      setTimeLeft(0);
      setClaimedAmount(item.tokenReward);
      return;
    }

    setClaimed(false);
    const sec = item.durationSec > 0 ? item.durationSec : 60;
    setTimeLeft(sec);

    const t = setInterval(() => {
      setTimeLeft((p) => (p <= 1 ? 0 : p - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [item.id, keyNo, hasReward, item.durationSec]);

  useEffect(() => {
    if (!wsBaseUrl) {
      setRelatedLoading(false);
      return;
    }
    const cached = educationMessagesHourRead<EducationMessage[]>(wsBaseUrl);
    if (cached) {
      const others = cached.filter((m) => m.id !== item.id);
      setRelated(sortEducationMessagesVideoFirst(others).slice(0, 4));
      setRelatedLoading(false);
      return;
    }
    const ac = new AbortController();
    setRelatedLoading(true);
    fetchGetMessages(wsBaseUrl, { type: 0 }, { signal: ac.signal })
      .then((res) => {
        if (res.ok === false) {
          setRelated([]);
          return;
        }
        const sorted = sortEducationMessagesVideoFirst(res.items);
        educationMessagesHourWrite(wsBaseUrl, sorted);
        const others = sorted.filter((m) => m.id !== item.id);
        setRelated(others.slice(0, 4));
      })
      .catch(() => setRelated([]))
      .finally(() => {
        if (!ac.signal.aborted) setRelatedLoading(false);
      });
    return () => ac.abort();
  }, [wsBaseUrl, item.id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const secStr = secs < 10 ? `0${secs}` : String(secs);
    return `${toPersianDigits(mins)}:${toPersianDigits(secStr)}`;
  };

  const handleClaim = useCallback(async () => {
    if (!wsBaseUrl || claiming || claimed || timeLeft > 0) return;
    setClaiming(true);
    setClaimError('');
    try {
      const res = await claimMessageToken(wsBaseUrl, { keyNo, messageId: item.id });
      if (res.ok === false) {
        if (res.type === 'alreadyClaimed') {
          localStorage.setItem(claimStorageKey(keyNo, item.id), '1');
          setClaimed(true);
          setClaimedAmount(item.tokenReward);
          setClaimError('');
          return;
        }
        setClaimError(res.message);
        return;
      }
      localStorage.setItem(claimStorageKey(keyNo, item.id), '1');
      setClaimed(true);
      const added = res.addedToken > 0 ? res.addedToken : item.tokenReward;
      setClaimedAmount(added);
      if (res.addedToken > 0) {
        onClaimSuccess?.(res.addedToken);
      }
    } catch {
      setClaimError('خطا در ارتباط با سرور');
    } finally {
      setClaiming(false);
    }
  }, [wsBaseUrl, keyNo, item.id, item.tokenReward, claiming, claimed, timeLeft, onClaimSuccess]);

  const subline = [item.category, item.typeLabel, item.dateJalali].filter(Boolean).join(' • ');

  return (
    <div className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-in fade-in duration-500">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl md:rounded-2xl hover:bg-slate-100 transition-all shrink-0"
          >
            <ArrowRight size={20} />
          </button>
          <div className="hidden md:block min-w-0">
            <h2 className="text-xl font-black text-slate-800 truncate">{item.title}</h2>
            <span className="text-xs font-bold text-slate-400">{subline}</span>
          </div>
          <div className="md:hidden min-w-0">
            <h2 className="text-sm font-black text-slate-800 line-clamp-1">{item.title}</h2>
          </div>
        </div>
        <button
          type="button"
          aria-label={isBookmarked ? 'حذف از نشان‌شده‌ها' : 'نشان‌گذاری'}
          onClick={() => setIsBookmarked(toggleEducationBookmark(item.id))}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all md:h-12 md:w-12 ${
            isBookmarked ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
          }`}
        >
          <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          <div className="lg:col-span-8 space-y-8">
            {isVideo ? (
              yt ? (
                <div className="relative aspect-video bg-slate-900 rounded-[28px] md:rounded-[40px] overflow-hidden shadow-2xl">
                  <iframe
                    title={item.title}
                    src={yt}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="relative group aspect-video bg-slate-900 rounded-[28px] md:rounded-[40px] overflow-hidden shadow-2xl">
                  <video
                    className="w-full h-full object-contain bg-black"
                    poster={thumb}
                    controls
                    src={item.videoUrl}
                    playsInline
                  />
                </div>
              )
            ) : null}

            {!isVideo ? (
              <div className="rounded-[28px] md:rounded-[40px] overflow-hidden aspect-video md:h-[500px] shadow-2xl border border-slate-100 group relative">
                <img src={thumb} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={item.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              </div>
            ) : null}

            <article className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                  <BookOpen size={20} className="md:w-7 md:h-7" />
                </div>
                <h1 className="text-xl md:text-5xl font-black text-slate-900 leading-tight">{item.title}</h1>
              </div>
              <div className="max-w-none text-justify text-slate-600 font-medium leading-relaxed md:leading-[2.2] text-sm md:text-lg whitespace-pre-wrap">
                {item.text?.trim() ? item.text : 'متن این آموزش از سمت سرور ثبت نشده است.'}
              </div>
            </article>

            {hasReward ? (
              <div className="pt-6 md:pt-10 space-y-3">
                {claimError ? (
                  <p className="text-center text-sm font-bold text-red-500">{claimError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (claimed) return;
                    if (timeLeft > 0) return;
                    void handleClaim();
                  }}
                  disabled={claiming || (!claimed && timeLeft > 0)}
                  className={`w-full py-5 md:py-8 rounded-2xl md:rounded-3xl font-black text-base md:text-xl shadow-2xl transition-all flex flex-col items-center justify-center gap-2 md:gap-3 ${
                    claimed
                      ? 'bg-green-600 text-white'
                      : timeLeft > 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {claiming ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        در حال ثبت…
                      </>
                    ) : claimed ? (
                      <>
                        <CheckCircle2 size={24} />
                        <span className="text-center leading-snug">
                          امتیاز دریافت شد
                          {claimedAmount > 0 ? (
                            <span className="block text-sm font-black opacity-90 mt-1">
                              +{toPersianDigits(claimedAmount)} گازیوم
                            </span>
                          ) : null}
                        </span>
                      </>
                    ) : timeLeft > 0 ? (
                      <>
                        <Lock size={24} />
                        مشاهده آموزش… ({formatTime(timeLeft)})
                      </>
                    ) : (
                      <>
                        <Gift size={24} />
                        دریافت جایزه ({toPersianDigits(item.tokenReward)} گازیوم)
                      </>
                    )}
                  </div>
                </button>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-4 space-y-10 pb-12">
            <div className="bg-slate-50 p-6 md:p-8 rounded-[32px] md:rounded-[40px] space-y-6 md:space-y-8 lg:sticky lg:top-32">
              <h3 className="text-lg md:text-xl font-black text-slate-800">مطالب پیشنهادی</h3>
              <div className="space-y-4 md:space-y-6">
                {relatedLoading && related.length === 0 ? (
                  <SectionLoader minClassName="min-h-[8rem]" label="در حال دریافت مطالب پیشنهادی…" />
                ) : related.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400 text-center py-6">مورد دیگری نیست.</p>
                ) : (
                  related.map((rel) => {
                    const relThumb = rel.imageUrl?.trim() || PLACEHOLDER;
                    return (
                      <div
                        key={rel.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          onItemSelect(rel);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onItemSelect(rel);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className="flex gap-4 p-3 md:p-4 bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                      >
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden shrink-0">
                          <img src={relThumb} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={rel.title} />
                        </div>
                        <div className="flex flex-col justify-center gap-1 md:gap-2 min-w-0">
                          <span className="text-[8px] md:text-[10px] font-black text-orange-500 uppercase truncate">
                            {rel.category || rel.typeLabel}
                          </span>
                          <h4 className="text-xs md:text-sm font-black text-slate-800 leading-tight line-clamp-2">{rel.title}</h4>
                          {rel.dateJalali ? (
                            <div className="flex items-center gap-2 text-[8px] md:text-[10px] text-slate-400 font-bold">
                              <Clock size={12} />
                              {rel.dateJalali}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationDetail;
