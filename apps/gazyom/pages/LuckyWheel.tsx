
import React, { useState, useRef, useEffect } from 'react';
import { Flame, Sparkles, AlertCircle, TrendingUp, Lock } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import { spinLuckyWheel } from '../services/wsOptimizeApi';


const PRIZES = [10, 20, 50, 100, 200, 300, 400, 500];

const SPIN_MS = 7500;
const FULL_SPINS = 12;

const flameColors = [
  '#6366F1',
  '#8B5CF6',
  '#D946EF',
  '#F43F5E',
  '#FB923C',
  '#FACC15',
  '#4ADE80',
  '#2DD4BF',
];

interface LuckyWheelProps {
  wsBaseUrl: string;
  keyNo: string | number;
  
  onWin?: (amount: number) => void;
}

const LuckyWheel: React.FC<LuckyWheelProps> = ({ wsBaseUrl, keyNo, onWin }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [hasAlreadySpun, setHasAlreadySpun] = useState(false);
  const [spinError, setSpinError] = useState('');
  const [lockHint, setLockHint] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const canRequest = Boolean(wsBaseUrl && String(keyNo).trim());
  const segmentDeg = 360 / PRIZES.length;

  const spin = async () => {
    if (isSpinning || hasAlreadySpun || !canRequest) return;

    setSpinError('');
    setIsSpinning(true);
    setResult(null);

    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }

    let res: Awaited<ReturnType<typeof spinLuckyWheel>>;
    try {
      res = await spinLuckyWheel(wsBaseUrl, { keyNo });
    } catch {
      setIsSpinning(false);
      setSpinError('خطا در ارتباط با سرور');
      return;
    }

    if (res.ok === false) {
      setIsSpinning(false);
      if (res.type === 'alreadyPlayed') {
        setHasAlreadySpun(true);
        setLockHint(res.message);
      } else {
        setSpinError(res.message);
      }
      return;
    }

    const amount = res.amount;
    const segIdx = PRIZES.indexOf(amount);
    const winningIndex = segIdx >= 0 ? segIdx : 0;
    const extraRotation = 360 - (winningIndex * segmentDeg + segmentDeg / 2);
    const totalRotation = FULL_SPINS * 360 + extraRotation;

    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${SPIN_MS / 1000}s cubic-bezier(0.1, 0, 0, 1)`;
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    spinTimerRef.current = setTimeout(() => {
      spinTimerRef.current = null;
      setIsSpinning(false);
      setResult(amount);
      setHasAlreadySpun(true);
      onWin?.(amount);
    }, SPIN_MS);
  };

  const showLockout = hasAlreadySpun && !isSpinning && !result;

  return (
    <div className="relative flex min-h-screen flex-col items-center space-y-12 overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] px-6 pb-20 pt-12 animate-in fade-in duration-1000 -mx-4 -mt-6">
      <div className="pointer-events-none absolute -left-20 top-20 h-80 w-80 animate-pulse rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 bottom-40 h-80 w-80 animate-pulse rounded-full bg-purple-500/20 blur-[120px] delay-700" />

      <div className="z-10 space-y-4 text-center">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-[7px] border border-white/10 bg-white/10 px-5 py-2 text-[10px] font-black text-cyan-400 shadow-2xl backdrop-blur-md">
          <Sparkles size={14} className="animate-spin-slow" />
          شانس جادویی امروز
        </div>
        <h2 className="text-4xl font-black text-white drop-shadow-2xl">گردونه گازیوم</h2>
        <p className="text-sm font-bold text-slate-300 opacity-80">چرخش از طریق سرور ثبت می‌شود؛ جایزه واقعی همان عدد اعلام‌شده است.</p>
      </div>

      <div className="relative z-10 flex h-80 w-80 items-center justify-center group">
        <div className="absolute -top-6 left-1/2 z-30 -translate-x-1/2 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
          <div className="flex h-16 w-12 items-center justify-center rounded-b-[7px] bg-white pt-4 shadow-2xl">
            <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-indigo-600" />
          </div>
        </div>

        <div className="absolute inset-0 scale-110 animate-pulse rounded-full bg-cyan-400/20 blur-xl" />

        <div
          ref={wheelRef}
          className="relative h-full w-full overflow-hidden rounded-full border-[12px] border-white/10 bg-[#0f172a] shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-all"
        >
          {PRIZES.map((val, i) => (
            <div
              key={val}
              className="absolute h-full w-full"
              style={{
                transform: `rotate(${i * segmentDeg}deg)`,
                transformOrigin: '50% 50%',
                background: `conic-gradient(from 157.5deg, ${flameColors[i]}22 0deg, ${flameColors[i]} 22.5deg, ${flameColors[i]}22 45deg, transparent 45deg)`,
              }}
            >
              <div className="absolute left-1/2 top-8 flex -translate-x-1/2 flex-col items-center gap-1 text-sm font-black text-white drop-shadow-md">
                <span className="text-lg">{toPersianDigits(val)}</span>
                <Flame size={10} fill="currentColor" className="opacity-50" />
              </div>
            </div>
          ))}

          <div className="absolute inset-0 z-20 m-auto flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-xl">
            <div className="relative">
              <div className="absolute h-10 w-10 animate-ping rounded-full bg-cyan-500 blur-xl" />
              <div className="relative z-30 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg">
                <TrendingUp size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="z-10 w-full max-w-xs space-y-6 px-4">
        {!canRequest ? (
          <p className="rounded-[7px] border border-white/10 bg-white/5 p-4 text-center text-xs font-bold text-amber-200">
            اشتراک یا آدرس سرویس نامعتبر است. از منوی جوایز دوباره وارد شوید.
          </p>
        ) : null}

        {showLockout ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 rounded-[7px] border border-white/10 bg-white/5 p-6 text-center duration-500 backdrop-blur-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[7px] bg-orange-500/20 text-orange-400">
              <Lock size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">امروز دیگر نوبت گردونه ندارید</h4>
              <p className="mt-2 text-[10px] font-bold leading-relaxed text-slate-400">
                {lockHint ||
                  'هر روز فقط یک بار می‌توانید از گردونه جادویی استفاده کنید. فردا دوباره منتظر شما هستیم!'}
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void spin()}
            disabled={isSpinning || !canRequest}
            className={`flex w-full items-center justify-center gap-3 rounded-[7px] border-b-4 py-5 text-xl font-black shadow-[0_20px_40px_rgba(34,211,238,0.2)] transition-all active:scale-95 ${
              isSpinning || !canRequest
                ? 'cursor-not-allowed border-white/5 bg-white/10 text-slate-500'
                : 'border-blue-700 bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
            }`}
          >
            {!isSpinning && <Sparkles size={22} />}
            {isSpinning ? 'در حال چرخش و ثبت روی سرور…' : 'چرخش جادویی'}
          </button>
        )}

        {spinError ? (
          <p className="rounded-[7px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-xs font-bold text-red-200">{spinError}</p>
        ) : null}

        {result !== null ? (
          <div className="relative w-full animate-in zoom-in overflow-hidden rounded-[7px] bg-white p-8 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] duration-300">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-orange-50 to-transparent opacity-50" />
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">شما برنده شدید</div>
            <div className="mb-3 flex items-center justify-center gap-2 text-6xl font-black text-orange-500">
              {toPersianDigits(result)}
              <span className="text-xs font-bold text-slate-400">گازیوم</span>
            </div>
            <p className="mb-6 text-[10px] font-bold leading-relaxed text-slate-500">
              جایزه روی حساب شما ثبت شد؛ ماندهٔ امتیاز در اپ به‌روز می‌شود.
            </p>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="relative z-10 w-full rounded-[7px] bg-slate-900 py-4 text-xs font-black text-white transition-all active:scale-90"
            >
              متوجه شدم، ممنون!
            </button>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-[7px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-cyan-400" />
          <p className="text-[10px] font-bold leading-relaxed text-slate-300 opacity-70">
            نتیجهٔ هر چرخش فقط از سرویس گردونه تعیین می‌شود؛ با تداوم صرفه‌جویی در مصرف، فردا دوباره شانس دارید.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LuckyWheel;
