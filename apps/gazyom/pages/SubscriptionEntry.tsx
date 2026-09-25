
import React from 'react';
import { Hash, Info } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import AddSubscriptionFlow from '../components/AddSubscriptionFlow';

interface SubscriptionEntryProps {
  baseUrl: string;
  onSuccess: (subNumber: string, name: string) => void;
}

const SubscriptionEntry: React.FC<SubscriptionEntryProps> = ({ baseUrl, onSuccess }) => {
  return (
    <div className="fixed inset-0 z-[90] flex min-h-0 flex-col overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-5 sm:p-8">
        <div className="shrink-0 text-center space-y-3 sm:space-y-4">
          <div className="w-20 h-20 bg-orange-100 rounded-[20px] flex items-center justify-center text-orange-500 mx-auto shadow-lg shadow-orange-50">
            <Hash size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">ورود به گازیوم</h2>
          <p className="text-sm text-slate-400 font-bold leading-relaxed px-2 sm:px-4">
            اشتراک خود را با شماره اشتراک، شناسه قبض یا کد پستی پیدا کنید و به تحلیل مصرف اضافه کنید.
          </p>
        </div>

        <div className="shrink-0 rounded-[12px] border border-blue-100 bg-blue-50 px-3 py-2.5 flex gap-2 sm:rounded-[15px] sm:p-4">
          <Info className="text-blue-500 shrink-0" size={18} />
          <p className="text-[10px] text-blue-700 leading-relaxed font-bold">
            فقط یکی از فیلدهای جستجو را پر کنید؛ کد پستی باید {toPersianDigits(10)} رقم باشد.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
          <AddSubscriptionFlow
            baseUrl={baseUrl}
            variant="page"
            defaultExpanded
            onSuccess={onSuccess}
          />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center sm:px-8">
        <span className="text-[10px] text-slate-300 font-bold">شرکت ملی گاز ایران - پویش سراسری گازیوم</span>
      </div>
    </div>
  );
};

export default SubscriptionEntry;
