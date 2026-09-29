import type React from 'react';

// Placeholders are served (and precached) from my.gas24.ir itself. The old ones came from
// images.unsplash.com, which is often unreachable from Iranian networks: inside Eitaa, whose
// traffic usually bypasses the VPN, every reward without its own picture showed a broken image.
export const REWARD_PLACEHOLDER = '/placeholders/reward.svg';
export const EDUCATION_PLACEHOLDER = '/placeholders/education.svg';

/** Cleans an image URL from a provincial server; '' when there is none. */
export function normalizeImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  // Chrome quietly upgrades http images on an https page, Android WebView (Eitaa, the
  // Android app) blocks them.
  if (/^http:\/\//i.test(url)) return `https://${url.slice(7)}`;
  return url;
}

/** onError handler: a picture that fails to load is replaced by the placeholder once. */
export function fallbackTo(placeholder: string) {
  return (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = placeholder;
  };
}
