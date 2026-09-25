import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

const STORAGE_DISMISS_UNTIL = 'gazyom_pwa_prompt_dismiss_until';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}


function isMobilePhone(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua)) {
    if (/Tablet|Pad\b/i.test(ua)) return false;
    return true;
  }
  return false;
}

function isIOSPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPod/i.test(navigator.userAgent);
}


function isAndroidPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return false;
  if (/Tablet|Pad\b/i.test(ua)) return false;
  return true;
}

function readDismissUntil(): number {
  try {
    const v = localStorage.getItem(STORAGE_DISMISS_UNTIL);
    if (!v) return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeDismissDays(days: number): void {
  try {
    localStorage.setItem(STORAGE_DISMISS_UNTIL, String(Date.now() + days * 86400000));
  } catch {
    // ignore
  }
}

const OPEN_DELAY_MS = 1800;

const InstallAppPrompt: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'chromium' | 'ios'>('chromium');
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const onLater = useCallback(() => {
    writeDismissDays(45);
    close();
  }, [close]);

  useEffect(() => {
    
    if (!isMobilePhone() || isStandalone() || isAndroidPhone()) return;

    const dismissUntil = readDismissUntil();
    if (dismissUntil > Date.now()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setMode('chromium');
        setOpen(true);
      }, OPEN_DELAY_MS);
    };

    const onInstalled = () => {
      deferredRef.current = null;
      close();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    };
  }, [close]);

  
  useEffect(() => {
    if (!isMobilePhone() || isStandalone()) return;
    if (!isIOSPhone()) return;
    if (readDismissUntil() > Date.now()) return;

    const t = setTimeout(() => {
      if (deferredRef.current) return;
      setMode('ios');
      setOpen(true);
    }, OPEN_DELAY_MS + 400);

    return () => clearTimeout(t);
  }, []);

  const installChromium = async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch {
      // ignore
    }
    deferredRef.current = null;
    close();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[112] flex items-end justify-center bg-slate-900/55 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        className="relative w-full max-w-sm animate-in zoom-in rounded-[24px] bg-white p-6 pt-12 shadow-2xl duration-200 text-right"
      >
        <button
          type="button"
          onClick={onLater}
          className="absolute top-4 left-4 text-slate-300 hover:text-slate-700 transition-colors"
          aria-label="بستن"
        >
          <X size={22} />
        </button>

        <div className="mb-4 flex justify-center">
          {mode === 'chromium' ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <Download size={28} strokeWidth={2.5} />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-lg">
              <Share2 size={26} strokeWidth={2.5} />
            </div>
          )}
        </div>

        <h2 id="pwa-install-title" className="text-lg font-black text-slate-900">
          {mode === 'chromium' ? 'نصب اپ گازیوم؟' : 'افزودن گازیوم به صفحهٔ اصلی'}
        </h2>

        <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
          {mode === 'chromium'
            ? 'می‌توانید وب‌اپ را مثل یک برنامه روی گوشی نصب کنید تا سریع‌تر باز شود و آیکن جداگانه داشته باشید.'
            : 'در مرورگر سافاری، دکمهٔ اشتراک‌گذاری را بزنید و گزینهٔ «افزودن به صفحهٔ اصلی» را انتخاب کنید.'}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {mode === 'chromium' && (
            <button
              type="button"
              onClick={installChromium}
              className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-black text-white shadow-md shadow-orange-100 active:scale-[0.98] transition-transform"
            >
              بله، نصب شود
            </button>
          )}
          {mode === 'ios' && (
            <button
              type="button"
              onClick={() => {
                writeDismissDays(30);
                close();
              }}
              className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-black text-white shadow-md shadow-orange-100 active:scale-[0.98] transition-transform"
            >
              متوجه شدم
            </button>
          )}
          <button
            type="button"
            onClick={onLater}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-600 active:scale-[0.98] transition-transform"
          >
            فعلاً نه
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppPrompt;
