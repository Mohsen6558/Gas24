import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, UserPlus } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';
import {
  searchSubscription,
  submitNewKeyno,
  type SubscriptionSearchRow,
  toEnglishDigitsOnly,
} from '../services/wsOptimizeApi';

type Variant = 'modal' | 'page';

interface AddSubscriptionFlowProps {
  baseUrl: string;
  onSuccess: (number: string, name: string) => void;
  variant?: Variant;
  
  defaultExpanded?: boolean;
  
  onResultsChange?: (resultCount: number) => void;
}

const MAX_KEYNO = 12;
const MAX_BILL = 13;
const POSTAL_LEN = 10;

const AddSubscriptionFlow: React.FC<AddSubscriptionFlowProps> = ({
  baseUrl,
  onSuccess,
  variant = 'modal',
  defaultExpanded = false,
  onResultsChange,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [alias, setAlias] = useState('');
  const [keyno, setKeyno] = useState('');
  const [billId, setBillId] = useState('');
  const [postal, setPostal] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<SubscriptionSearchRow[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const resultsAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rows.length === 0) return;
    resultsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [rows]);

  useEffect(() => {
    onResultsChange?.(rows.length);
  }, [rows.length, onResultsChange]);

  const accentBtn =
    variant === 'page'
      ? 'bg-orange-500 shadow-orange-100 hover:bg-orange-600'
      : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700';
  const accentSoft =
    variant === 'page' ? 'ring-orange-500/10 focus:ring-orange-500/20' : 'ring-blue-500/10 focus:ring-blue-500/20';
  const accentText = variant === 'page' ? 'text-orange-600' : 'text-blue-600';

  const clearFieldsExcept = (which: 'keyno' | 'bill' | 'post') => {
    if (which !== 'keyno') setKeyno('');
    if (which !== 'bill') setBillId('');
    if (which !== 'post') setPostal('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRows([]);
    setSelectedIdx(null);

    const k = toEnglishDigitsOnly(keyno);
    const b = toEnglishDigitsOnly(billId);
    const p = toEnglishDigitsOnly(postal);

    const filled = [k.length > 0, b.length > 0, p.length > 0].filter(Boolean).length;
    if (filled === 0) {
      setError('یکی از فیلدها را پر کنید');
      return;
    }
    if (filled > 1) {
      setError('فقط یکی از «شماره اشتراک»، «شناسه قبض» یا «کد پستی» را پر کنید');
      return;
    }

    let type: 1 | 2 | 4;
    let data: string;

    if (k.length > 0) {
      type = 1;
      data = k;
      if (data.length < 9 || data.length > 12) {
        setError(`شماره اشتراک باید بین ${toPersianDigits(9)} تا ${toPersianDigits(12)} رقم باشد`);
        return;
      }
    } else if (b.length > 0) {
      type = 2;
      data = b;
      if (data.length < 6 || data.length > 13) {
        setError('شناسه قبض معتبر نیست');
        return;
      }
    } else {
      type = 4;
      data = p;
      if (data.length !== POSTAL_LEN) {
        setError(`کد پستی باید دقیقاً ${toPersianDigits(POSTAL_LEN)} رقم باشد`);
        return;
      }
    }

    setSearching(true);
    try {
      const result = await searchSubscription(baseUrl, { data, type });
      if (result.ok === false) {
        setError(result.message);
        return;
      }
      if (result.rows.length === 0) {
        setError('اشتراکی یافت نشد');
        return;
      }
      setExpanded(false);
      setRows(result.rows);
      setSelectedIdx(result.rows.length === 1 ? 0 : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در جستجو');
    } finally {
      setSearching(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = alias.trim();
    if (!name) {
      setError('نام اشتراک را وارد کنید');
      return;
    }
    if (selectedIdx === null || !rows[selectedIdx]) {
      setError('یکی از نتایج جستجو را انتخاب کنید');
      return;
    }

    const keyNo = rows[selectedIdx].KeyNo;
    setSubmitting(true);
    setError('');
    try {
      const res = await submitNewKeyno(baseUrl, {
        keyNo,
        alias: name,
      });
      if (res.ok === false) {
        setError(res.message);
        return;
      }
      onSuccess(String(keyNo), name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollSection = (
    <>
      <div className={`space-y-1.5 ${variant === 'modal' && rows.length > 0 ? '!space-y-1' : ''}`}>
        <label className="text-[10px] font-black text-slate-400 mr-2">نام اشتراک (مثلاً خانه، محل کار)</label>
        <input
          type="text"
          value={alias}
          onChange={(e) => {
            setAlias(e.target.value);
            setError('');
          }}
          placeholder="نام نمایشی"
          className={`w-full bg-slate-50 border border-slate-100 rounded-[12px] px-4 text-sm font-bold focus:outline-none focus:ring-4 ${accentSoft} transition-all ${
            variant === 'modal' && rows.length > 0 ? 'py-2.5' : 'py-3.5'
          }`}
        />
      </div>

      <div className="border border-slate-100 rounded-[14px] bg-slate-50/50">
        <button
          type="button"
          onClick={() => {
            setExpanded((v) => !v);
            setError('');
          }}
          className={`w-full flex items-center justify-between gap-2 px-4 text-right hover:bg-slate-50 transition-colors ${
            variant === 'modal' && rows.length > 0 ? 'py-2.5' : 'py-3.5'
          }`}
        >
          <span className="text-sm font-black text-slate-700 flex items-center gap-2">
            <UserPlus size={18} className={accentText} />
            افزودن اشتراک
          </span>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-100 bg-white">
            <p className="text-[10px] text-slate-400 font-bold pt-3 leading-relaxed">
              فقط یکی از موارد زیر را پر کنید و جستجو بزنید؛ با تایپ در هر فیلد، بقیه خالی می‌شوند.
            </p>

            <form onSubmit={handleSearch} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 mr-1">شماره اشتراک</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={keyno}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, MAX_KEYNO);
                    setKeyno(v);
                    clearFieldsExcept('keyno');
                    setError('');
                    setRows([]);
                    setSelectedIdx(null);
                  }}
                  placeholder={toPersianDigits('۱۲۳۴۵۶۷۸۹۰')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-3 px-4 text-sm font-black text-center tracking-wide focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 mr-1">شناسه قبض</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={billId}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, MAX_BILL);
                    setBillId(v);
                    clearFieldsExcept('bill');
                    setError('');
                    setRows([]);
                    setSelectedIdx(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-3 px-4 text-sm font-black text-center tracking-wide focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 mr-1">کد پستی</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={postal}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, POSTAL_LEN);
                    setPostal(v);
                    clearFieldsExcept('post');
                    setError('');
                    setRows([]);
                    setSelectedIdx(null);
                  }}
                  placeholder={toPersianDigits('۱۲۳۴۵۶۷۸۹۰')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-3 px-4 text-sm font-black text-center tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <button
                type="submit"
                disabled={searching}
                className={`w-full text-white py-3.5 rounded-[12px] font-black text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${accentBtn}`}
              >
                {searching ? 'در حال جستجو…' : 'جستجو'}
                <Search size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {!expanded && rows.length > 0 && variant === 'page' && (
        <p className="text-[10px] text-slate-400 font-bold text-center px-1 leading-relaxed">
          آکاردئون جستجو بسته شد؛ یک اشتراک را از لیست زیر انتخاب کنید. برای جستجوی دوباره «افزودن اشتراک» را باز کنید.
        </p>
      )}
      {rows.length > 0 && (
        <div ref={resultsAnchorRef} className="space-y-2 scroll-mt-4">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-[11px] font-black text-slate-600">انتخاب اشتراک</p>
            <span className="text-[10px] font-bold text-slate-400 shrink-0">
              {toPersianDigits(rows.length)} مورد
            </span>
          </div>
          <div
            className={`rounded-[14px] border bg-white shadow-sm ${
              variant === 'page' ? 'border-orange-100' : 'border-blue-100'
            }`}
          >
            <ul className="space-y-2 p-2 sm:p-3 [scrollbar-width:thin]">
              {rows.map((row, idx) => {
                const active = selectedIdx === idx;
                return (
                  <li key={`${String(row.KeyNo)}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIdx(idx);
                        setError('');
                      }}
                      className={`w-full text-right rounded-[12px] border p-3 transition-all active:scale-[0.99] ${
                        active
                          ? variant === 'page'
                            ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200'
                            : 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                            active
                              ? variant === 'page'
                                ? 'bg-orange-500 text-white'
                                : 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {toPersianDigits(idx + 1)}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-black text-slate-800 leading-snug">
                            {row.Name?.trim() || '—'}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500">
                            شماره اشتراک: {toPersianDigits(String(row.KeyNo))}
                            {row.Serial != null && row.Serial !== '' && (
                              <span className="text-slate-400">
                                {' '}
                                · سریال کنتور: {toPersianDigits(String(row.Serial))}
                              </span>
                            )}
                          </div>
                          {(row.City || row.Address) && (
                            <div className="text-[10px] font-bold leading-relaxed text-slate-500">
                              {[row.City?.trim(), row.Address?.trim()].filter(Boolean).join(' — ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );

  const footerSection = (
    <>
      {error && <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>}
      <form onSubmit={handleFinalSubmit} className="pt-1">
        <button
          type="submit"
          disabled={submitting || rows.length === 0 || selectedIdx === null}
          className={`w-full text-white py-4 rounded-[12px] font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-40 ${accentBtn}`}
        >
          {submitting ? 'در حال ثبت…' : 'ثبت و افزودن اشتراک'}
        </button>
      </form>
    </>
  );

  const modalScrollGap = rows.length > 0 ? 'space-y-2' : 'space-y-4';

  if (variant === 'modal') {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [scrollbar-gutter:stable] ${modalScrollGap}`}
        >
          {scrollSection}
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white pt-3 shadow-[0_-6px_16px_rgba(15,23,42,0.06)]">
          {footerSection}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 basis-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain pr-0.5 [scrollbar-gutter:stable]">
        {scrollSection}
      </div>
      <div className="mt-1 shrink-0 border-t border-orange-100 bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3">
        {footerSection}
      </div>
    </div>
  );
};

export default AddSubscriptionFlow;
