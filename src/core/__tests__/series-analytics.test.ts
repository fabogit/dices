import { describe, expect, it } from 'vite-plus/test';
import { getCoinZQualitative, getSampleReliabilityLabel } from '../insights';
import { computeRoundResult } from '../round';
import {
  classifyDelta,
  computeMode,
  computeSeriesAnalytics,
  computeSeriesSummary,
  getCoinSplitPercentages,
} from '../series-analytics';
import type { RollConfig, RoundResult } from '../types';

describe('computeMode', () => {
  it('handles empty array', () => {
    const mode = computeMode([]);
    expect(mode).toEqual({
      values: [],
      frequency: 0,
      isTie: false,
    });
  });

  it('identifies single unique mode', () => {
    const mode = computeMode([1, 4, 4, 2, 4, 3]);
    expect(mode).toEqual({
      values: [4],
      frequency: 3,
      isTie: false,
    });
  });

  it('identifies multimodal / tie mode sorted ascending', () => {
    const mode = computeMode([6, 2, 6, 3, 2, 5]);
    expect(mode).toEqual({
      values: [2, 6],
      frequency: 2,
      isTie: true,
    });
  });

  it('marks all values as tie when every frequency is 1', () => {
    const mode = computeMode([5, 1, 3]);
    expect(mode).toEqual({
      values: [1, 3, 5],
      frequency: 1,
      isTie: true,
    });
  });
});

describe('computeSeriesSummary', () => {
  it('summarizes polyhedral dice series (d6 multi-dice, best/worst round, mode)', () => {
    const config: RollConfig = {
      faces: 6,
      countPerRoll: 2,
      seriesLength: 3,
      playerId: 'player-alpha',
    };

    const r0 = computeRoundResult(0, [2, 3], 6); // sum: 5
    const r1 = computeRoundResult(1, [6, 6], 6); // sum: 12 (best)
    const r2 = computeRoundResult(2, [1, 2], 6); // sum: 3 (worst)

    const summary = computeSeriesSummary('series-1', config, 'Alice', [r0, r1, r2]);

    expect(summary.id).toBe('series-1');
    expect(summary.playerId).toBe('player-alpha');
    expect(summary.playerName).toBe('Alice');
    expect(summary.totalSum).toBe(20);
    expect(summary.overallMax).toBe(6);
    expect(summary.overallMin).toBe(1);
    expect(summary.average).toBeCloseTo(20 / 3, 5);
    expect(summary.bestRoundIndex).toBe(1);
    expect(summary.worstRoundIndex).toBe(2);
    // values: 2, 3, 6, 6, 1, 2 -> 2 appears twice, 6 appears twice -> tie between 2 and 6
    expect(summary.mode).toEqual({
      values: [2, 6],
      frequency: 2,
      isTie: true,
    });
    expect(summary.kind).toBe('dice');
    expect('coinSeriesWinner' in summary).toBe(false);
  });

  it('summarizes coin Best-of-3 series with clear winner', () => {
    const config = {
      faces: 2 as const,
      countPerRoll: 1,
      seriesLength: 3,
      playerId: 'coin-player',
    };

    // 1 = HEADS, 2 = TAILS
    const r0 = computeRoundResult(0, [1], 2); // HEADS
    const r1 = computeRoundResult(1, [2], 2); // TAILS
    const r2 = computeRoundResult(2, [1], 2); // HEADS

    const summary = computeSeriesSummary('series-coin', config, 'Bob', [r0, r1, r2]);

    expect(summary.kind).toBe('coin');
    expect(summary.totalHeads).toBe(2);
    expect(summary.totalTails).toBe(1);
    expect(summary.headsRoundsWon).toBe(2);
    expect(summary.tailsRoundsWon).toBe(1);
    expect(summary.coinSeriesWinner).toBe('HEADS');
  });

  it('summarizes coin series resulting in a TIE', () => {
    const config = {
      faces: 2 as const,
      countPerRoll: 1,
      seriesLength: 2,
      playerId: 'coin-player',
    };

    const r0 = computeRoundResult(0, [1], 2); // HEADS
    const r1 = computeRoundResult(1, [2], 2); // TAILS

    const summary = computeSeriesSummary('series-coin-tie', config, 'Bob', [r0, r1]);

    expect(summary.kind).toBe('coin');
    expect(summary.headsRoundsWon).toBe(1);
    expect(summary.tailsRoundsWon).toBe(1);
    expect(summary.coinSeriesWinner).toBe('TIE');
  });

  it('handles empty dice and empty coin series with coherent variant fields', () => {
    const diceConfig = {
      faces: 20 as const,
      countPerRoll: 1,
      seriesLength: 5,
      playerId: 'p1',
    };

    const summary = computeSeriesSummary('empty-series', diceConfig, 'Solo', []);

    expect(summary.kind).toBe('dice');
    expect(summary.totalSum).toBe(0);
    expect(summary.overallMax).toBe(0);
    expect(summary.overallMin).toBe(0);
    expect(summary.average).toBe(0);
    expect(summary.bestRoundIndex).toBe(-1);
    expect(summary.worstRoundIndex).toBe(-1);
    expect(summary.rounds).toHaveLength(0);

    const coinConfig = {
      faces: 2 as const,
      countPerRoll: 2,
      seriesLength: 3,
      playerId: 'p1',
    };
    const emptyCoinSummary = computeSeriesSummary('empty-coin', coinConfig, 'Solo', []);

    expect(emptyCoinSummary.kind).toBe('coin');
    expect(emptyCoinSummary.coinSeriesWinner).toBe('TIE');
    expect(emptyCoinSummary.totalHeads).toBe(0);
    expect(emptyCoinSummary.totalTails).toBe(0);
    expect(emptyCoinSummary.headsRoundsWon).toBe(0);
    expect(emptyCoinSummary.tailsRoundsWon).toBe(0);
    expect(emptyCoinSummary.analytics.coinStats.headsPercentage).toBe(0);
    expect(emptyCoinSummary.analytics.coinStats.tailsPercentage).toBe(0);
  });
});

