import { describe, it, expect } from 'vitest';
import type { PacerPlan, PacerAd } from './types';
import {
  poolAds,
  poolCeiling,
  computeAllocations,
  computePoolMeter,
  splitToCents,
  floorAwareShares,
  isDonorRow,
  DEFAULT_SPEC,
  type AdAllocSpec,
} from './budget-calc';

// Minimal PacerAd factory — only the fields the calc math reads.
function ad(over: Partial<PacerAd> & { id: string }): PacerAd {
  return {
    budgetSource: 'base',
    adStatus: 'Live',
    allocation: null,
    pacerActual: null,
    splitBaseAmount: null,
    ...over,
  } as PacerAd;
}

function plan(ads: PacerAd[], over: Partial<PacerPlan> = {}): PacerPlan {
  return {
    ads,
    markup: 1,
    baseBudgetGoal: '1000',
    addedBudgetGoal: '500',
    ...over,
  } as PacerPlan;
}

const spec = (o: Partial<AdAllocSpec>): AdAllocSpec => ({ ...DEFAULT_SPEC, ...o });

describe('poolAds — account-global membership', () => {
  it('routes a split ad’s base + added portions into the right pools', () => {
    const p = plan([
      ad({ id: 'b1', budgetSource: 'base', allocation: '300' }),
      ad({ id: 'a1', budgetSource: 'added', allocation: '200' }),
      ad({ id: 's1', budgetSource: 'split', allocation: '400', splitBaseAmount: '250' }),
    ]);
    const base = poolAds(p, 'base');
    const added = poolAds(p, 'added');
    // Base pool: pure-base b1 + split base portion (250).
    expect(base.map((r) => [r.id, r.allocation])).toEqual([
      ['b1', 300],
      ['s1::base', 250],
    ]);
    // Added pool: pure-added a1 + split added portion (400 − 250 = 150).
    expect(added.map((r) => [r.id, r.allocation])).toEqual([
      ['a1', 200],
      ['s1::added', 150],
    ]);
  });
});

describe('computePoolMeter — Setup mode counts locked/unchecked as committed', () => {
  const p = plan(
    [
      ad({ id: 'b1', budgetSource: 'base', allocation: '300' }),
      ad({ id: 'b2', budgetSource: 'base', allocation: '400' }),
      ad({ id: 'b3', budgetSource: 'base', allocation: '100' }),
    ],
    { baseBudgetGoal: '1000', markup: 1 },
  );
  const ceiling = poolCeiling(p, 'base', 1); // 1000

  it('unchecked (leave-as-is) ads reduce Unallocated (the bug fix)', () => {
    // b1 checked at $300 (amount), b2 unchecked (locked at its $400), b3 even.
    const specs = {
      b1: spec({ mode: 'amount', amount: '300' }),
      b2: spec({ included: false }),
      b3: spec({ mode: 'even' }),
    };
    const m = computePoolMeter('base', poolAds(p, 'base'), specs, 'setup', 1, ceiling);
    expect(m.entered).toBeCloseTo(300, 2); // only the checked amount row
    expect(m.preserved).toBeCloseTo(400, 2); // b2's locked allocation
    // Unallocated = 1000 − 300 (entered) − 400 (preserved) = 300 — NOT 700.
    expect(m.unallocated).toBeCloseTo(300, 2);
    expect(m.overAllocated).toBe(false);
  });

  it('over-allocation surfaces as negative Unallocated', () => {
    const specs = {
      b1: spec({ mode: 'amount', amount: '800' }),
      b2: spec({ included: false }), // locks $400
      b3: spec({ mode: 'amount', amount: '0' }),
    };
    const m = computePoolMeter('base', poolAds(p, 'base'), specs, 'setup', 1, ceiling);
    // 1000 − 800 − 400 = −200.
    expect(m.unallocated).toBeCloseTo(-200, 2);
    expect(m.overAllocated).toBe(true);
  });
});

describe('computePoolMeter — Mid-flight parity (re-plan the unlocked pool)', () => {
  it('donor spend is locked out and the remainder is the redistribution pool', () => {
    const p = plan(
      [
        ad({ id: 'd1', budgetSource: 'base', allocation: '400', pacerActual: '120', adStatus: 'Off' }),
        ad({ id: 'r1', budgetSource: 'base', allocation: '300', pacerActual: '150' }),
        ad({ id: 'r2', budgetSource: 'base', allocation: '300', pacerActual: '100' }),
      ],
      { baseBudgetGoal: '1000', markup: 1 },
    );
    const specs = { r1: spec({ mode: 'even' }), r2: spec({ mode: 'even' }) };
    const m = computePoolMeter('base', poolAds(p, 'base'), specs, 'midflight', 1, 1000);
    expect(m.initial).toBeCloseTo(1000, 2); // 400 + 300 + 300
    expect(m.lockedSpend).toBeCloseTo(120, 2); // donor spent
    // Pool = 1000 − 120 − 0 preserved = 880; nothing entered yet (even rows).
    expect(m.poolBase).toBeCloseTo(880, 2);
    expect(m.anchor).toBeCloseTo(880, 2);
    expect(m.unallocated).toBeCloseTo(880, 2);
  });
});

