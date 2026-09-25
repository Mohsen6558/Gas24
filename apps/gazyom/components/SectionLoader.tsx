import { Loader2 } from 'lucide-react';

type SectionLoaderProps = {
  label?: string;
  className?: string;
  
  minClassName?: string;
  
  variant?: 'default' | 'light';
};

export function SectionLoader({
  label = 'در حال بارگذاری…',
  className = '',
  minClassName = 'min-h-[10rem]',
  variant = 'default',
}: SectionLoaderProps) {
  const spinClass =
    variant === 'light' ? 'text-cyan-300' : 'text-orange-500';
  const textClass = variant === 'light' ? 'text-slate-300' : 'text-slate-400';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${minClassName} ${className}`}
    >
      <Loader2 className={`h-9 w-9 shrink-0 animate-spin ${spinClass}`} aria-hidden />
      <p className={`text-center text-xs font-bold ${textClass}`}>{label}</p>
    </div>
  );
}
