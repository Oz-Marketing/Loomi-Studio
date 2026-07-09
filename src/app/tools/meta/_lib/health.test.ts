import { describe, it, expect } from 'vitest';
import { classifyPacerHealth } from './health';

const baseCalc = {
  budget: 1000,
  spent: 500,
  projected: 1000,
  hasDates: true,
  endsBeforeToday: false,
  lifetimePacingPct: null as number | null,
};

describe('classifyPacerHealth', () => {
  it('reports stopped for Off / Completed Run regardless of spend', () => {
    expect(classifyPacerHealth({ adStatus: 'Off', budgetType: 'Daily' }, baseCalc).state).toBe(
      'stopped',
    );
    expect(
      classifyPacerHealth({ adStatus: 'Completed Run', budgetType: 'Daily' }, baseCalc).state,
    ).toBe('stopped');
  });

  it('reports no-data when there is no budget or no dates', () => {
    expect(
      classifyPacerHealth({ adStatus: 'Live', budgetType: 'Daily' }, { ...baseCalc, budget: 0 })
        .state,
    ).toBe('no-data');
    expect(
      classifyPacerHealth(
        { adStatus: 'Live', budgetType: 'Daily' },
        { ...baseCalc, hasDates: false },
      ).state,
    ).toBe('no-data');
  });

  it('reports over-budget when spend exceeds budget', () => {
    expect(
      classifyPacerHealth(
        { adStatus: 'Live', budgetType: 'Daily' },
        { ...baseCalc, spent: 1200 },
      ).state,
    ).toBe('over-budget');
  });

  it('classifies daily pacing by projected/budget thresholds', () => {
    // projected 1100 / budget 1000 = 110% > 105 → overpacing
    expect(
      classifyPacerHealth(
        { adStatus: 'Live', budgetType: 'Daily' },
        { ...baseCalc, projected: 1100 },
      ).state,
    ).toBe('overpacing');
    // projected 900 / 1000 = 90% < 95 → underpacing
    expect(
      classifyPacerHealth(
        { adStatus: 'Live', budgetType: 'Daily' },
        { ...baseCalc, projected: 900 },
      ).state,
    ).toBe('underpacing');
    // projected 1000 / 1000 = 100% → on-track
    expect(
      classifyPacerHealth(
        { adStatus: 'Live', budgetType: 'Daily' },
        { ...baseCalc, projected: 1000 },
      ).state,
    ).toBe('on-track');
  });

  it('uses lifetimePacingPct for Lifetime ads', () => {
    expect(
      classifyPacerHealth(
        { adStatus: 'Live', budgetType: 'Lifetime' },
        { ...baseCalc, lifetimePacingPct: 130 },
      ).state,
    ).toBe('overpacing');
    expect(
      classifyPacerHealth(
        { adStatus: 'Live', budgetType: 'Lifetime' },
        { ...baseCalc, lifetimePacingPct: null },
      ).state,
    ).toBe('no-data');
  });
});
