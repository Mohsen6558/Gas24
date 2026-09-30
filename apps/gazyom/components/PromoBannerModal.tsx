import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  opensInPlace,
  pickBanner,
  recordView,
  safeBannerLink,
  type PromoBanner,
} from '../services/promoBanner';

// Wait for the main screen to settle before popping up.
const OPEN_DELAY_MS = 900;

type Props = { mobile: string; province: string };

function track(event: string, bannerId: string) {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  try {
    gtag?.('event', event, { banner_id: bannerId });
  } catch {
    // analytics must never break the app
  }
}

const PromoBannerModal: React.FC<Props> = ({ mobile, province }) => {
  const [banner, setBanner] = useState<PromoBanner | null>(null);

  useEffect(() => {
    if (!mobile) return;
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    pickBanner(mobile, province, ac.signal).then((found) => {
      if (!found || ac.signal.aborted) return;
      // Only a picture that actually loads is shown and counted.
      const img = new Image();
      img.onload = () => {
        if (ac.signal.aborted) return;
        timer = setTimeout(() => {
          recordView(found.id, mobile);
          track('promo_banner_view', found.id);
          setBanner(found);
        }, OPEN_DELAY_MS);
      };
      img.src = found.image;
    });

    return () => {
      ac.abort();
      if (timer) clearTimeout(timer);
    };
  }, [mobile, province]);

  useEffect(() => {
    if (!banner) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setBanner(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [banner]);

  if (!banner) return null;

  const link = safeBannerLink(banner.link);
  const inPlace = link ? opensInPlace(link) : false;
  const close = () => setBanner(null);
  const onOpenLink = () => {
    track('promo_banner_click', banner.id);
    close();
  };
  const picture = (
    <img
      src={banner.image}
      alt={banner.alt || 'بنر'}
      className="block w-full max-h-[70vh] object-contain rounded-[20px] bg-white"
    />
  );
  const linkProps = inPlace ? {} : { target: '_blank', rel: 'noopener noreferrer' };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={banner.alt || 'بنر'}
        className="relative w-full max-w-sm animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="بستن"
          className="absolute -top-3 -left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg active:scale-95"
        >
          <X size={18} />
        </button>

        {link ? (
          <a href={link} {...linkProps} onClick={onOpenLink} className="block">
            {picture}
          </a>
        ) : (
          picture
        )}

        {link && (
          <a
            href={link}
            {...linkProps}
            onClick={onOpenLink}
            className="mt-3 block w-full rounded-[14px] bg-orange-500 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-orange-500/30 active:scale-[0.98]"
          >
            {banner.buttonText?.trim() || 'مشاهده'}
          </a>
        )}
      </div>
    </div>
  );
};

export default PromoBannerModal;
