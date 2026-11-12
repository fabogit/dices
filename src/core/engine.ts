import { validateRollConfig } from './csprng';
import { LocalCryptoRollProvider, type IRollProvider } from './provider';
import type {
  CoinSeriesStats,
  CoinSide,
  DieFaces,
  FaceDistributionEntry,
  ModeStat,
  Player,
  PlayerLeaderboardEntry,
  QuickRollSessionStats,
  QuickRollStats,
  RollConfig,
  RoundResult,
  SeriesAnalytics,
  SeriesSummary,
} from './types';

export function computeRoundResult(
  roundIndex: number,
  values: number[],
  faces: DieFaces,
  timestamp: number = Date.now(),
): RoundResult {
  const sum = values.reduce((acc, v) => acc + v, 0);
  const max = values.length > 0 ? Math.max(...values) : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;

  if (faces === 2) {
    const headsCount = values.filter((v) => v === 1).length;
    const tailsCount = values.filter((v) => v === 2).length;
    const roundWinnerSide: CoinSide | 'TIE' =
      headsCount > tailsCount ? 'HEADS' : tailsCount > headsCount ? 'TAILS' : 'TIE';

    return {
      roundIndex,
      values: [...values],
      sum,
      max,
      min,
      headsCount,
      tailsCount,
      roundWinnerSide,
      timestamp,
    };
  }

  return {
    roundIndex,
    values: [...values],
    sum,
    max,
    min,
    timestamp,
  };
}

export function computeMode(values: number[]): ModeStat {
  if (values.length === 0) {
    return {
      values: [],
      frequency: 0,
      isTie: false,
    };
  }

  const freqMap = new Map<number, number>();
  for (const v of values) {
    freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
  }

  let maxFrequency = 0;
  for (const count of freqMap.values()) {
    if (count > maxFrequency) {
      maxFrequency = count;
    }
  }

  const topValues: number[] = [];
  for (const [val, count] of freqMap.entries()) {
    if (count === maxFrequency) {
      topValues.push(val);
    }
  }

  topValues.sort((a, b) => a - b);

  return {
    values: topValues,
    frequency: maxFrequency,
    isTie: topValues.length > 1,
  };
}

function generateSeriesInsightSummary(
  faces: DieFaces,
  totalDiceRolled: number,
  _roundsCount: number,
  roundAverage: number,
  expectedRoundAverage: number,
  zScore: number,
  sampleReliability: 'empty' | 'small' | 'moderate' | 'solid',
  criticalMaxCount: number,
  criticalMaxRate: number,
  criticalMinCount: number,
  criticalMinRate: number,
  hottestFaces: number[],
  coinStats?: CoinSeriesStats,
): string {
  if (totalDiceRolled === 0) {
    return 'No rolls recorded yet. Complete a round to generate statistical insights.';
  }

  const samplePrefix =
    sampleReliability === 'small'
      ? `Small sample (${totalDiceRolled} ${faces === 2 ? 'tosses' : 'dice'}): `
      : '';

  if (faces === 2 && coinStats) {
    let verdict = '';
    const absZ = Math.abs(zScore);
    if (absZ < 1.0) {
      verdict = `Balanced coin split (${coinStats.headsPercentage.toFixed(1)}% Heads / ${coinStats.tailsPercentage.toFixed(1)}% Tails), within normal variance (z = ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}).`;
    } else if (zScore >= 1.0) {
      verdict = `Heads-leaning outcome (${coinStats.headsPercentage.toFixed(1)}% Heads, +${(coinStats.headsPercentage - 50).toFixed(1)}% vs fair baseline, z = +${zScore.toFixed(2)}).`;
    } else {
      verdict = `Tails-leaning outcome (${coinStats.tailsPercentage.toFixed(1)}% Tails, +${(coinStats.tailsPercentage - 50).toFixed(1)}% vs fair baseline, z = ${zScore.toFixed(2)}).`;
    }

    if (sampleReliability === 'small') {
      verdict += ' Additional tosses recommended for statistical confidence.';
    }
    return `${samplePrefix}${verdict}`;
  }

  // Polyhedral dice (d4..d20)
  let performanceVerdict = '';
  const absZ = Math.abs(zScore);
  if (absZ < 1.0) {
    performanceVerdict = `Performing within expected variance (avg round ${roundAverage.toFixed(1)} vs E[X] = ${expectedRoundAverage.toFixed(1)}, z = ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}).`;
  } else if (zScore >= 1.0) {
    performanceVerdict = `Running hot above theoretical expectation (avg round ${roundAverage.toFixed(1)} vs E[X] = ${expectedRoundAverage.toFixed(1)}, z = +${zScore.toFixed(2)}).`;
  } else {
    performanceVerdict = `Running cold below theoretical expectation (avg round ${roundAverage.toFixed(1)} vs E[X] = ${expectedRoundAverage.toFixed(1)}, z = ${zScore.toFixed(2)}).`;
  }

  const highlights: string[] = [];
  if (criticalMaxCount > 0 && criticalMaxRate >= (100 / faces) * 1.2) {
    highlights.push(`${criticalMaxCount}x crit max (${faces}) at ${criticalMaxRate.toFixed(1)}%`);
  }
  if (criticalMinCount > 0 && criticalMinRate >= (100 / faces) * 1.2) {
    highlights.push(`${criticalMinCount}x nat 1 at ${criticalMinRate.toFixed(1)}%`);
  }
  if (hottestFaces.length > 0 && hottestFaces.length <= 2) {
    highlights.push(`face ${hottestFaces.join(', ')} rolled most`);
  }

  const highlightStr = highlights.length > 0 ? ` Highlights: ${highlights.join('; ')}.` : '';
  const caution =
    sampleReliability === 'small' ? ' More rounds needed for statistical confidence.' : '';

  return `${samplePrefix}${performanceVerdict}${highlightStr}${caution}`;
}

