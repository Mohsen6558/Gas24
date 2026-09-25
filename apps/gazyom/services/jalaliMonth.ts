
export function getCurrentJalaliYearMonthKey(): string {
  const d = new Date();
  try {
    const fmt = new Intl.DateTimeFormat('fa-IR', {
      calendar: 'persian',
      year: 'numeric',
      month: 'numeric',
      numberingSystem: 'latn',
    });
    const parts = fmt.formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    if (y && mo) {
      const m = String(parseInt(mo, 10)).padStart(2, '0');
      return `${y}-${m}`;
    }
  } catch {
    // ignore
  }
  return `y${d.getFullYear()}-m${d.getMonth() + 1}`;
}


export function getCurrentJalaliMonth1To12(): number {
  const d = new Date();
  try {
    const fmt = new Intl.DateTimeFormat('fa-IR', {
      calendar: 'persian',
      month: 'numeric',
      numberingSystem: 'latn',
    });
    const parts = fmt.formatToParts(d);
    const mo = parts.find((p) => p.type === 'month')?.value;
    const m = mo != null ? parseInt(mo, 10) : NaN;
    if (Number.isFinite(m) && m >= 1 && m <= 12) return m;
  } catch {
    // ignore
  }
  return 1;
}
