import { describe, expect, it } from 'vite-plus/test';
import { computeQuickRollSessionStats, computeQuickRollStats } from '../quick-stats';
import { computeRoundResult } from '../round';

describe('computeQuickRollStats', () => {
  it('computes single coin toss and multi-coin statistics', () => {
    const singleCoin = computeRoundResult(0, [1], 2);
    const stats1 = computeQuickRollStats(singleCoin);
    expect(stats1.faces).toBe(2);
    expect(stats1.headsCount).toBe(1);
    expect(stats1.tailsCount).toBe(0);
    expect(stats1.headsPercentage).toBe(100);
    expect(stats1.insight).toContain('Landed Heads');

    const singleTails = computeRoundResult(0, [2], 2);
    const statsTails = computeQuickRollStats(singleTails);
    expect(statsTails.insight).toBe('Landed Tails.');

    const multiCoin = computeRoundResult(0, [1, 1, 2], 2);
    const stats2 = computeQuickRollStats(multiCoin);
    expect(stats2.headsCount).toBe(2);
    expect(stats2.tailsCount).toBe(1);
    expect(stats2.headsPercentage).toBeCloseTo(66.67, 1);
    expect(stats2.insight).toContain('Heads majority');

    const multiTails = computeRoundResult(0, [1, 2, 2], 2);
    const stats3 = computeQuickRollStats(multiTails);
    expect(stats3.insight).toContain('Tails majority');

    const evenSplit = computeRoundResult(0, [1, 2], 2);
    const statsEven = computeQuickRollStats(evenSplit);
    expect(statsEven.insight).toBe('Even split (1H / 1T).');
  });

  it('computes polyhedral dice single roll insights (nat 20, nat 1, delta)', () => {
    const nat20 = computeRoundResult(0, [20], 20);
    const stats20 = computeQuickRollStats(nat20);
    expect(stats20.expectedSum).toBe(10.5);
    expect(stats20.sumDelta).toBe(9.5);
    expect(stats20.criticalMaxCount).toBe(1);
    expect(stats20.insight).toContain('Natural 20! Maximum possible roll');

    const nat1 = computeRoundResult(0, [1], 20);
    const stats1 = computeQuickRollStats(nat1);
    expect(stats1.criticalMinCount).toBe(1);
    expect(stats1.insight).toContain('Natural 1. Minimum possible roll');

    const aboveAvg = computeRoundResult(0, [5], 6);
    const statsAbove = computeQuickRollStats(aboveAvg);
    expect(statsAbove.insight).toContain('Above average');

    const belowAvg = computeRoundResult(0, [2], 6);
    const statsBelow = computeQuickRollStats(belowAvg);
    expect(statsBelow.insight).toContain('Below average');
  });

  it('computes multi-dice round statistics and standardized z-score', () => {
    // 3d6 roll: [6, 6, 5] -> sum 17
    // Expected sum: 3 * 3.5 = 10.5. sumDelta = 6.5
    const roll3d6 = computeRoundResult(0, [6, 6, 5], 6);
    const stats = computeQuickRollStats(roll3d6);
    expect(stats.sum).toBe(17);
    expect(stats.expectedSum).toBe(10.5);
    expect(stats.sumDelta).toBe(6.5);
    expect(stats.criticalMaxCount).toBe(2);
    expect(stats.zScore).toBeGreaterThan(1.5);
    expect(stats.insight).toContain('High roll');
    expect(stats.insight).toContain('2x nat 6');

    // 3d6 low roll: [1, 1, 1] -> sum 3
    const low3d6 = computeRoundResult(0, [1, 1, 1], 6);
    const statsLow = computeQuickRollStats(low3d6);
    expect(statsLow.zScore).toBeLessThan(-1.5);
    expect(statsLow.insight).toContain('Low roll: sum 3');
    expect(statsLow.insight).toContain('3x nat 1');

    // 3d6 typical roll: [3, 4, 4] -> sum 11 (near 10.5)
    const typical3d6 = computeRoundResult(0, [3, 4, 4], 6);
    const statsTypical = computeQuickRollStats(typical3d6);
    expect(Math.abs(statsTypical.zScore)).toBeLessThan(1.0);
    expect(statsTypical.insight).toContain('Typical roll: sum 11');
  });
});