describe('computeSeriesAnalytics', () => {
  const configD6: RollConfig = {
    faces: 6,
    countPerRoll: 2,
    seriesLength: 2,
    playerId: 'p1',
  };

  it('computes empty analytics correctly when no rounds have been played', () => {
    const analytics = computeSeriesAnalytics(configD6, []);
    expect(analytics.totalDiceRolled).toBe(0);
    expect(analytics.expectedRoundAverage).toBe(7); // 2 * (6 + 1)/2 = 7
    expect(analytics.averageDelta).toBe(0);
    expect(analytics.standardDeviation).toBe(0);
    expect(analytics.highRollRate).toBe(0);
    expect(analytics.criticalMaxRate).toBe(0);
    expect(analytics.criticalMinRate).toBe(0);
    expect(analytics.distribution).toHaveLength(6);
    for (const item of analytics.distribution) {
      expect(item.count).toBe(0);
      expect(item.percentage).toBe(0);
      expect(item.expectedPercentage).toBeCloseTo(16.666, 2);
      expect(item.deltaPercentage).toBeCloseTo(-16.666, 2);
    }
  });

  it('computes mathematical variance, std deviation, and averages accurately', () => {
    const round1 = computeRoundResult(0, [2, 4], 6); // sum = 6
    const round2 = computeRoundResult(1, [6, 6], 6); // sum = 12
    const rounds: RoundResult[] = [round1, round2];

    const analytics = computeSeriesAnalytics(configD6, rounds);
    expect(analytics.totalDiceRolled).toBe(4);
    expect(analytics.expectedRoundAverage).toBe(7);

    // Round sums: 6, 12. Mean = 9.
    // Variance = ((6-9)^2 + (12-9)^2) / 2 = (9 + 9) / 2 = 9
    // Std deviation = sqrt(9) = 3
    expect(analytics.standardDeviation).toBe(3);
    expect(analytics.averageDelta).toBe(2); // 9 - 7 = 2

    // High rolls (> 3): [4, 6, 6] -> 3 out of 4 (75%)
    expect(analytics.highRollCount).toBe(3);
    expect(analytics.highRollRate).toBe(75);

    // Critical max (= 6): [6, 6] -> 2 out of 4 (50%)
    expect(analytics.criticalMaxCount).toBe(2);
    expect(analytics.criticalMaxRate).toBe(50);

    // Critical min (= 1): 0 out of 4 (0%)
    expect(analytics.criticalMinCount).toBe(0);
    expect(analytics.criticalMinRate).toBe(0);

    // Distribution
    const d6Face6 = analytics.distribution.find((d) => d.face === 6);
    expect(d6Face6?.count).toBe(2);
    expect(d6Face6?.percentage).toBe(50);
    expect(d6Face6?.expectedPercentage).toBeCloseTo(16.666, 2);
    expect(d6Face6?.deltaPercentage).toBeCloseTo(33.333, 2);

    const d6Face2 = analytics.distribution.find((d) => d.face === 2);
    expect(d6Face2?.count).toBe(1);
    expect(d6Face2?.percentage).toBe(25);
  });

  it('computes coin d2 analytics with HEADS/TAILS labels and critical semantics', () => {
    const configD2: RollConfig = {
      faces: 2,
      countPerRoll: 1,
      seriesLength: 3,
      playerId: 'p1',
    };

    // 1 = HEADS, 2 = TAILS
    const round1 = computeRoundResult(0, [1], 2); // Heads
    const round2 = computeRoundResult(1, [1], 2); // Heads
    const round3 = computeRoundResult(2, [2], 2); // Tails
    const rounds = [round1, round2, round3];

    const analytics = computeSeriesAnalytics(configD2, rounds);
    expect(analytics.totalDiceRolled).toBe(3);
    expect(analytics.expectedRoundAverage).toBe(1.5); // 1 * (2 + 1)/2

    // For d2, 1 = HEADS is criticalMax and highRoll, 2 = TAILS is criticalMin
    expect(analytics.criticalMaxCount).toBe(2);
    expect(analytics.criticalMaxRate).toBeCloseTo(66.666, 2);
    expect(analytics.criticalMinCount).toBe(1);
    expect(analytics.criticalMinRate).toBeCloseTo(33.333, 2);

    expect(analytics.distribution[0].label).toBe('HEADS');
    expect(analytics.distribution[0].count).toBe(2);
    expect(analytics.distribution[1].label).toBe('TAILS');
    expect(analytics.distribution[1].count).toBe(1);
  });

  it('computes theoreticalRoundStdDev, standardized zScore, sampleReliability, and insightSummary', () => {
    // 2d6 series
    const r1 = computeRoundResult(0, [6, 6], 6); // sum: 12
    const r2 = computeRoundResult(1, [6, 5], 6); // sum: 11
    const analytics = computeSeriesAnalytics(configD6, [r1, r2]);

    // theoreticalRoundStdDev for 2d6: sqrt(2 * (36 - 1) / 12) = sqrt(70 / 12) = ~2.4152
    expect(analytics.theoreticalRoundStdDev).toBeCloseTo(Math.sqrt(70 / 12), 4);

    // 4 dice rolled: totalSum = 23, expected = 4 * 3.5 = 14
    // totalStdDev = sqrt(4 * 35 / 12) = sqrt(140 / 12) = ~3.41565
    // zScore = (23 - 14) / 3.41565 = ~2.6349
    expect(analytics.zScore).toBeGreaterThan(2.0);
    expect(analytics.sampleReliability).toBe('small'); // 4 dice < 10

    // Peak percentage should accommodate either empirical or expected baseline * 1.4
    expect(analytics.distributionPeakPercentage).toBeGreaterThanOrEqual(100 / 6);

    // Hottest face should be 6 (rolled 3 times out of 4)
    expect(analytics.hottestFaces).toEqual([6]);
    expect(analytics.coldestFaces.length).toBeGreaterThan(0);

    // insightSummary should be a descriptive English narrative
    expect(typeof analytics.insightSummary).toBe('string');
    expect(analytics.insightSummary).toContain('Small sample (4 dice)');
    expect(analytics.insightSummary).toContain('Running hot');
  });

  it('computes coin d2 zScore, coinStats, and distribution scaling accurately', () => {
    const configD2 = {
      faces: 2 as const,
      countPerRoll: 2,
      seriesLength: 2,
      playerId: 'p1',
    };

    // 4 tosses: 3 Heads (1), 1 Tails (2)
    const r0 = computeRoundResult(0, [1, 1], 2); // 2 Heads -> HEADS won
    const r1 = computeRoundResult(1, [1, 2], 2); // 1 Heads, 1 Tails -> TIE
    const analytics = computeSeriesAnalytics(configD2, [r0, r1]);

    expect(analytics.kind).toBe('coin');
    expect(analytics.totalDiceRolled).toBe(4);
    // theoreticalRoundStdDev for 2d2: sqrt(2 * (4 - 1) / 12) = sqrt(6 / 12) = sqrt(0.5) = ~0.7071
    expect(analytics.theoreticalRoundStdDev).toBeCloseTo(Math.SQRT1_2, 4);

    // zScore for d2: (headsCount - 0.5 * n) / (0.5 * sqrt(n)) = (3 - 2) / (0.5 * 2) = 1.0
    expect(analytics.zScore).toBeCloseTo(1.0, 4);

    expect(analytics.coinStats.headsCount).toBe(3);
    expect(analytics.coinStats.tailsCount).toBe(1);
    expect(analytics.coinStats.headsPercentage).toBe(75);
    expect(analytics.coinStats.tailsPercentage).toBe(25);
    expect(analytics.coinStats.headsDeltaPercentage).toBe(25); // 75 - 50
    expect(analytics.coinStats.tailsDeltaPercentage).toBe(-25); // 25 - 50
    expect(analytics.coinStats.headsRoundsWon).toBe(1);
    expect(analytics.coinStats.tailsRoundsWon).toBe(0);
    expect(analytics.coinStats.tieRounds).toBe(1);

    // distributionPeakPercentage should scale relative to the highest empirical bar (75%)
    expect(analytics.distributionPeakPercentage).toBe(75);

    expect(analytics.insightSummary).toContain('Heads-leaning');
  });

  it('classifies sampleReliability levels correctly from empty to solid', () => {
    const configD20: RollConfig = {
      faces: 20,
      countPerRoll: 10,
      seriesLength: 4,
      playerId: 'p1',
    };

    expect(computeSeriesAnalytics(configD20, []).sampleReliability).toBe('empty');

    const singleRoundSmall = [computeRoundResult(0, [5, 10, 15], 20)];
    expect(computeSeriesAnalytics(configD20, singleRoundSmall).sampleReliability).toBe('small'); // 3 dice

    const fifteenDice = [
      computeRoundResult(0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 20),
      computeRoundResult(1, [11, 12, 13, 14, 15], 20),
    ];
    expect(computeSeriesAnalytics(configD20, fifteenDice).sampleReliability).toBe('moderate'); // 15 dice

    const thirtyDice = [
      computeRoundResult(0, Array(10).fill(10), 20),
      computeRoundResult(1, Array(10).fill(10), 20),
      computeRoundResult(2, Array(10).fill(10), 20),
    ];
    expect(computeSeriesAnalytics(configD20, thirtyDice).sampleReliability).toBe('solid'); // 30 dice
  });
});

