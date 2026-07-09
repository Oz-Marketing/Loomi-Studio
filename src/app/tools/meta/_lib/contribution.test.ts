import { describe, it, expect } from 'vitest';
import { adContribution } from './contribution';

describe('adContribution', () => {
  it('sends a base-source ad entirely to the base pool', () => {
    expect(
      adContribution({
        allocation: '1000',
        pacerActual: '400',
        budgetSource: 'base',
        splitBaseAmount: null,
      }),
    ).toEqual({ baseAllocation: 1000, addedAllocation: 0, baseSpent: 400, addedSpent: 0 });
  });

  it('sends an added-source ad entirely to the added pool', () => {
    expect(
      adContribution({
        allocation: '1000',
        pacerActual: '400',
        budgetSource: 'added',
        splitBaseAmount: null,
      }),
    ).toEqual({ baseAllocation: 0, addedAllocation: 1000, baseSpent: 0, addedSpent: 400 });
  });

  it('apportions a split ad proportionally by splitBaseAmount', () => {
    // 300 of 1000 from base (30%) → spend 500 splits 150 / 350
    expect(
      adContribution({
        allocation: '1000',
        pacerActual: '500',
        budgetSource: 'split',
        splitBaseAmount: '300',
      }),
    ).toEqual({
      baseAllocation: 300,
      addedAllocation: 700,
      baseSpent: 150,
      addedSpent: 350,
    });
  });

  it('clamps splitBaseAmount to the allocation and treats missing amounts as zero', () => {
    const over = adContribution({
      allocation: '1000',
      pacerActual: '0',
      budgetSource: 'split',
      splitBaseAmount: '5000',
    });
    expect(over.baseAllocation).toBe(1000);
    expect(over.addedAllocation).toBe(0);
  });

  it('falls back to the base branch when a split ad has no allocation', () => {
    expect(
      adContribution({
        allocation: null,
        pacerActual: null,
        budgetSource: 'split',
        splitBaseAmount: '100',
      }),
    ).toEqual({ baseAllocation: 0, addedAllocation: 0, baseSpent: 0, addedSpent: 0 });
  });
});
