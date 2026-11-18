import { describe, expect, it } from 'vite-plus/test';
import {
  generateCoinQuickRollInsight,
  generateCoinQuickSessionInsight,
  generateDiceQuickRollInsight,
  generateDiceQuickSessionInsight,
  generateEmptyQuickSessionInsight,
  generateSeriesInsightSummary,
  getCoinBalanceVerdict,
  type SeriesInsightInput,
} from '../insights';
import type { CoinSeriesStats } from '../types';

function coinStats(headsCount: number, tailsCount: number): CoinSeriesStats {
  const total = headsCount + tailsCount;
  const headsPercentage = (headsCount / total) * 100;
  const tailsPercentage = (tailsCount / total) * 100;
  return {
    headsCount,
    tailsCount,
    headsPercentage,
    tailsPercentage,
    headsDeltaPercentage: headsPercentage - 50,
    tailsDeltaPercentage: tailsPercentage - 50,
    headsRoundsWon: 0,
    tailsRoundsWon: 0,
    tieRounds: 0,
    zQualitative: '',
  };
}

const QUIET_DICE: SeriesInsightInput = {
  faces: 6,
  totalDiceRolled: 12,
  roundAverage: 6.8,
  expectedRoundAverage: 7,
  zScore: -0.35,
  sampleReliability: 'moderate',
  criticalMaxCount: 0,
  criticalMaxRate: 0,
  criticalMinCount: 0,
  criticalMinRate: 0,
  hottestFaces: [2, 3, 4],
};

describe('generateSeriesInsightSummary', () => {
  it('asks for a first round when nothing was rolled', () => {
    expect(generateSeriesInsightSummary({ ...QUIET_DICE, totalDiceRolled: 0 })).toBe(
      'No rolls recorded yet. Complete a round to generate statistical insights.',
    );
  });

  it('describes a balanced coin series and flags a small sample', () => {
    const summary = generateSeriesInsightSummary({
      ...QUIET_DICE,
      faces: 2,
      totalDiceRolled: 4,
      zScore: 0,
      sampleReliability: 'small',
      coinStats: coinStats(2, 2),
    });
    expect(summary).toBe(
      'Small sample (4 tosses): Balanced coin split (50.0% Heads / 50.0% Tails), within normal variance (z = +0.00). Additional tosses recommended for statistical confidence.',
    );
  });

  it('describes Heads-leaning and Tails-leaning coin series against the fair baseline', () => {
    const heads = generateSeriesInsightSummary({
      ...QUIET_DICE,
      faces: 2,
      totalDiceRolled: 16,
      zScore: 2,
      coinStats: coinStats(12, 4),
    });
    expect(heads).toBe('Heads-leaning outcome (75.0% Heads, +25.0% vs fair baseline, z = +2.00).');

    const tails = generateSeriesInsightSummary({
      ...QUIET_DICE,
      faces: 2,
      totalDiceRolled: 36,
      zScore: -2,
      sampleReliability: 'solid',
      coinStats: coinStats(12, 24),
    });
    expect(tails).toBe('Tails-leaning outcome (66.7% Tails, +16.7% vs fair baseline, z = -2.00).');
  });

  it('describes dice within variance without highlights when more than two faces tie as hottest', () => {
    expect(generateSeriesInsightSummary(QUIET_DICE)).toBe(
      'Performing within expected variance (avg round 6.8 vs E[X] = 7.0, z = -0.35).',
    );
  });

  it('describes a hot small dice sample with crit and hottest-face highlights', () => {
    const summary = generateSeriesInsightSummary({
      ...QUIET_DICE,
      totalDiceRolled: 4,
      roundAverage: 11.5,
      zScore: 2.6349,
      sampleReliability: 'small',
      criticalMaxCount: 3,
      criticalMaxRate: 75,
      hottestFaces: [6],
    });
    expect(summary).toBe(
      'Small sample (4 dice): Running hot above theoretical expectation (avg round 11.5 vs E[X] = 7.0, z = +2.63). Highlights: 3x crit max (6) at 75.0%; face 6 rolled most. More rounds needed for statistical confidence.',
    );
  });

  it('describes a cold dice series, skipping crit rates under the highlight threshold', () => {
    const summary = generateSeriesInsightSummary({
      faces: 20,
      totalDiceRolled: 30,
      roundAverage: 6.2,
      expectedRoundAverage: 10.5,
      zScore: -1.5,
      sampleReliability: 'solid',
      criticalMaxCount: 1,
      criticalMaxRate: 100 / 30,
      criticalMinCount: 6,
      criticalMinRate: 20,
      hottestFaces: [1, 2],
    });
    expect(summary).toBe(
      'Running cold below theoretical expectation (avg round 6.2 vs E[X] = 10.5, z = -1.50). Highlights: 6x nat 1 at 20.0%; face 1, 2 rolled most.',
    );
  });
});

