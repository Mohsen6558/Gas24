
import React, { useEffect } from 'react';
import { Flame } from 'lucide-react';

interface SplashProps {
  onFinish: () => void;
}

const Splash: React.FC<SplashProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {}, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-300 text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6 py-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-center">
        <div className="relative mb-6 animate-bounce sm:mb-8">
          <Flame className="h-[5.5rem] w-[5.5rem] sm:h-[7.5rem] sm:w-[7.5rem]" fill="currentColor" />
          <div className="absolute -bottom-2 left-1/2 w-16 -translate-x-1/2 rounded-full bg-black/10 blur-md h-4"></div>
        </div>

        <h1 className="mb-3 text-3xl font-black tracking-tighter sm:mb-4 sm:text-4xl">گرمای پایدار</h1>
        <p className="mb-8 max-w-[20rem] text-base opacity-90 sm:mb-10 sm:text-lg">
          با کاهش مصرف گاز، گازیوم بگیر و جایزه ببر
        </p>

        <button
          type="button"
          onClick={onFinish}
          className="bg-white px-8 py-3.5 text-lg font-black text-orange-600 shadow-xl transition-all hover:bg-orange-50 active:scale-95 sm:px-10 sm:py-4 sm:text-xl rounded-[7px]"
        >
          ورود به پویش
        </button>

        <p className="mt-10 text-xs opacity-70 sm:mt-12">شرکت ملی گاز ایران - کمپین زمستانه</p>
      </div>
    </div>
  );
};

export default Splash;
