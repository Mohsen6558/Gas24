import provinces from './provinces.json';

export interface Province {
  /** subdomain and folder: <key>.gas24.ir, src/<key>/ */
  key: string;
  /** province name, e.g. «آذربایجان شرقی» */
  name: string;
  /** used in «گرما برای …» and «قرعه‌کشی ویژه …» (e.g. تبریز for East Azerbaijan) */
  heroPlace: string;
  /** hero greeting; default «هم‌استانی‌های عزیز استان <name>» */
  greeting?: string;
  /** hero badge: «کمپین استانی صرفه‌جویی انرژی ۱۴۰۵ - ویژه <badge>» */
  badge: string;
  /** cities section: «همدلی در <citiesTitle>» */
  citiesTitle: string;
  /** footer: «… بهینه مصرف گاز در <footerPlace> برگزار می‌شود» */
  footerPlace: string;
  /** [all subscribers, active subscribers]; omitted when there are no figures */
  stats?: [string, string];
  /** hero background; omitted provinces get the plain background */
  heroImage?: string;
  cities: string[];
}

export const PROVINCES = provinces as Province[];

const byKey = (key: string | null | undefined) => PROVINCES.find((p) => p.key === key);

/**
 * index.html of each province carries <meta name="gas24-province">. Without it (npm run dev)
 * the province comes from ?p=, the subdomain (kerman.gas24.ir) or the folder (gas24.ir/kerman/).
 */
export function resolveProvince(): Province {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="gas24-province"]')?.content;
  const query = new URLSearchParams(window.location.search).get('p');
  const subdomain = window.location.hostname.split('.')[0];
  const folder = window.location.pathname.split('/').filter(Boolean)[0];
  return byKey(meta) ?? byKey(query) ?? byKey(subdomain) ?? byKey(folder) ?? PROVINCES[0];
}

/** the app, opened on this province */
export const appUrl = (p: Province, tab?: string) =>
  `https://my.gas24.ir/app/?state=${p.key}${tab ? `&tab=${tab}` : ''}`;
