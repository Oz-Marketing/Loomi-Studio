/**
 * Per-ad contribution to the Base / Added budget pools. A regular single-
 * source ad sends its full allocation + actual spend to its source. A "split"
 * ad divides the allocation per `splitBaseAmount` and apportions actual spend
 * proportionally — keeping both pools' over/under math accurate when one ad is
 * funded from both budgets. Pure — no React, no DOM.
 */

import { num } from './helpers';

export interface AdSourceContribution {
  baseAllocation: number;
  addedAllocation: number;
  baseSpent: number;
  addedSpent: number;
}

export function adContribution(ad: {
  allocation?: string | null;
  pacerActual?: string | null;
  budgetSource: 'base' | 'added' | 'split';
  splitBaseAmount: string | null;
}): AdSourceContribution {
  const allocation = num(ad.allocation) ?? 0;
  const spent = num(ad.pacerActual) ?? 0;
  if (ad.budgetSource === 'split' && allocation > 0) {
    const baseAlloc = Math.min(Math.max(0, num(ad.splitBaseAmount) ?? 0), allocation);
    const baseShare = baseAlloc / allocation;
    return {
      baseAllocation: baseAlloc,
      addedAllocation: allocation - baseAlloc,
      baseSpent: spent * baseShare,
      addedSpent: spent * (1 - baseShare),
    };
  }
  if (ad.budgetSource === 'added') {
    return {
      baseAllocation: 0,
      addedAllocation: allocation,
      baseSpent: 0,
      addedSpent: spent,
    };
  }
  return {
    baseAllocation: allocation,
    addedAllocation: 0,
    baseSpent: spent,
    addedSpent: 0,
  };
}
