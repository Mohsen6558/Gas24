/** Public address of the app; invite links always point here, wherever the app itself runs. */
export const APP_PUBLIC_URL = 'https://my.gas24.ir/';

/** Home energy / building questionnaire subscribers are sent to from the dashboard banner. */
export const DECLARATION_FORM_URL = 'https://test.gas24.ir/';

/** Province key of a provincial API base URL, e.g. "https://ardabil.gas24.ir" -> "ardabil". */
export function provinceKeyFromBaseUrl(baseUrl: string): string {
  try {
    const host = new URL(baseUrl.trim()).hostname.toLowerCase();
    return host.endsWith('.gas24.ir') ? host.split('.')[0] : '';
  } catch {
    return '';
  }
}

/**
 * Invite link read by the app on entry: `state` preselects the province and `ref_code` fills and
 * locks the referral code. The code only exists on the inviter's provincial server, so `state`
 * must be the inviter's province.
 */
export function buildInviteLink(baseUrl: string, referCode: string): string {
  const url = new URL(APP_PUBLIC_URL);
  const province = provinceKeyFromBaseUrl(baseUrl);
  if (province) url.searchParams.set('state', province);
  url.searchParams.set('ref_code', referCode.trim());
  return url.toString();
}

/** Questionnaire link with the active subscription prefilled (mobile and gas_no are locked there). */
export function buildDeclarationFormLink(params: {
  baseUrl: string;
  mobile?: string;
  keyNo?: string;
  city?: string;
}): string {
  const url = new URL(DECLARATION_FORM_URL);
  if (params.mobile?.trim()) url.searchParams.set('mobile', params.mobile.trim());
  if (params.keyNo?.trim()) url.searchParams.set('gas_no', params.keyNo.trim());
  const province = provinceKeyFromBaseUrl(params.baseUrl);
  if (province) url.searchParams.set('state', province);
  if (params.city?.trim()) url.searchParams.set('city', params.city.trim());
  return url.toString();
}

/** Copies text to the clipboard; falls back to execCommand where the Clipboard API is missing (old WebViews). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