describe('generateCoinQuickRollInsight', () => {
  it('names the landed side of a single coin', () => {
    const base = { count: 1, tailsCount: 0, headsPercentage: 100, tailsPercentage: 0 };
    expect(generateCoinQuickRollInsight({ ...base, headsCount: 1 })).toBe(
      'Landed Heads (winning face).',
    );
    expect(
      generateCoinQuickRollInsight({
        count: 1,
        headsCount: 0,
        tailsCount: 1,
        headsPercentage: 0,
        tailsPercentage: 100,
      }),
    ).toBe('Landed Tails.');
  });

  it('describes majorities and even splits for several coins', () => {
    expect(
      generateCoinQuickRollInsight({
        count: 3,
        headsCount: 2,
        tailsCount: 1,
        headsPercentage: 200 / 3,
        tailsPercentage: 100 / 3,
      }),
    ).toBe('Heads majority (2H / 1T, 67%).');
    expect(
      generateCoinQuickRollInsight({
        count: 3,
        headsCount: 1,
        tailsCount: 2,
        headsPercentage: 100 / 3,
        tailsPercentage: 200 / 3,
      }),
    ).toBe('Tails majority (2T / 1H, 67%).');
    expect(
      generateCoinQuickRollInsight({
        count: 4,
        headsCount: 2,
        tailsCount: 2,
        headsPercentage: 50,
        tailsPercentage: 50,
      }),
    ).toBe('Even split (2H / 2T).');
  });
});

