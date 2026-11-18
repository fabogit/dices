import {
  generateSeriesInsightSummary,
  getCoinZQualitative,
  getSampleReliabilityLabel,
  type SeriesInsightInput,
} from './insights';
import type {
  CoinRollConfig,
  CoinRoundResult,
  CoinSeriesAnalytics,
  CoinSeriesStats,
  CoinSeriesSummary,
  CoinSide,
  DeltaDirection,
  DiceRollConfig,
  DiceRoundResult,
  DiceSeriesAnalytics,
  DiceSeriesSummary,
  FaceDistributionEntry,
  ModeStat,
  RollConfig,
  RoundResult,
  SampleReliability,
  SeriesAnalytics,
  SeriesSummary,
} from './types';

/**
 * Classifies a percentage delta against a symmetric deadband threshold.
 */
export function classifyDelta(delta: number, threshold: number = 0.05): DeltaDirection {
  if (delta > threshold) {
    return 'positive';
  }
  if (delta < -threshold) {
    return 'negative';
  }
  return 'neutral';
}

/**
 * Extracts coin Heads/Tails counts and percentages directly from coin series analytics.
 */
export function getCoinSplitPercentages(summary: Pick<CoinSeriesSummary, 'analytics'>): {
  headsPct: number;
  tailsPct: number;
  headsCount: number;
  tailsCount: number;
} {
  const { headsPercentage, tailsPercentage, headsCount, tailsCount } = summary.analytics.coinStats;
  return {
    headsPct: headsPercentage,
    tailsPct: tailsPercentage,
    headsCount,
    tailsCount,
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

export function computeSeriesAnalytics(
  config: CoinRollConfig,
  rounds: RoundResult[],
): CoinSeriesAnalytics;
export function computeSeriesAnalytics(
  config: DiceRollConfig,
  rounds: RoundResult[],
): DiceSeriesAnalytics;
export function computeSeriesAnalytics(config: RollConfig, rounds: RoundResult[]): SeriesAnalytics;
export function computeSeriesAnalytics(config: RollConfig, rounds: RoundResult[]): SeriesAnalytics {
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
  const rawDistribution: Array<{
    face: number;
    label: string;
    count: number;
    percentage: number;
    expectedPercentage: number;
    deltaPercentage: number;
  }> = [];

  for (let face = 1; face <= config.faces; face++) {
    const count = freqMap.get(face) ?? 0;
    const percentage = totalDiceRolled > 0 ? (count / totalDiceRolled) * 100 : 0;
    const deltaPercentage = percentage - expectedPercentage;
    const label = config.faces === 2 ? (face === 1 ? 'HEADS' : 'TAILS') : `${face}`;

    rawDistribution.push({
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
    rawDistribution.length > 0 ? Math.max(...rawDistribution.map((d) => d.percentage)) : 0;
  const distributionPeakPercentage = Math.max(maxEmpiricalPercentage, expectedPercentage * 1.4, 1);

  // Sample reliability classification
  let sampleReliability: SampleReliability = 'empty';
  if (totalDiceRolled === 0) {
    sampleReliability = 'empty';
  } else if (totalDiceRolled < 10) {
    sampleReliability = 'small';
  } else if (totalDiceRolled < 30) {
    sampleReliability = 'moderate';
  } else {
    sampleReliability = 'solid';
  }
  const sampleReliabilityLabel = getSampleReliabilityLabel(sampleReliability);

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
      const totalStdDev = Math.sqrt(totalDiceRolled * ((config.faces * config.faces - 1) / 12));
      zScore = totalStdDev > 0 ? (totalSum - expectedTotalSum) / totalStdDev : 0;
    }
  }

  // Hottest and coldest faces
  let hottestFaces: number[] = [];
  let coldestFaces: number[] = [];
  if (totalDiceRolled > 0 && rawDistribution.length > 0) {
    const counts = rawDistribution.map((d) => d.count);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    if (maxCount > minCount) {
      hottestFaces = rawDistribution.filter((d) => d.count === maxCount).map((d) => d.face);
      coldestFaces = rawDistribution.filter((d) => d.count === minCount).map((d) => d.face);
    }
  }

  const distribution: FaceDistributionEntry[] = rawDistribution.map((entry) => ({
    ...entry,
    barWidthPercentage: Math.min(100, (entry.percentage / distributionPeakPercentage) * 100),
    expectedMarkerPercentage: Math.min(
      100,
      (entry.expectedPercentage / distributionPeakPercentage) * 100,
    ),
    deltaDirection: classifyDelta(entry.deltaPercentage, 0.05),
    isHot: hottestFaces.includes(entry.face),
  }));

  const baseAnalytics = {
    totalDiceRolled,
    expectedRoundAverage,
    averageDelta,
    standardDeviation,
    theoreticalRoundStdDev,
    zScore,
    sampleReliability,
    sampleReliabilityLabel,
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
  };

  const insightInput: SeriesInsightInput = {
    faces: config.faces,
    totalDiceRolled,
    roundAverage,
    expectedRoundAverage,
    zScore,
    sampleReliability,
    criticalMaxCount,
    criticalMaxRate,
    criticalMinCount,
    criticalMinRate,
    hottestFaces,
  };

  if (config.faces === 2) {
    const headsCount = criticalMaxCount;
    const tailsCount = criticalMinCount;
    const headsPercentage = totalDiceRolled > 0 ? (headsCount / totalDiceRolled) * 100 : 0;
    const tailsPercentage = totalDiceRolled > 0 ? (tailsCount / totalDiceRolled) * 100 : 0;
    const headsDeltaPercentage = headsPercentage - 50;
    const tailsDeltaPercentage = tailsPercentage - 50;

    const coinRounds = rounds.filter((r): r is CoinRoundResult => r.kind === 'coin');
    let headsRoundsWon = 0;
    let tailsRoundsWon = 0;
    let tieRounds = 0;
    for (const r of coinRounds) {
      if (r.roundWinnerSide === 'HEADS') {
        headsRoundsWon++;
      } else if (r.roundWinnerSide === 'TAILS') {
        tailsRoundsWon++;
      } else {
        tieRounds++;
      }
    }

    const coinStats: CoinSeriesStats = {
      headsCount,
      tailsCount,
      headsPercentage,
      tailsPercentage,
      headsDeltaPercentage,
      tailsDeltaPercentage,
      headsRoundsWon,
      tailsRoundsWon,
      tieRounds,
      zQualitative: getCoinZQualitative(zScore, sampleReliability),
    };

    const insightSummary = generateSeriesInsightSummary({ ...insightInput, coinStats });

    return {
      ...baseAnalytics,
      kind: 'coin',
      coinStats,
      insightSummary,
    };
  }

  const insightSummary = generateSeriesInsightSummary(insightInput);

  return {
    ...baseAnalytics,
    kind: 'dice',
    insightSummary,
  };
}

function computeAggregateRollMetrics(rounds: RoundResult[]): {
  totalSum: number;
  overallMax: number;
  overallMin: number;
  average: number;
  bestRoundIndex: number;
  worstRoundIndex: number;
  mode: ModeStat;
} {
  if (rounds.length === 0) {
    return {
      totalSum: 0,
      overallMax: 0,
      overallMin: 0,
      average: 0,
      bestRoundIndex: -1,
      worstRoundIndex: -1,
      mode: { values: [], frequency: 0, isTie: false },
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

  const mode = computeMode(rounds.flatMap((r) => r.values));

  return {
    totalSum,
    overallMax,
    overallMin,
    average,
    bestRoundIndex,
    worstRoundIndex,
    mode,
  };
}

function buildCoinSummaryFields(coinStats: CoinSeriesStats): {
  coinSeriesWinner: CoinSide | 'TIE';
  totalHeads: number;
  totalTails: number;
  headsRoundsWon: number;
  tailsRoundsWon: number;
} {
  const { headsCount, tailsCount, headsRoundsWon, tailsRoundsWon } = coinStats;
  const coinSeriesWinner: CoinSide | 'TIE' =
    headsRoundsWon > tailsRoundsWon ? 'HEADS' : tailsRoundsWon > headsRoundsWon ? 'TAILS' : 'TIE';

  return {
    coinSeriesWinner,
    totalHeads: headsCount,
    totalTails: tailsCount,
    headsRoundsWon,
    tailsRoundsWon,
  };
}

function isCoinRound(round: RoundResult): round is CoinRoundResult {
  return round.kind === 'coin';
}

function isDiceRound(round: RoundResult): round is DiceRoundResult {
  return round.kind === 'dice';
}

export function computeSeriesSummary(
  id: string,
  config: CoinRollConfig,
  playerName: string,
  rounds: CoinRoundResult[],
  completedAt?: number,
): CoinSeriesSummary;
export function computeSeriesSummary(
  id: string,
  config: DiceRollConfig,
  playerName: string,
  rounds: DiceRoundResult[],
  completedAt?: number,
): DiceSeriesSummary;
export function computeSeriesSummary(
  id: string,
  config: RollConfig,
  playerName: string,
  rounds: RoundResult[],
  completedAt?: number,
): SeriesSummary;
export function computeSeriesSummary(
  id: string,
  config: RollConfig,
  playerName: string,
  rounds: RoundResult[],
  completedAt: number = Date.now(),
): SeriesSummary {
  const analytics = computeSeriesAnalytics(config, rounds);
  const metrics = computeAggregateRollMetrics(rounds);
  const baseSummary = {
    id,
    config: { ...config },
    playerId: config.playerId,
    playerName,
    ...metrics,
    completedAt,
  };

  if (analytics.kind === 'coin') {
    if (!rounds.every(isCoinRound)) {
      throw new Error('computeSeriesSummary: coin config received non-coin rounds');
    }
    return {
      ...baseSummary,
      kind: 'coin',
      rounds: [...rounds],
      analytics,
      ...buildCoinSummaryFields(analytics.coinStats),
    };
  }

  if (!rounds.every(isDiceRound)) {
    throw new Error('computeSeriesSummary: dice config received non-dice rounds');
  }
  return {
    ...baseSummary,
    kind: 'dice',
    rounds: [...rounds],
    analytics,
  };
}