export function computeSeriesAnalytics(
  config: RollConfig,
  rounds: RoundResult[],
): SeriesAnalytics {
  const allValues = rounds.flatMap((r) => r.values);
  const totalDiceRolled = allValues.length;
  const totalSum = allValues.reduce((acc, v) => acc + v, 0);
  const expectedRoundAverage = config.countPerRoll * ((config.faces + 1) / 2);

  const roundAverage =
    rounds.length > 0 ? rounds.reduce((acc, r) => acc + r.sum, 0) / rounds.length : 0;
  const averageDelta = rounds.length > 0 ? roundAverage - expectedRoundAverage : 0;

  // Population Standard Deviation of round sums
  let standardDeviation = 0;
  if (rounds.length > 0) {
    const variance =
      rounds.reduce((acc, r) => acc + Math.pow(r.sum - roundAverage, 2), 0) / rounds.length;
    standardDeviation = Math.sqrt(variance);
  }

  // Theoretical standard deviation of round sums: sqrt(count * (faces^2 - 1) / 12)
  const theoreticalRoundStdDev = Math.sqrt(
    config.countPerRoll * ((config.faces * config.faces - 1) / 12),
  );

  // Critical counts and high roll counts
  let highRollCount = 0;
  let criticalMaxCount = 0;
  let criticalMinCount = 0;

  if (config.faces === 2) {
    // For d2, 1 = HEADS (criticalMax & highRoll), 2 = TAILS (criticalMin)
    for (const v of allValues) {
      if (v === 1) {
        highRollCount++;
        criticalMaxCount++;
      } else if (v === 2) {
        criticalMinCount++;
      }
    }
  } else {
    const half = config.faces / 2;
    for (const v of allValues) {
      if (v > half) {
        highRollCount++;
      }
      if (v === config.faces) {
        criticalMaxCount++;
      }
      if (v === 1) {
        criticalMinCount++;
      }
    }
  }

  const highRollRate = totalDiceRolled > 0 ? (highRollCount / totalDiceRolled) * 100 : 0;
  const criticalMaxRate = totalDiceRolled > 0 ? (criticalMaxCount / totalDiceRolled) * 100 : 0;
  const criticalMinRate = totalDiceRolled > 0 ? (criticalMinCount / totalDiceRolled) * 100 : 0;

  // Distribution for faces 1..faces
  const freqMap = new Map<number, number>();
  for (const v of allValues) {
    freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
  }

  const expectedPercentage = 100 / config.faces;
  const distribution: FaceDistributionEntry[] = [];

  for (let face = 1; face <= config.faces; face++) {
    const count = freqMap.get(face) ?? 0;
    const percentage = totalDiceRolled > 0 ? (count / totalDiceRolled) * 100 : 0;
    const deltaPercentage = percentage - expectedPercentage;
    const label =
      config.faces === 2
        ? face === 1
          ? 'HEADS'
          : 'TAILS'
        : `${face}`;

    distribution.push({
      face,
      label,
      count,
      percentage,
      expectedPercentage,
      deltaPercentage,
    });
  }

  // Distribution peak percentage for proportional bar and expected-marker scaling
  const maxEmpiricalPercentage =
    distribution.length > 0 ? Math.max(...distribution.map((d) => d.percentage)) : 0;
  const distributionPeakPercentage = Math.max(
    maxEmpiricalPercentage,
    expectedPercentage * 1.4,
    1,
  );

  // Sample reliability classification
  let sampleReliability: 'empty' | 'small' | 'moderate' | 'solid' = 'empty';
  if (totalDiceRolled === 0) {
    sampleReliability = 'empty';
  } else if (totalDiceRolled < 10) {
    sampleReliability = 'small';
  } else if (totalDiceRolled < 30) {
    sampleReliability = 'moderate';
  } else {
    sampleReliability = 'solid';
  }

  // Standardized z-score calculation
  let zScore = 0;
  if (totalDiceRolled > 0) {
    if (config.faces === 2) {
      // For d2, positive = Heads-leaning: (headsCount - 0.5 * n) / (0.5 * sqrt(n))
      const headsCount = criticalMaxCount;
      const stdDevHeads = 0.5 * Math.sqrt(totalDiceRolled);
      zScore = stdDevHeads > 0 ? (headsCount - 0.5 * totalDiceRolled) / stdDevHeads : 0;
    } else {
      // For d4..d20: (totalSum - n * expectedMean) / sqrt(n * (faces^2 - 1) / 12)
      const expectedTotalSum = totalDiceRolled * ((config.faces + 1) / 2);
      const totalStdDev = Math.sqrt(
        totalDiceRolled * ((config.faces * config.faces - 1) / 12),
      );
      zScore = totalStdDev > 0 ? (totalSum - expectedTotalSum) / totalStdDev : 0;
    }
  }

  // Hottest and coldest faces
  let hottestFaces: number[] = [];
  let coldestFaces: number[] = [];
  if (totalDiceRolled > 0 && distribution.length > 0) {
    const counts = distribution.map((d) => d.count);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    if (maxCount > minCount) {
      hottestFaces = distribution.filter((d) => d.count === maxCount).map((d) => d.face);
      coldestFaces = distribution.filter((d) => d.count === minCount).map((d) => d.face);
    }
  }

  // Coin-specific statistics
  let coinStats: CoinSeriesStats | undefined = undefined;
  if (config.faces === 2) {
    const headsCount = criticalMaxCount;
    const tailsCount = criticalMinCount;
    const headsPercentage = totalDiceRolled > 0 ? (headsCount / totalDiceRolled) * 100 : 0;
    const tailsPercentage = totalDiceRolled > 0 ? (tailsCount / totalDiceRolled) * 100 : 0;
    const headsDeltaPercentage = headsPercentage - 50;
    const tailsDeltaPercentage = tailsPercentage - 50;
    const headsRoundsWon = rounds.filter((r) => r.roundWinnerSide === 'HEADS').length;
    const tailsRoundsWon = rounds.filter((r) => r.roundWinnerSide === 'TAILS').length;
    const tieRounds = rounds.filter((r) => r.roundWinnerSide === 'TIE').length;

    coinStats = {
      headsCount,
      tailsCount,
      headsPercentage,
      tailsPercentage,
      headsDeltaPercentage,
      tailsDeltaPercentage,
      headsRoundsWon,
      tailsRoundsWon,
      tieRounds,
    };
  }

  const insightSummary = generateSeriesInsightSummary(
    config.faces,
    totalDiceRolled,
    rounds.length,
    roundAverage,
    expectedRoundAverage,
    zScore,
    sampleReliability,
    criticalMaxCount,
    criticalMaxRate,
    criticalMinCount,
    criticalMinRate,
    hottestFaces,
    coinStats,
  );

  return {
    totalDiceRolled,
    expectedRoundAverage,
    averageDelta,
    standardDeviation,
    theoreticalRoundStdDev,
    zScore,
    sampleReliability,
    distributionPeakPercentage,
    hottestFaces,
    coldestFaces,
    highRollCount,
    highRollRate,
    criticalMaxCount,
    criticalMaxRate,
    criticalMinCount,
    criticalMinRate,
    distribution,
    coinStats,
    insightSummary,
  };
}