describe('computeAllocations — percent is a clean fraction with largest-remainder', () => {
  const rows = [
    { id: 'x', realId: 'x', budgetSource: 'base' as const, adStatus: 'Live', allocation: 0, spent: 0 },
    { id: 'y', realId: 'y', budgetSource: 'base' as const, adStatus: 'Live', allocation: 0, spent: 0 },
    { id: 'z', realId: 'z', budgetSource: 'base' as const, adStatus: 'Live', allocation: 0, spent: 0 },
  ];

  it('50% of a $1,540 pool is always $770 (fraction of total, not remaining)', () => {
    const specs = { x: spec({ mode: 'percent', percent: '50' }) };
    const out = computeAllocations([rows[0]], 1540, 1, specs);
    expect(out.x).toBeCloseTo(770, 2);
  });

  it('three × 33.33% reconciles to the cent (largest-remainder, no drift)', () => {
    const specs = {
      x: spec({ mode: 'percent', percent: '33.33' }),
      y: spec({ mode: 'percent', percent: '33.33' }),
      z: spec({ mode: 'percent', percent: '33.34' }),
    };
    const out = computeAllocations(rows, 1540, 1, specs);
    const sum = out.x + out.y + out.z;
    // Σpct = 100 → the group sums to the full pool, exactly.
    expect(sum).toBeCloseTo(1540, 2);
    // Every row is whole cents.
    for (const v of [out.x, out.y, out.z]) {
      expect(Math.round(v * 100)).toBeCloseTo(v * 100, 6);
    }
  });

  it('over-100% still computes each row cleanly (overspend shows in the meter)', () => {
    const specs = {
      x: spec({ mode: 'percent', percent: '50' }),
      y: spec({ mode: 'percent', percent: '50' }),
      z: spec({ mode: 'percent', percent: '50' }),
    };
    const out = computeAllocations(rows, 1000, 1, specs);
    expect(out.x + out.y + out.z).toBeCloseTo(1500, 2);
  });
});

describe('splitToCents', () => {
  it('sums back to the total exactly, leftover cents on the first rows', () => {
    const parts = splitToCents(100, 3);
    expect(parts.reduce((s, v) => s + v, 0)).toBeCloseTo(100, 6);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
  });
});

describe('§5a — calculator-local Off frees its remainder', () => {
  it('an off-mode ad locks at spent and frees its remainder into the pool', () => {
    const p = plan(
      [
        // r1 is LIVE but set to off-mode in the calculator (no planner status).
        ad({ id: 'r1', budgetSource: 'base', allocation: '400', pacerActual: '120', adStatus: 'Live' }),
        ad({ id: 'r2', budgetSource: 'base', allocation: '300', pacerActual: '150' }),
        ad({ id: 'r3', budgetSource: 'base', allocation: '300', pacerActual: '100' }),
      ],
      { baseBudgetGoal: '1000', markup: 1 },
    );
    const specs = {
      r1: spec({ mode: 'off' }), // calc-local wind-down
      r2: spec({ mode: 'even' }),
      r3: spec({ mode: 'even' }),
    };
    const m = computePoolMeter('base', poolAds(p, 'base'), specs, 'midflight', 1, 1000);
    // Off-mode row is treated as a donor: its $120 spent locks, remainder frees.
    expect(m.lockedSpend).toBeCloseTo(120, 2);
    // Pool = 1000 initial − 120 locked − 0 preserved = 880 (r1's $280 remainder
    // is now part of the spreadable pool). Spread gate (lockedSpend > 0) passes.
    expect(m.poolBase).toBeCloseTo(880, 2);
    expect(m.unallocated).toBeCloseTo(880, 2);
    expect(isDonorRow('Live', 'off')).toBe(true);
  });
});

describe('§5b — spent floor clamps below-spent entries (Mid-flight)', () => {
  const rows = [
    { id: 'a', realId: 'a', budgetSource: 'base' as const, adStatus: 'Live', allocation: 300, spent: 100 },
  ];
  it('clamps an amount below spent up to the spent floor when floorSpent', () => {
    const specs = { a: spec({ mode: 'amount', amount: '50' }) };
    expect(computeAllocations(rows, 1000, 1, specs, true).a).toBeCloseTo(100, 2);
    // Setup (no floor) leaves the raw value — the row still blocks Apply.
    expect(computeAllocations(rows, 1000, 1, specs, false).a).toBeCloseTo(50, 2);
  });
});

describe('floorAwareShares — §5c water-filling', () => {
  it('no floors binding → plain even split', () => {
    const { shares, feasible } = floorAwareShares(300, [0, 0, 0]);
    expect(feasible).toBe(true);
    expect(shares).toEqual([100, 100, 100]);
  });

  it('a binding floor is pinned; the rest split evenly', () => {
    const { shares, feasible } = floorAwareShares(300, [150, 0, 0]);
    expect(feasible).toBe(true);
    expect(shares[0]).toBeCloseTo(150, 2); // pinned at its floor
    expect(shares[1]).toBeCloseTo(75, 2);
    expect(shares[2]).toBeCloseTo(75, 2);
    expect(shares.reduce((s, v) => s + v, 0)).toBeCloseTo(300, 2);
  });

  it('floors exceeding the pool are infeasible (Apply stays blocked)', () => {
    const { shares, feasible } = floorAwareShares(300, [200, 200, 0]);
    expect(feasible).toBe(false);
    expect(shares).toEqual([200, 200, 0]); // each pinned at its floor
  });

  it('reconciles to the pool exactly to the cent', () => {
    const { shares } = floorAwareShares(100, [0, 0, 0]);
    expect(shares.reduce((s, v) => s + v, 0)).toBeCloseTo(100, 6);
  });
});