describe('computeQuickRollSessionStats', () => {
  it('filters rolls matching active die face so d6 and d20 are not mixed', () => {
    const rD6_1 = computeRoundResult(0, [4], 6);
    const rD6_2 = computeRoundResult(1, [6], 6);
    const rD20 = computeRoundResult(2, [20], 20);

    const quickRolls = [rD20, rD6_2, rD6_1];

    const d6Session = computeQuickRollSessionStats(quickRolls, 6);
    if (d6Session.kind !== 'dice') throw new Error('Expected dice quick roll session stats');
    expect(d6Session.matchingThrows).toBe(2);
    expect(d6Session.totalDiceCount).toBe(2);
    // Average of 4 and 6 is 5.0
    expect(d6Session.actualAverage).toBe(5.0);
    expect(d6Session.expectedAverage).toBe(3.5);
    expect(d6Session.averageDelta).toBe(1.5);
    expect(d6Session.criticalMaxCount).toBe(1);

    const d20Session = computeQuickRollSessionStats(quickRolls, 20);
    if (d20Session.kind !== 'dice') throw new Error('Expected d20 quick roll session stats');
    expect(d20Session.matchingThrows).toBe(1);
    expect(d20Session.actualAverage).toBe(20.0);
  });

  it('computes coin balance verdict and session split', () => {
    const r1 = computeRoundResult(0, [1, 1], 2);
    const r2 = computeRoundResult(1, [1, 2], 2);

    const coinSession = computeQuickRollSessionStats([r2, r1], 2);
    if (coinSession.kind !== 'coin') throw new Error('Expected coin quick roll session stats');
    expect(coinSession.matchingThrows).toBe(2);
    expect(coinSession.totalDiceCount).toBe(4);
    expect(coinSession.totalHeads).toBe(3);
    expect(coinSession.totalTails).toBe(1);
    expect(coinSession.headsPercentage).toBe(75);
    expect(coinSession.tailsPercentage).toBe(25);
    expect(coinSession.balanceVerdict).toBe('Heads-leaning');
    expect(coinSession.insight).toContain('75.0% Heads / 25.0% Tails');

    // Tails-leaning session
    const rTails1 = computeRoundResult(2, [2, 2], 2);
    const rTails2 = computeRoundResult(3, [2, 2], 2);
    const tailsSession = computeQuickRollSessionStats([rTails2, rTails1], 2);
    if (tailsSession.kind !== 'coin') throw new Error('Expected coin quick roll session stats');
    expect(tailsSession.balanceVerdict).toBe('Tails-leaning');
    expect(tailsSession.headsPercentage).toBe(0);
    expect(tailsSession.tailsPercentage).toBe(100);

    // Evenly balanced session
    const rEven1 = computeRoundResult(4, [1, 2], 2);
    const rEven2 = computeRoundResult(5, [1, 2], 2);
    const evenSession = computeQuickRollSessionStats([rEven2, rEven1], 2);
    if (evenSession.kind !== 'coin') throw new Error('Expected coin quick roll session stats');
    expect(evenSession.balanceVerdict).toBe('Evenly balanced');
    expect(evenSession.headsPercentage).toBe(50);
  });

  it('handles empty quick roll sessions gracefully', () => {
    const emptySession = computeQuickRollSessionStats([], 12);
    expect(emptySession.kind).toBe('empty');
    expect(emptySession.matchingThrows).toBe(0);
    expect(emptySession.totalDiceCount).toBe(0);
    expect(emptySession.insight).toContain('No d12 rolls');

    const emptyCoinSession = computeQuickRollSessionStats([], 2);
    expect(emptyCoinSession.kind).toBe('empty');
    expect(emptyCoinSession.insight).toContain('No coin rolls');
  });
});