export function computeSeriesSummary(
  id: string,
  config: RollConfig,
  playerName: string,
  rounds: RoundResult[],
  completedAt: number = Date.now(),
): SeriesSummary {
  const analytics = computeSeriesAnalytics(config, rounds);

  if (rounds.length === 0) {
    return {
      id,
      config: { ...config },
      playerId: config.playerId,
      playerName,
      rounds: [],
      totalSum: 0,
      overallMax: 0,
      overallMin: 0,
      average: 0,
      bestRoundIndex: -1,
      worstRoundIndex: -1,
      mode: { values: [], frequency: 0, isTie: false },
      analytics,
      completedAt,
    };
  }

  const totalSum = rounds.reduce((acc, r) => acc + r.sum, 0);
  const overallMax = Math.max(...rounds.map((r) => r.max));
  const overallMin = Math.min(...rounds.map((r) => r.min));
  const average = totalSum / rounds.length;

  let bestRoundIndex = rounds[0].roundIndex;
  let bestSum = rounds[0].sum;
  let worstRoundIndex = rounds[0].roundIndex;
  let worstSum = rounds[0].sum;

  for (let i = 1; i < rounds.length; i++) {
    const round = rounds[i];
    if (round.sum > bestSum) {
      bestSum = round.sum;
      bestRoundIndex = round.roundIndex;
    }
    if (round.sum < worstSum) {
      worstSum = round.sum;
      worstRoundIndex = round.roundIndex;
    }
  }

  const allValues = rounds.flatMap((r) => r.values);
  const mode = computeMode(allValues);

  const summary: SeriesSummary = {
    id,
    config: { ...config },
    playerId: config.playerId,
    playerName,
    rounds: [...rounds],
    totalSum,
    overallMax,
    overallMin,
    average,
    bestRoundIndex,
    worstRoundIndex,
    mode,
    analytics,
    completedAt,
  };

  if (config.faces === 2) {
    const totalHeads = rounds.reduce((acc, r) => acc + (r.headsCount ?? 0), 0);
    const totalTails = rounds.reduce((acc, r) => acc + (r.tailsCount ?? 0), 0);
    const headsRoundsWon = rounds.filter((r) => r.roundWinnerSide === 'HEADS').length;
    const tailsRoundsWon = rounds.filter((r) => r.roundWinnerSide === 'TAILS').length;
    const coinSeriesWinner: CoinSide | 'TIE' =
      headsRoundsWon > tailsRoundsWon
        ? 'HEADS'
        : tailsRoundsWon > headsRoundsWon
          ? 'TAILS'
          : 'TIE';

    summary.totalHeads = totalHeads;
    summary.totalTails = totalTails;
    summary.headsRoundsWon = headsRoundsWon;
    summary.tailsRoundsWon = tailsRoundsWon;
    summary.coinSeriesWinner = coinSeriesWinner;
  }

  return summary;
}

