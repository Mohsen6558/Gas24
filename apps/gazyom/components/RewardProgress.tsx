import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';

// Below this many items left, the card says «فقط N عدد مانده».
const LOW_STOCK = 10;

const fmt = (n: number) => toPersianDigits(Math.round(n).toLocaleString('en-US'));

/** «تمام شد» or «فقط N عدد مانده»; nothing when stock is plenty or unknown. */
export const RewardStockBadge: React.FC<{ stock?: number; className?: string }> = ({ stock, className = '' }) => {
  if (stock == null || stock > LOW_STOCK) return null;
  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-[10px] font-black shadow-sm ${
        stock === 0 ? 'bg-slate-800 text-white' : 'bg-orange-500 text-white'
      } ${className}`}
    >
      {stock === 0 ? 'تمام شد' : `فقط ${toPersianDigits(stock)} عدد مانده`}
    </span>
  );
};

/** How far the customer's balance is from the reward's price; nothing while the balance is unknown. */
export const RewardProgress: React.FC<{ balance: number | null; required: number }> = ({ balance, required }) => {
  if (balance == null || required <= 0) return null;
  if (balance >= required) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black text-green-600">
        <CheckCircle2 size={14} className="shrink-0" />
        امتیاز شما برای این جایزه کافی است
      </div>
    );
  }
  const pct = Math.max(2, Math.min(100, (balance / required) * 100));
  return (
    <div className="space-y-1.5">
      <div
        className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={balance}
      >
        <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] md:text-[11px] font-bold text-slate-500">
        {fmt(required - balance)} گازیوم دیگر تا این جایزه
      </p>
    </div>
  );
};
