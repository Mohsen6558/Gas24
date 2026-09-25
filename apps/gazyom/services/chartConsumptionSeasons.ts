import type { ConsumptionData } from '../types';
import { JALALI_CHART_MONTH_LABELS } from './wsOptimizeApi';


export const JALALI_SEASON_LABELS = ['بهار', 'تابستان', 'پاییز', 'زمستان'] as const;

function jalaliMonthOrderIndex(monthLabel: string): number {
  const i = JALALI_CHART_MONTH_LABELS.indexOf(
    monthLabel.trim() as (typeof JALALI_CHART_MONTH_LABELS)[number]
  );
  return i >= 0 ? i : 999;
}


export function orderChartRowsByJalali(rows: ConsumptionData[]): ConsumptionData[] {
  return [...rows].sort((a, b) => jalaliMonthOrderIndex(a.month) - jalaliMonthOrderIndex(b.month));
}


export function aggregateConsumptionBySeason(rows: ConsumptionData[]): ConsumptionData[] {
  const byMonth = new Map<string, ConsumptionData>();
  for (const r of rows) {
    byMonth.set(r.month.trim(), r);
  }
  const out: ConsumptionData[] = [];
  for (let s = 0; s < 4; s++) {
    let cy = 0;
    let ly = 0;
    for (let i = 0; i < 3; i++) {
      const monthName = JALALI_CHART_MONTH_LABELS[s * 3 + i];
      const row = byMonth.get(monthName);
      if (row) {
        cy += row.currentYear;
        ly += row.lastYear;
      }
    }
    out.push({
      month: JALALI_SEASON_LABELS[s],
      currentYear: cy,
      lastYear: ly,
    });
  }
  return out;
}