export function computePlayerLeaderboard(
  history: SeriesSummary[],
  players: Player[],
): PlayerLeaderboardEntry[] {
  const playerMap = new Map<string, { name: string; color: string }>();
  for (const p of players) {
    playerMap.set(p.id, { name: p.name, color: p.color });
  }
  for (const s of history) {
    if (!playerMap.has(s.playerId)) {
      playerMap.set(s.playerId, { name: s.playerName, color: '#94a3b8' });
    }
  }

  const entries: PlayerLeaderboardEntry[] = [];

  for (const [playerId, meta] of playerMap.entries()) {
    const playerSeries = history.filter((s) => s.playerId === playerId);
    const seriesPlayed = playerSeries.length;

    let totalRolls = 0;
    let criticalMaxCountTotal = 0;
    let weightedLuckScoreSum = 0;
    let coinSeriesWon = 0;
    let coinTosses = 0;
    let totalCoinHeads = 0;

    for (const s of playerSeries) {
      const rollsInSeries = s.analytics.totalDiceRolled;
      totalRolls += rollsInSeries;
      criticalMaxCountTotal += s.analytics.criticalMaxCount;

      let seriesLuck = 100;
      if (s.config.faces === 2) {
        const headsInSeries =
          s.totalHeads ??
          s.rounds.reduce((acc, r) => acc + (r.headsCount ?? 0), 0);
        coinTosses += rollsInSeries;
        totalCoinHeads += headsInSeries;

        if (rollsInSeries > 0) {
          const headsRate = (headsInSeries / rollsInSeries) * 100;
          seriesLuck = (headsRate / 50) * 100;
        } else {
          seriesLuck = 100;
        }

        if (s.coinSeriesWinner === 'HEADS') {
          coinSeriesWon++;
        }
      } else {
        if (s.analytics.expectedRoundAverage > 0 && s.rounds.length > 0) {
          seriesLuck = (s.average / s.analytics.expectedRoundAverage) * 100;
        } else {
          seriesLuck = 100;
        }
      }

      weightedLuckScoreSum += seriesLuck * rollsInSeries;
    }

    const normalizedLuckScore =
      totalRolls > 0 ? weightedLuckScoreSum / totalRolls : 100;
    const criticalMaxRate = totalRolls > 0 ? (criticalMaxCountTotal / totalRolls) * 100 : 0;
    const coinHeadsRate = coinTosses > 0 ? (totalCoinHeads / coinTosses) * 100 : undefined;

    entries.push({
      playerId,
      playerName: meta.name,
      color: meta.color,
      seriesPlayed,
      totalRolls,
      normalizedLuckScore,
      criticalMaxRate,
      coinSeriesWon,
      ...(coinTosses > 0 ? { coinHeadsRate, coinTosses } : {}),
    });
  }

  entries.sort((a, b) => {
    if (b.seriesPlayed === 0 && a.seriesPlayed === 0) return 0;
    if (b.seriesPlayed === 0) return -1;
    if (a.seriesPlayed === 0) return 1;
    return b.normalizedLuckScore - a.normalizedLuckScore;
  });

  return entries;
}