describe('statistical template helpers', () => {
  it('maps sample reliability tiers to labels', () => {
    expect(getSampleReliabilityLabel('empty')).toBe('No Rolls');
    expect(getSampleReliabilityLabel('small')).toBe('Small sample (<10)');
    expect(getSampleReliabilityLabel('moderate')).toBe('Moderate sample (10–29)');
    expect(getSampleReliabilityLabel('solid')).toBe('Solid sample (30+)');
  });

  it('derives qualitative coin z-score verdicts', () => {
    expect(getCoinZQualitative(0, 'empty')).toBe('No data');
    expect(getCoinZQualitative(2.5, 'empty')).toBe('No data');
    expect(getCoinZQualitative(0.4, 'small')).toBe('Within normal variance');
    expect(getCoinZQualitative(-0.99, 'moderate')).toBe('Within normal variance');
    expect(getCoinZQualitative(1.0, 'solid')).toBe('Heads-leaning');
    expect(getCoinZQualitative(-1.2, 'solid')).toBe('Tails-leaning');
  });

  it('classifies percentage delta with threshold deadband', () => {
    expect(classifyDelta(0.06)).toBe('positive');
    expect(classifyDelta(0.05)).toBe('neutral');
    expect(classifyDelta(0)).toBe('neutral');
    expect(classifyDelta(-0.05)).toBe('neutral');
    expect(classifyDelta(-0.06)).toBe('negative');
  });

  it('resolves coin split percentages from coinStats on populated and empty summaries', () => {
    const coinConfig = { faces: 2 as const, countPerRoll: 4, seriesLength: 1, playerId: 'p1' };
    const r0 = computeRoundResult(0, [1, 1, 1, 2], 2);
    const modernSummary = computeSeriesSummary('s-coin', coinConfig, 'Alice', [r0]);

    expect(modernSummary.analytics.sampleReliabilityLabel).toBe('Small sample (<10)');
    expect(modernSummary.analytics.coinStats.zQualitative).toBe('Heads-leaning');
    expect(getCoinSplitPercentages(modernSummary)).toEqual({
      headsPct: 75,
      tailsPct: 25,
      headsCount: 3,
      tailsCount: 1,
    });

    const emptyCoinSummary = computeSeriesSummary('s-coin-empty', coinConfig, 'Alice', []);
    expect(getCoinSplitPercentages(emptyCoinSummary)).toEqual({
      headsPct: 0,
      tailsPct: 0,
      headsCount: 0,
      tailsCount: 0,
    });
  });

  it('populates distribution bar metrics and hottest face flags in computeSeriesAnalytics', () => {
    const config: RollConfig = { faces: 6, countPerRoll: 4, seriesLength: 1, playerId: 'p1' };
    const analytics = computeSeriesAnalytics(config, [computeRoundResult(0, [6, 6, 6, 1], 6)]);

    const face6 = analytics.distribution.find((d) => d.face === 6);
    const face2 = analytics.distribution.find((d) => d.face === 2);
    expect(face6?.isHot).toBe(true);
    expect(face6?.barWidthPercentage).toBeCloseTo(100);
    expect(face6?.deltaDirection).toBe('positive');
    expect(face6?.expectedMarkerPercentage).toBeGreaterThan(0);
    expect(face2?.isHot).toBe(false);
    expect(face2?.deltaDirection).toBe('negative');
  });
});

