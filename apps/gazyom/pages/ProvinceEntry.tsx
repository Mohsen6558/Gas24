import React, { useEffect, useState } from 'react';
import { MapPinned, ShieldCheck, RefreshCw, ChevronRight } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';

interface ProvinceItem {
  name: string;
  baseUrl: string;
}

interface ProvinceEntryProps {
  onSuccess: (baseUrl: string, mobile: string) => void;
  initialStateParam?: string;
  initialRefCode?: string;
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');
const normalizeStateParam = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\.gas24\.ir$/, '')
    .replace(/[^a-z]/g, '');

const toCaptchaSrc = (image: string) => {
  if (image.startsWith('data:image')) return image;
  return `data:image/png;base64,${image}`;
};

const ProvinceEntry: React.FC<ProvinceEntryProps> = ({
  onSuccess,
  initialStateParam = '',
  initialRefCode = '',
}) => {
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [selectedBaseUrl, setSelectedBaseUrl] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  
  const [referralChoice, setReferralChoice] = useState<'none' | 'have'>('none');
  const [referralCode, setReferralCode] = useState('');
  const [referralLocked, setReferralLocked] = useState(false);
  const [preselectedState, setPreselectedState] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [loadingStates, setLoadingStates] = useState(true);
  const [autoEnteredCaptchaStep, setAutoEnteredCaptchaStep] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialStateParam) {
      setPreselectedState(normalizeStateParam(initialStateParam));
    }
    if (initialRefCode) {
      setReferralChoice('have');
      setReferralCode(initialRefCode);
      setReferralLocked(true);
    }
  }, [initialStateParam, initialRefCode]);

  useEffect(() => {
    if (!preselectedState || provinces.length === 0) return;
    const target = provinces.find((p) => {
      const host = normalizeStateParam(
        normalizeBaseUrl(p.baseUrl)
          .replace(/^https?:\/\//, '')
          .split('/')[0]
      );
      return host === preselectedState;
    });
    if (target?.baseUrl) {
      setSelectedBaseUrl(target.baseUrl);
    }
  }, [preselectedState, provinces]);

  useEffect(() => {
    if (autoEnteredCaptchaStep) return;
    if (!preselectedState || !selectedBaseUrl || loadingStates) return;
    if (step !== 1) return;
    setStep(2);
    setError('');
    setAutoEnteredCaptchaStep(true);
  }, [autoEnteredCaptchaStep, loadingStates, preselectedState, selectedBaseUrl, step]);

  useEffect(() => {
    const loadStates = async () => {
      setLoadingStates(true);
      setError('');
      try {
        const response = await fetch('/state.json');
        if (!response.ok) throw new Error('فایل استان ها بارگذاری نشد');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('ساختار state.json معتبر نیست');
        setProvinces(data);
        if (data.length > 0) setSelectedBaseUrl(data[0].baseUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در خواندن لیست استان ها');
      } finally {
        setLoadingStates(false);
      }
    };

    loadStates();
  }, []);

  const fetchCaptcha = async (baseUrl: string) => {
    if (!baseUrl) return;
    setLoadingCaptcha(true);
    setError('');
    try {
      const url = `${normalizeBaseUrl(baseUrl)}/api/index.php/ws-optimize/generate-captcha`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('دریافت کپچا ناموفق بود');
      const data = await response.json();
      if (!data?.image) throw new Error('تصویر کپچا دریافت نشد');
      setCaptchaImage(toCaptchaSrc(data.image));
    } catch (err) {
      setCaptchaImage('');
      setError(err instanceof Error ? err.message : 'خطا در دریافت کپچا');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    if (step !== 2 || !selectedBaseUrl) return;
    fetchCaptcha(selectedBaseUrl);
  }, [step, selectedBaseUrl]);

  const selectedProvinceName =
    provinces.find((p) => p.baseUrl === selectedBaseUrl)?.name ?? '';

  const handleProvinceContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBaseUrl) {
      setError('لطفاً استان را انتخاب کنید');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleBackToProvince = () => {
    setStep(1);
    setCaptchaImage('');
    setCaptchaCode('');
    setOtp('');
    setMobile('');
    setReferralChoice(referralLocked ? 'have' : 'none');
    if (!referralLocked) setReferralCode('');
    setError('');
  };

  const handleBackToMobile = () => {
    setStep(2);
    setOtp('');
    setError('');
  };

  const validateCaptchaUrl = (baseUrl: string) =>
    `${normalizeBaseUrl(baseUrl)}/api/index.php/ws-optimize/validate-captcha`;
  const sendOtpUrl = (baseUrl: string) =>
    `${normalizeBaseUrl(baseUrl)}/api/index.php/ws-optimize/send-otp`;
  const checkOtpUrl = (baseUrl: string) =>
    `${normalizeBaseUrl(baseUrl)}/api/index.php/ws-optimize/check-otp`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBaseUrl) {
      setError('لطفاً استان را انتخاب کنید');
      return;
    }
    if (mobile.length !== 11) {
      setError(`شماره موبایل باید دقیقاً ${toPersianDigits(11)} رقم باشد`);
      return;
    }
    const trimmedCaptcha = captchaCode.trim();
    if (!trimmedCaptcha) {
      setError('کد کپچا را وارد کنید');
      return;
    }

    setSendingOtp(true);
    setError('');
    try {
      const validateRes = await fetch(validateCaptchaUrl(selectedBaseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ code: trimmedCaptcha }),
      });

      let valData: {
        success?: boolean;
        type?: string;
        message?: string;
        msg?: string;
      } | null = null;
      try {
        valData = (await validateRes.json()) as typeof valData;
      } catch {
        valData = null;
      }

      const valErr = valData?.message ?? valData?.msg ?? '';
      if (!validateRes.ok || valData?.success !== true) {
        const t = valData?.type;
        setError(
          valErr ||
            (t === 'empty code'
              ? 'کد کپچا را وارد کنید'
              : 'کد کپچا نامعتبر است. دوباره تلاش کنید.')
        );
        setCaptchaCode('');
        await fetchCaptcha(selectedBaseUrl);
        return;
      }

      const response = await fetch(sendOtpUrl(selectedBaseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ mobNo: mobile, captcha: trimmedCaptcha }),
      });

      let data: {
        Status?: boolean;
        success?: boolean;
        res?: string;
        msg?: string;
        message?: string;
      } | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const errMsg = data?.msg ?? data?.message ?? '';

      if (data?.res === 'CaptchaError') {
        setError(errMsg || 'کد کپچا صحیح نیست');
        setCaptchaCode('');
        await fetchCaptcha(selectedBaseUrl);
        return;
      }

      if (!response.ok || data?.Status === false || data?.success === false) {
        setError(errMsg || 'ارسال کد تأیید ناموفق بود');
        return;
      }

      if (data?.Status === true || data?.success === true) {
        setStep(3);
        return;
      }

      if (!errMsg && response.ok) {
        setStep(3);
      } else {
        setError(errMsg || 'ارسال کد تأیید ناموفق بود');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBaseUrl) {
      setError('لطفاً استان را انتخاب کنید');
      return;
    }
    if (mobile.length !== 11) {
      setError(`شماره موبایل باید دقیقاً ${toPersianDigits(11)} رقم باشد`);
      return;
    }
    if (otp.length !== 5) {
      setError(`کد تأیید باید دقیقاً ${toPersianDigits(5)} رقم باشد`);
      return;
    }

    setVerifyingOtp(true);
    setError('');
    try {
      const referPayload =
        referralChoice === 'have' && referralCode.trim().length > 0
          ? { refer: referralCode.trim() }
          : {};

      const response = await fetch(checkOtpUrl(selectedBaseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ mobNo: mobile, otp, ...referPayload }),
      });

      let data: {
        Status?: boolean;
        success?: boolean;
        token?: string;
        msg?: string;
        message?: string;
      } | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const errMsg = data?.msg ?? data?.message ?? '';
      const isSuccess = data?.Status === true || data?.success === true;

      if (!response.ok || !isSuccess || !data?.token) {
        setError(errMsg || 'کد تأیید صحیح نیست');
        return;
      }

      document.cookie = `gazyom_token=${encodeURIComponent(data.token)}; path=/; max-age=2592000; SameSite=Lax`;
      onSuccess(normalizeBaseUrl(selectedBaseUrl), mobile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex min-h-0 flex-col overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:pb-8 sm:pt-8">
        <div className="mx-auto flex w-full max-w-sm flex-col space-y-6 py-2 sm:space-y-7 sm:py-4">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-blue-100 rounded-[20px] flex items-center justify-center text-blue-500 mx-auto shadow-lg shadow-blue-50">
            <MapPinned size={36} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">
            {step === 1 ? 'انتخاب استان' : step === 2 ? 'کپچا و شماره موبایل' : 'تایید کد پیامک'}
          </h2>
          <p className="text-sm text-slate-400 font-bold leading-relaxed px-2">
            {step === 1
              ? 'استان محل سامانه گاز خود را انتخاب کنید.'
              : step === 2
              ? `کپچا و شماره موبایل برای سامانه «${selectedProvinceName}» بارگذاری می‌شود.`
              : `کد ${toPersianDigits(5)} رقمی ارسال شده به ${toPersianDigits(mobile)} را وارد کنید.`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleProvinceContinue} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 mr-2">استان</label>
              <select
                value={selectedBaseUrl}
                disabled={loadingStates}
                onChange={(e) => {
                  setSelectedBaseUrl(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-4 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              >
                {provinces.map((province) => (
                  <option key={province.baseUrl} value={province.baseUrl}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>}

            <button
              type="submit"
              disabled={loadingStates || !selectedBaseUrl}
              className="w-full bg-blue-600 text-white py-4 rounded-[12px] font-black text-sm shadow-xl shadow-blue-100 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              ادامه
              <ShieldCheck size={18} />
            </button>
          </form>
        ) : step === 2 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={handleBackToProvince}
              className="text-[11px] font-black text-slate-500 flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <ChevronRight size={16} className="rotate-180" />
              بازگشت به انتخاب استان
            </button>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-400 mr-2">تصویر کپچا</label>
                <button
                  type="button"
                  disabled={!selectedBaseUrl || loadingCaptcha}
                  onClick={() => fetchCaptcha(selectedBaseUrl)}
                  className="text-[10px] font-black text-blue-600 disabled:text-slate-300 flex items-center gap-1"
                >
                  <RefreshCw size={14} className={loadingCaptcha ? 'animate-spin' : ''} />
                  دریافت مجدد
                </button>
              </div>
              <div className="w-full h-24 rounded-[12px] border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {captchaImage ? (
                  <img src={captchaImage} alt="captcha" className="h-full object-contain" />
                ) : (
                  <span className="text-[11px] text-slate-400 font-bold">
                    {loadingCaptcha ? 'در حال دریافت کپچا...' : 'کپچا موجود نیست'}
                  </span>
                )}
              </div>
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-black text-slate-400 mr-2">کد کپچا</label>
                <input
                  type="text"
                  value={captchaCode}
                  onChange={(e) => {
                    setCaptchaCode(e.target.value);
                    setError('');
                  }}
                  placeholder="کد داخل تصویر"
                  autoComplete="off"
                  className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-3 px-4 text-center text-base font-black tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 mr-2">شماره موبایل</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/\D/g, '').slice(0, 11));
                  setError('');
                }}
                placeholder={toPersianDigits('09123456789')}
                className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-4 px-5 text-center text-base font-black tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 mr-2">کد معرف (اختیاری)</label>
              <select
                value={referralChoice}
                disabled={referralLocked}
                onChange={(e) => {
                  const v = e.target.value as 'none' | 'have';
                  setReferralChoice(v);
                  if (v === 'none') setReferralCode('');
                  setError('');
                }}
                className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-3.5 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
              >
                <option value="none">ندارم / رد می‌کنم</option>
                <option value="have">کد معرف دارم</option>
              </select>
              {referralChoice === 'have' ? (
                <input
                  type="text"
                  value={referralCode}
                  disabled={referralLocked}
                  onChange={(e) => {
                    setReferralCode(e.target.value.trimStart());
                    setError('');
                  }}
                  placeholder="کد معرف را وارد کنید"
                  autoComplete="off"
                  className="w-full bg-white border border-slate-200 rounded-[12px] py-3 px-4 text-sm font-bold text-center tracking-wide focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              ) : null}
            </div>

            {error && <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>}

            <button
              type="submit"
              disabled={sendingOtp || loadingCaptcha}
              className="w-full bg-blue-600 text-white py-4 rounded-[12px] font-black text-sm shadow-xl shadow-blue-100 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sendingOtp ? 'در حال ارسال...' : 'ادامه'}
              <ShieldCheck size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <button
              type="button"
              onClick={handleBackToMobile}
              className="text-[11px] font-black text-slate-500 flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <ChevronRight size={16} className="rotate-180" />
              بازگشت به مرحله قبل
            </button>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 mr-2">کد تایید پیامک</label>
              <input
                type="tel"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 5));
                  setError('');
                }}
                placeholder={toPersianDigits('12345')}
                className="w-full bg-slate-50 border border-slate-100 rounded-[12px] py-4 px-5 text-center text-base font-black tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {error && <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>}

            <button
              type="submit"
              disabled={verifyingOtp}
              className="w-full bg-blue-600 text-white py-4 rounded-[12px] font-black text-sm shadow-xl shadow-blue-100 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifyingOtp ? 'در حال بررسی...' : 'تایید و ادامه'}
              <ShieldCheck size={18} />
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

export default ProvinceEntry;