describe('generateDiceQuickRollInsight', () => {
  const single = {
    faces: 6 as const,
    expectedSum: 3.5,
    zScore: 0,
    criticalMaxCount: 0,
    criticalMinCount: 0,
  };

  it('describes a single die against its expected value', () => {
    expect(
      generateDiceQuickRollInsight({
        ...single,
        faces: 20,
        values: [20],
        sum: 20,
        expectedSum: 10.5,
        sumDelta: 9.5,
      }),
    ).toBe('Natural 20! Maximum possible roll.');
    expect(generateDiceQuickRollInsight({ ...single, values: [1], sum: 1, sumDelta: -2.5 })).toBe(
      'Natural 1. Minimum possible roll.',
    );
    expect(generateDiceQuickRollInsight({ ...single, values: [5], sum: 5, sumDelta: 1.5 })).toBe(
      'Rolled 5 (+1.5 vs E[X] 3.5). Above average.',
    );
    expect(generateDiceQuickRollInsight({ ...single, values: [2], sum: 2, sumDelta: -1.5 })).toBe(
      'Rolled 2 (-1.5 vs E[X] 3.5). Below average.',
    );
    expect(
      generateDiceQuickRollInsight({
        ...single,
        values: [3],
        sum: 3,
        expectedSum: 3,
        sumDelta: 0,
      }),
    ).toBe('Rolled 3 (exact expected average 3.0).');
  });

  it('describes high, low and typical multi-dice throws with their crits', () => {
    const threeD6 = { faces: 6 as const, expectedSum: 10.5 };
    expect(
      generateDiceQuickRollInsight({
        ...threeD6,
        values: [6, 6, 5],
        sum: 17,
        sumDelta: 6.5,
        zScore: 2.2,
        criticalMaxCount: 2,
        criticalMinCount: 0,
      }),
    ).toBe('High roll: sum 17 (+6.5 vs E[X] 10.5) (2x nat 6).');
    expect(
      generateDiceQuickRollInsight({
        ...threeD6,
        values: [1, 1, 1],
        sum: 3,
        sumDelta: -7.5,
        zScore: -2.5,
        criticalMaxCount: 0,
        criticalMinCount: 3,
      }),
    ).toBe('Low roll: sum 3 (-7.5 vs E[X] 10.5) (3x nat 1).');
    expect(
      generateDiceQuickRollInsight({
        ...threeD6,
        values: [3, 4, 4],
        sum: 11,
        sumDelta: 0.5,
        zScore: 0.17,
        criticalMaxCount: 0,
        criticalMinCount: 0,
      }),
    ).toBe('Typical roll: sum 11 (E[X] 10.5).');
    expect(
      generateDiceQuickRollInsight({
        ...threeD6,
        values: [6, 1, 4],
        sum: 11,
        sumDelta: 0.5,
        zScore: 0.17,
        criticalMaxCount: 1,
        criticalMinCount: 1,
      }),
    ).toBe('Typical roll: sum 11 (E[X] 10.5) (1x nat 6, 1x nat 1).');
  });
});

describe('quick-roll session insights', () => {
  it('derives the coin balance verdict from the Heads z-score', () => {
    expect(getCoinBalanceVerdict(0)).toBe('Evenly balanced');
    expect(getCoinBalanceVerdict(0.99)).toBe('Evenly balanced');
    expect(getCoinBalanceVerdict(-0.99)).toBe('Evenly balanced');
    expect(getCoinBalanceVerdict(1)).toBe('Heads-leaning');
    expect(getCoinBalanceVerdict(-1)).toBe('Tails-leaning');
  });

  it('describes an empty session for coins and dice', () => {
    expect(generateEmptyQuickSessionInsight(2)).toBe('No coin rolls in this session yet.');
    expect(generateEmptyQuickSessionInsight(12)).toBe('No d12 rolls in this session yet.');
  });

  it('describes a coin session with its lowercased verdict', () => {
    expect(
      generateCoinQuickSessionInsight({
        matchingThrows: 2,
        totalDiceCount: 4,
        headsPercentage: 75,
        tailsPercentage: 25,
        balanceVerdict: 'Heads-leaning',
      }),
    ).toBe('2 throws (4 coins): 75.0% Heads / 25.0% Tails (heads-leaning).');
  });

  it('describes a dice session with a signed average delta', () => {
    const session = {
      matchingThrows: 2,
      totalDiceCount: 2,
      expectedAverage: 3.5,
      criticalMaxCount: 1,
      criticalMinCount: 0,
    };
    expect(
      generateDiceQuickSessionInsight({ ...session, actualAverage: 5, averageDelta: 1.5 }),
    ).toBe('2 throws (2 dice): avg die 5.00 (+1.50 vs E[X] 3.5). 1 max crits, 0 nat 1s.');
    expect(
      generateDiceQuickSessionInsight({ ...session, actualAverage: 2.25, averageDelta: -1.25 }),
    ).toBe('2 throws (2 dice): avg die 2.25 (-1.25 vs E[X] 3.5). 1 max crits, 0 nat 1s.');
    expect(
      generateDiceQuickSessionInsight({ ...session, actualAverage: 3.5, averageDelta: 0 }),
    ).toBe('2 throws (2 dice): avg die 3.50 (+0.00 vs E[X] 3.5). 1 max crits, 0 nat 1s.');
  });
});