describe('computeSeriesSummary rounds typing', () => {
  const coinConfig: RollConfig = { faces: 2, countPerRoll: 1, seriesLength: 2, playerId: 'p' };
  const diceConfig: RollConfig = { faces: 6, countPerRoll: 1, seriesLength: 2, playerId: 'p' };

  it('narrows rounds to coin rounds after a kind check', () => {
    const summary = computeSeriesSummary('s', coinConfig, 'A', [computeRoundResult(0, [1], 2)]);
    if (summary.kind !== 'coin') throw new Error('expected coin summary');
    expect(summary.rounds[0].roundWinnerSide).toBe('HEADS');
  });

  it('narrows rounds to dice rounds after a kind check', () => {
    const summary = computeSeriesSummary('s', diceConfig, 'A', [computeRoundResult(0, [4], 6)]);
    if (summary.kind !== 'dice') throw new Error('expected dice summary');
    expect(summary.rounds[0].sum).toBe(4);
  });

  it('throws when a coin config receives dice rounds', () => {
    expect(() =>
      computeSeriesSummary('s', coinConfig, 'A', [computeRoundResult(0, [4], 6)]),
    ).toThrow(/coin config received non-coin rounds/);
  });

  it('throws when a dice config receives coin rounds', () => {
    expect(() =>
      computeSeriesSummary('s', diceConfig, 'A', [computeRoundResult(0, [1], 2)]),
    ).toThrow(/dice config received non-dice rounds/);
  });
});
