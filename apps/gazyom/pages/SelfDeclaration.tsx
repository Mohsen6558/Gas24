
import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  RefreshCcw,
  ImageUp,
} from 'lucide-react';
import { submitKarkard, toEnglishDigitsOnly } from '../services/wsOptimizeApi';

interface SelfDeclarationProps {
  wsBaseUrl: string;
  keyNo: string | number;
  onBack: () => void;
  onSuccess: () => void;
}

const SelfDeclaration: React.FC<SelfDeclarationProps> = ({ wsBaseUrl, keyNo, onBack, onSuccess }) => {
  const [step, setStep] = useState<'guide' | 'camera' | 'review'>('guide');
  const [image, setImage] = useState<string | null>(null);
  const [counterDigits, setCounterDigits] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

  
  function getUserMediaCompat(constraints: MediaStreamConstraints): Promise<MediaStream> {
    const md = navigator.mediaDevices;
    if (md && typeof md.getUserMedia === 'function') {
      return md.getUserMedia(constraints);
    }
    const nav = navigator as Navigator & {
      getUserMedia?: (
        c: MediaStreamConstraints,
        ok: (s: MediaStream) => void,
        err: (e: unknown) => void
      ) => void;
      webkitGetUserMedia?: (
        c: MediaStreamConstraints,
        ok: (s: MediaStream) => void,
        err: (e: unknown) => void
      ) => void;
      mozGetUserMedia?: (
        c: MediaStreamConstraints,
        ok: (s: MediaStream) => void,
        err: (e: unknown) => void
      ) => void;
    };
    const legacy = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia;
    if (typeof legacy === 'function') {
      return new Promise((resolve, reject) => {
        legacy.call(navigator, constraints, resolve, reject);
      });
    }
    return Promise.reject(Object.assign(new Error('NO_CAMERA_API'), { name: 'NoCameraApiError' }));
  }

  const pickImageFromFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSubmitError('فقط فایل تصویر (مثلاً JPG یا PNG) مجاز است.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSubmitError('حجم تصویر باید حداکثر حدود ۱۲ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setImage(result);
        setSubmitError(null);
        setStep('review');
      }
    };
    reader.onerror = () => setSubmitError('خواندن فایل ناموفق بود.');
    reader.readAsDataURL(file);
  };

  const onGalleryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    pickImageFromFile(file);
  };

  
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setCameraError('برای دسترسی به دوربین باید برنامه روی HTTPS اجرا شود.');
        return;
      }

      if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
        try {
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (status.state === 'denied') {
            setCameraError('دسترسی دوربین قبلاً رد شده است. لطفاً از تنظیمات مرورگر، Camera را Allow کنید یا از گالری استفاده کنید.');
            return;
          }
        } catch {
          // ignore
        }
      }

      const tryGetUserMedia = async (constraints: MediaStreamConstraints) => {
        return await getUserMediaCompat(constraints);
      };

      try {
        const mediaStream = await tryGetUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        setStream(mediaStream);
        return;
      } catch (primaryErr) {
        
        console.warn('Camera primary constraints failed, retrying with simple video:', primaryErr);
        const mediaStream = await tryGetUserMedia({ video: true, audio: false });
        setStream(mediaStream);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      const name = typeof err === 'object' && err && 'name' in err ? String((err as { name?: unknown }).name) : '';
      if (name === 'NoCameraApiError') {
        setCameraError(
          'در این مرورگر/وب‌ویو API دوربین زنده در دسترس نیست. برای ثبت تصویر از «انتخاب از گالری / فایل» یا «بازگشت» استفاده کنید.'
        );
        return;
      }
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraError('مجوز دوربین داده نشده یا مسدود شده است. اگر پنجرهٔ مجوز را نمی‌بینید، از تنظیمات مرورگر Camera را Allow کنید یا از گالری استفاده کنید.');
        return;
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCameraError('دوربین سازگار پیدا نشد یا تنظیمات دوربین پشتیبانی نمی‌شود. لطفاً از گالری استفاده کنید.');
        return;
      }
      setCameraError("دسترسی به دوربین امکان‌پذیر نیست. اگر پنجرهٔ مجوز نمایش داده نشد، Camera را در تنظیمات مرورگر روی Allow قرار دهید.");
    }
  };

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  useEffect(() => {
    if (step !== 'camera' || !stream) return;
    const v = videoRef.current;
    if (v) v.srcObject = stream;
  }, [step, stream]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImage(dataUrl);
        setSubmitError(null);
        setStep('review');
        stopCamera();
      }
    }
  };

  const handleSubmit = async () => {
    if (!image || !wsBaseUrl) return;
    const en = toEnglishDigitsOnly(counterDigits).trim();
    if (!en) {
      setSubmitError('رقم کنتور را وارد کنید.');
      return;
    }
    const counterNumber = parseInt(en, 10);
    if (!Number.isFinite(counterNumber) || counterNumber < 0) {
      setSubmitError('رقم کنتور نامعتبر است.');
      return;
    }

    setSubmitError(null);
    setIsUploading(true);
    try {
      const res = await submitKarkard(wsBaseUrl, {
        keyNo,
        counterNumber,
        imageFile: image,
      });
      if (res.ok) {
        onSuccess();
        return;
      }
      setSubmitError(res.ok === false ? res.message : 'ثبت کارکرد ناموفق بود');
    } catch {
      setSubmitError('خطا در ارتباط با سرور');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        className="sr-only fixed left-0 top-0 h-px w-px opacity-0"
        aria-hidden
        tabIndex={-1}
        onChange={onGalleryInputChange}
      />
      
      <header className="p-6 flex items-center gap-4 bg-white border-b border-slate-100 sticky top-0 z-50">
        <button onClick={onBack} className="p-2 bg-slate-50 rounded-[12px] active:scale-90 transition-all">
          <ChevronRight size={20} className="text-slate-800" />
        </button>
        <div className="flex flex-col text-right">
          <h2 className="text-lg font-black text-slate-800">خوداظهاری مصرف</h2>
          <span className="text-[9px] font-bold text-slate-400">عکس با دوربین یا بارگذاری تصویر کنتور</span>
        </div>
      </header>

      <div className="flex-grow flex flex-col bg-slate-50 relative min-h-0">
        {step === 'guide' && (
          <div className="animate-in fade-in duration-500 bg-white h-full flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">
              <div className="bg-blue-50 p-6 rounded-[24px] border border-blue-100 flex flex-col items-center text-center gap-4">
                 <div className="w-20 h-20 bg-blue-600 rounded-[20px] flex items-center justify-center text-white shadow-xl shadow-blue-100">
                    <Camera size={40} />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-base font-black text-blue-900">راهنمای ثبت تصویر کنتور</h3>
                   <p className="text-xs text-blue-700/70 font-bold leading-relaxed">
                     می‌توانید با دوربین عکس بگیرید یا تصویر آماده از گالری بارگذاری کنید؛ اعداد باید خوانا باشند.
                   </p>
                 </div>
              </div>

              {submitError && step === 'guide' ? (
                <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-bold text-red-700">
                  {submitError}
                </div>
              ) : null}

              <div className="space-y-4">
                {[
                  { text: 'اعداد کنتور باید کاملاً واضح و بدون تارشدگی باشند', icon: <CheckCircle2 size={18} className="text-green-500" /> },
                  { text: 'ترجیحاً از کنتور واقعی و نور کافی استفاده کنید', icon: <CheckCircle2 size={18} className="text-green-500" /> },
                  { text: 'تصویر بارگذاری‌شده باید همان کنتور اشتراک شما باشد', icon: <CheckCircle2 size={18} className="text-blue-500" /> },
                  { text: 'نور کافی به تأیید سریع‌تر توسط سیستم کمک می‌کند', icon: <Sparkles size={18} className="text-orange-500" /> },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-[16px] border border-slate-100">
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setStep('camera');
                }}
                className="w-full bg-slate-900 text-white py-5 rounded-[16px] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                عکس با دوربین
                <Camera size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  fileInputRef.current?.click();
                }}
                className="w-full border-2 border-slate-200 bg-white text-slate-800 py-5 rounded-[16px] font-black text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                بارگذاری از گالری / فایل
                <ImageUp size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 'camera' && (
          <div className="flex-grow flex flex-col relative bg-black">
            <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setStep('guide');
                }}
                className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[11px] font-black text-white backdrop-blur-md active:scale-95"
              >
                <ChevronRight size={16} />
                بازگشت
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-[10px] font-black text-white backdrop-blur-md ring-1 ring-white/25 active:scale-95"
              >
                <ImageUp size={16} />
                گالری
              </button>
            </div>
            {cameraError ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-6 bg-slate-900 p-8 pt-24 text-center text-white">
                <AlertCircle size={48} className="text-red-500" />
                <p className="text-sm font-bold leading-relaxed">{cameraError}</p>
                <div className="flex w-full max-w-xs flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError(null);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-black text-slate-900 active:scale-[0.98]"
                  >
                    <ImageUp size={16} />
                    انتخاب از گالری / فایل
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-xs font-black text-white active:scale-[0.98]"
                  >
                    <RefreshCcw size={16} />
                    تلاش مجدد برای دوربین
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[85%] aspect-[3/1] border-2 border-dashed border-white/50 rounded-xl relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[8px] text-white font-black">
                      اعداد کنتور را در این کادر قرار دهید
                    </div>
                  </div>
                </div>

                
                <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-8">
                  <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                    <p className="text-[10px] text-white font-bold">دکمهٔ وسط برای ثبت فریم از دوربین</p>
                  </div>
                  
                  <button 
                    onClick={takePhoto}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all p-1"
                  >
                    <div className="w-full h-full rounded-full border-4 border-slate-900 flex items-center justify-center">
                      <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
                    </div>
                  </button>
                </div>
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {step === 'review' && image && (
          <div className="p-6 space-y-8 animate-in fade-in duration-500 bg-white h-full flex flex-col overflow-y-auto min-h-0">
            <div className="relative rounded-[32px] overflow-hidden shadow-2xl border-4 border-white bg-slate-900 max-h-[55vh]">
              <img src={image} alt="Meter preview" className="w-full max-h-[55vh] object-contain bg-slate-950" />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setStep('guide');
                }}
                className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white p-2 rounded-full active:scale-90 transition-all"
                aria-label="حذف تصویر و بازگشت"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-orange-50 p-5 rounded-[20px] border border-orange-100 flex gap-4">
               <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
               <p className="text-[11px] font-bold text-orange-800 leading-relaxed">
                 آیا شماره‌های کنتور کاملاً واضح است؟ 
                 <br/>
                 تصاویر غیرواضح توسط سیستم تایید نخواهند شد.
               </p>
            </div>

            <div className="space-y-2 text-right">
              <label htmlFor="karkard-counter" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                رقم کنتور (عدد صحیح)
              </label>
              <input
                id="karkard-counter"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                dir="ltr"
                placeholder="مثال: ۷۴۲۳۰"
                value={counterDigits}
                onChange={(e) => setCounterDigits(e.target.value)}
                className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-center text-lg font-black tracking-wide text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
              />
              <p className="text-[10px] font-bold text-slate-400">همان عددی که روی کنتور می‌بینید را وارد کنید؛ با ارسال، تصویر به سرور ثبت می‌شود.</p>
            </div>

            {submitError ? (
              <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-bold text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="mt-auto pt-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError(null);
                    setImage(null);
                    setStep('guide');
                  }}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-[16px] font-black text-xs active:scale-95 transition-all"
                >
                  تصویر دیگر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError(null);
                    setStep('camera');
                  }}
                  className="flex-1 bg-slate-800 text-white py-4 rounded-[16px] font-black text-xs active:scale-95 transition-all"
                >
                  دوربین دوباره
                </button>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isUploading}
                className="w-full bg-blue-600 text-white py-5 rounded-[16px] font-black text-sm shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : 'ارسال برای تایید'}
                {!isUploading && <CheckCircle2 size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfDeclaration;
