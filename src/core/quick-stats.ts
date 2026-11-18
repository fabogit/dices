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

    let insight = '';
    if (count === 1) {
      insight = headsCount === 1 ? 'Landed Heads (winning face).' : 'Landed Tails.';
    } else {
      if (headsCount > tailsCount) {
        insight = `Heads majority (${headsCount}H / ${tailsCount}T, ${headsPercentage.toFixed(0)}%).`;
      } else if (tailsCount > headsCount) {
        insight = `Tails majority (${tailsCount}T / ${headsCount}H, ${tailsPercentage.toFixed(0)}%).`;
      } else {
        insight = `Even split (${headsCount}H / ${tailsCount}T).`;
      }
    }

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

  let insight = '';
  if (count === 1) {
    const val = round.values[0] ?? 0;
    if (val === actualFaces) {
      insight = `Natural ${actualFaces}! Maximum possible roll.`;
    } else if (val === 1) {
      insight = 'Natural 1. Minimum possible roll.';
    } else if (sumDelta > 0) {
      insight = `Rolled ${val} (+${sumDelta.toFixed(1)} vs E[X] ${expectedSum.toFixed(1)}). Above average.`;
    } else if (sumDelta < 0) {
      insight = `Rolled ${val} (${sumDelta.toFixed(1)} vs E[X] ${expectedSum.toFixed(1)}). Below average.`;
    } else {
      insight = `Rolled ${val} (exact expected average ${expectedSum.toFixed(1)}).`;
    }
  } else {
    const critParts: string[] = [];
    if (criticalMaxCount > 0) {
      critParts.push(`${criticalMaxCount}x nat ${actualFaces}`);
    }
    if (criticalMinCount > 0) {
      critParts.push(`${criticalMinCount}x nat 1`);
    }
    const critText = critParts.length > 0 ? ` (${critParts.join(', ')})` : '';

    if (zScore >= 1.0) {
      insight = `High roll: sum ${sum} (+${sumDelta.toFixed(1)} vs E[X] ${expectedSum.toFixed(1)})${critText}.`;
    } else if (zScore <= -1.0) {
      insight = `Low roll: sum ${sum} (${sumDelta.toFixed(1)} vs E[X] ${expectedSum.toFixed(1)})${critText}.`;
    } else {
      insight = `Typical roll: sum ${sum} (E[X] ${expectedSum.toFixed(1)})${critText}.`;
    }
  }

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
      insight: `No ${currentFaces === 2 ? 'coin' : `d${currentFaces}`} rolls in this session yet.`,
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

    let balanceVerdict = 'Evenly balanced';
    if (Math.abs(coinZ) < 1.0) {
      balanceVerdict = 'Evenly balanced';
    } else if (coinZ >= 1.0) {
      balanceVerdict = 'Heads-leaning';
    } else {
      balanceVerdict = 'Tails-leaning';
    }

    const insight = `${matchingThrows} throws (${totalDiceCount} coins): ${headsPercentage.toFixed(1)}% Heads / ${tailsPercentage.toFixed(1)}% Tails (${balanceVerdict.toLowerCase()}).`;

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

  const sign = averageDelta >= 0 ? '+' : '';
  const insight = `${matchingThrows} throws (${totalDiceCount} dice): avg die ${actualAverage.toFixed(2)} (${sign}${averageDelta.toFixed(2)} vs E[X] ${expectedAverage.toFixed(1)}). ${criticalMaxCount} max crits, ${criticalMinCount} nat 1s.`;

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
