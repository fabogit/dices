import {
  generateCoinQuickRollInsight,
  generateCoinQuickSessionInsight,
  generateDiceQuickRollInsight,
  generateDiceQuickSessionInsight,
  generateEmptyQuickSessionInsight,
  getCoinBalanceVerdict,
} from './insights';
import type {
  CoinQuickRollSessionStats,
  CoinQuickRollStats,
  CoinRoundResult,
  DiceQuickRollSessionStats,
  DiceQuickRollStats,
  DiceRoundResult,
  DieFaces,
  EmptyQuickRollSessionStats,
  PolyhedralFaces,
  QuickRollSessionStats,
  QuickRollStats,
  RoundResult,
} from './types';

export function computeQuickRollStats(round: CoinRoundResult): CoinQuickRollStats;
export function computeQuickRollStats(round: DiceRoundResult): DiceQuickRollStats;
export function computeQuickRollStats(round: RoundResult): QuickRollStats;
export function computeQuickRollStats(round: RoundResult): QuickRollStats {
  const count = round.values.length;
  const timestamp = round.timestamp;

  if (round.kind === 'coin') {
    const { headsCount, tailsCount, roundWinnerSide } = round;
    const headsPercentage = count > 0 ? (headsCount / count) * 100 : 0;
    const tailsPercentage = count > 0 ? (tailsCount / count) * 100 : 0;

    const insight = generateCoinQuickRollInsight({
      count,
      headsCount,
      tailsCount,
      headsPercentage,
      tailsPercentage,
    });

    return {
      kind: 'coin',
      faces: 2,
      values: [...round.values],
      timestamp,
      roundWinnerSide,
      headsCount,
      tailsCount,
      headsPercentage,
      tailsPercentage,
      insight,
    };
  }

  // Polyhedral dice d4..d20
  const actualFaces = round.faces;
  const { sum, max, min } = round;
  const expectedDieMean = (actualFaces + 1) / 2;
  const expectedSum = count * expectedDieMean;
  const sumDelta = sum - expectedSum;
  const singleVariance = (actualFaces * actualFaces - 1) / 12;
  const stdDevSum = Math.sqrt(count * singleVariance);
  const zScore = count > 0 && stdDevSum > 0 ? (sum - expectedSum) / stdDevSum : 0;
  const criticalMaxCount = round.values.filter((v) => v === actualFaces).length;
  const criticalMinCount = round.values.filter((v) => v === 1).length;

  const insight = generateDiceQuickRollInsight({
    faces: actualFaces,
    values: round.values,
    sum,
    expectedSum,
    sumDelta,
    zScore,
    criticalMaxCount,
    criticalMinCount,
  });

  return {
    kind: 'dice',
    faces: actualFaces,
    values: [...round.values],
    timestamp,
    sum,
    max,
    min,
    expectedSum,
    sumDelta,
    zScore,
    criticalMaxCount,
    criticalMinCount,
    insight,
  };
}

export function computeQuickRollSessionStats(
  quickRolls: RoundResult[],
  currentFaces: 2,
): EmptyQuickRollSessionStats | CoinQuickRollSessionStats;
export function computeQuickRollSessionStats(
  quickRolls: RoundResult[],
  currentFaces: PolyhedralFaces,
): EmptyQuickRollSessionStats | DiceQuickRollSessionStats;
export function computeQuickRollSessionStats(
  quickRolls: RoundResult[],
  currentFaces: DieFaces,
): QuickRollSessionStats;
export function computeQuickRollSessionStats(
  quickRolls: RoundResult[],
  currentFaces: DieFaces,
): QuickRollSessionStats {
  const matchingRolls = quickRolls.filter((r) => r.faces === currentFaces);
  const matchingThrows = matchingRolls.length;
  const allValues = matchingRolls.flatMap((r) => r.values);
  const totalDiceCount = allValues.length;

  if (matchingThrows === 0) {
    return {
      kind: 'empty',
      faces: currentFaces,
      matchingThrows: 0,
      totalDiceCount: 0,
      insight: generateEmptyQuickSessionInsight(currentFaces),
    };
  }

  if (currentFaces === 2) {
    const totalHeads = allValues.filter((v) => v === 1).length;
    const totalTails = allValues.filter((v) => v === 2).length;
    const headsPercentage = totalDiceCount > 0 ? (totalHeads / totalDiceCount) * 100 : 0;
    const tailsPercentage = totalDiceCount > 0 ? (totalTails / totalDiceCount) * 100 : 0;

    const coinZ =
      totalDiceCount > 0
        ? (totalHeads - 0.5 * totalDiceCount) / (0.5 * Math.sqrt(totalDiceCount))
        : 0;

    const balanceVerdict = getCoinBalanceVerdict(coinZ);
    const insight = generateCoinQuickSessionInsight({
      matchingThrows,
      totalDiceCount,
      headsPercentage,
      tailsPercentage,
      balanceVerdict,
    });

    return {
      kind: 'coin',
      faces: 2,
      matchingThrows,
      totalDiceCount,
      totalHeads,
      totalTails,
      headsPercentage,
      tailsPercentage,
      balanceVerdict,
      insight,
    };
  }

  // Polyhedral dice d4..d20
  const totalSum = allValues.reduce((acc, v) => acc + v, 0);
  const actualAverage = totalDiceCount > 0 ? totalSum / totalDiceCount : 0;
  const expectedAverage = (currentFaces + 1) / 2;
  const averageDelta = actualAverage - expectedAverage;
  const criticalMaxCount = allValues.filter((v) => v === currentFaces).length;
  const criticalMinCount = allValues.filter((v) => v === 1).length;

  const insight = generateDiceQuickSessionInsight({
    matchingThrows,
    totalDiceCount,
    actualAverage,
    expectedAverage,
    averageDelta,
    criticalMaxCount,
    criticalMinCount,
  });

  return {
    kind: 'dice',
    faces: currentFaces,
    matchingThrows,
    totalDiceCount,
    actualAverage,
    expectedAverage,
    averageDelta,
    criticalMaxCount,
    criticalMinCount,
    insight,
  };
}