export function computeQuickRollStats(
  round: RoundResult,
  faces: DieFaces = (round.faces ?? 6),
): QuickRollStats {
  const actualFaces = round.faces ?? faces;
  const count = round.values.length;
  const timestamp = round.timestamp;

  if (actualFaces === 2) {
    const headsCount = round.headsCount ?? round.values.filter((v) => v === 1).length;
    const tailsCount = round.tailsCount ?? round.values.filter((v) => v === 2).length;
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
      faces: actualFaces,
      values: [...round.values],
      timestamp,
      headsCount,
      tailsCount,
      headsPercentage,
      tailsPercentage,
      insight,
    };
  }

  // Polyhedral dice d4..d20
  const sum = round.sum;
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
    faces: actualFaces,
    values: [...round.values],
    timestamp,
    sum,
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
  currentFaces: DieFaces,
): QuickRollSessionStats {
  const matchingRolls = quickRolls.filter(
    (r) => (r.faces ?? currentFaces) === currentFaces,
  );
  const matchingThrows = matchingRolls.length;
  const allValues = matchingRolls.flatMap((r) => r.values);
  const totalDiceCount = allValues.length;

  if (matchingThrows === 0) {
    return {
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
      faces: currentFaces,
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

export class RollSeriesEngine {
  readonly id: string;
  readonly config: RollConfig;
  readonly playerName: string;
  private readonly provider: IRollProvider;
  private _rounds: RoundResult[] = [];

  constructor(
    config: RollConfig,
    playerName: string,
    provider: IRollProvider = new LocalCryptoRollProvider(),
    id?: string,
  ) {
    validateRollConfig(config);
    this.config = { ...config };
    this.playerName = playerName;
    this.provider = provider;
    this.id =
      id ??
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `series-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  }

  get rounds(): ReadonlyArray<RoundResult> {
    return this._rounds;
  }

  get isComplete(): boolean {
    return this._rounds.length >= this.config.seriesLength;
  }

  get currentRoundIndex(): number {
    return this._rounds.length;
  }

  async rollNextRound(): Promise<RoundResult> {
    if (this.isComplete) {
      throw new Error(
        `Series is already complete (${this._rounds.length}/${this.config.seriesLength} rounds played)`,
      );
    }

    const values = await this.provider.rollRound(
      this.config.faces,
      this.config.countPerRoll,
    );
    const round = computeRoundResult(this._rounds.length, values, this.config.faces);
    round.faces = this.config.faces;
    this._rounds.push(round);
    return round;
  }

  async rollAllRemainingRounds(): Promise<RoundResult[]> {
    while (!this.isComplete) {
      await this.rollNextRound();
    }
    return [...this._rounds];
  }

  getSummary(completedAt?: number): SeriesSummary {
    return computeSeriesSummary(
      this.id,
      this.config,
      this.playerName,
      this._rounds,
      completedAt,
    );
  }

  reset(): void {
    this._rounds = [];
  }
}
