/**
 * Pacer-row health classification — pure logic shared by the compact summary
 * row and the expanded card to color the left accent stripe + the inline
 * pacing badge. Kept in one place so the badge label and stripe color always
 * agree. No React, no DOM.
 */

export type PacerHealth =
  | 'over-budget'
  | 'overpacing'
  | 'underpacing'
  | 'on-track'
  | 'stopped'
  | 'no-data';

export interface PacerHealthInfo {
  state: PacerHealth;
  color: string;
  label: string;
  short: string; // 1-2 word tag for compact pills
}

export function classifyPacerHealth(
  ad: { adStatus: string; budgetType: 'Daily' | 'Lifetime' },
  calc: {
    budget: number;
    spent: number;
    projected: number;
    hasDates: boolean;
    endsBeforeToday: boolean;
    lifetimePacingPct: number | null;
  },
): PacerHealthInfo {
  if (ad.adStatus === 'Off' || ad.adStatus === 'Completed Run') {
    return {
      state: 'stopped',
      color: 'var(--border)',
      label: 'Stopped',
      short: 'Off',
    };
  }
  if (calc.budget <= 0 || !calc.hasDates) {
    return {
      state: 'no-data',
      color: 'var(--border)',
      label: 'No pacing data',
      short: 'No data',
    };
  }
  if (calc.spent > calc.budget) {
    return {
      state: 'over-budget',
      color: '#ef4444',
      label: 'Over budget',
      short: 'Over',
    };
  }
  const isLifetime = ad.budgetType === 'Lifetime';
  const pct = isLifetime
    ? calc.lifetimePacingPct
    : calc.projected > 0 && calc.budget > 0
      ? (calc.projected / calc.budget) * 100
      : null;
  if (pct == null) {
    return {
      state: 'no-data',
      color: 'var(--border)',
      label: 'No pacing data',
      short: 'No data',
    };
  }
  if (pct > 105) {
    return {
      state: 'overpacing',
      // Red: projected to overspend (shares red with the already-over-budget
      // state — both are "spending too much", distinguished by their label).
      color: '#ef4444',
      label: 'Overpacing',
      short: 'Overpacing',
    };
  }
  if (pct < 95) {
    return {
      state: 'underpacing',
      // Amber: caution that the budget is on pace to be underspent.
      color: '#f59e0b',
      label: 'Underpacing',
      short: 'Under',
    };
  }
  return {
    state: 'on-track',
    color: '#22c55e',
    label: 'On track',
    short: 'On track',
  };
}
