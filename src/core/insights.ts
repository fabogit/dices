import { formatSigned } from '../lib/format';
import type { CoinSeriesStats, DieFaces, PolyhedralFaces, SampleReliability } from './types';

// User-facing copy derived from the statistics computed in round, series-analytics and
// quick-stats. Keeping the sentences here leaves those modules free of presentation text.

const SAMPLE_RELIABILITY_LABELS: Record<SampleReliability, string> = {
  empty: 'No Rolls',
  small: 'Small sample (<10)',
  moderate: 'Moderate sample (10–29)',
  solid: 'Solid sample (30+)',
};

/**
 * Returns the human-readable badge label for a series sample reliability tier.
 */
export function getSampleReliabilityLabel(reliability: SampleReliability): string {
  return SAMPLE_RELIABILITY_LABELS[reliability];
}

/**
 * Returns the qualitative verdict string for coin toss z-score balance deviation.
 */
export function getCoinZQualitative(zScore: number, sampleReliability: SampleReliability): string {
  if (sampleReliability === 'empty') {
    return 'No data';
  }
  if (Math.abs(zScore) < 1.0) {
    return 'Within normal variance';
  }
  return zScore > 0 ? 'Heads-leaning' : 'Tails-leaning';
}

/** Series statistics the narrative summary is written from. */
export interface SeriesInsightInput {
  faces: DieFaces;
  totalDiceRolled: number;
  roundAverage: number;
  expectedRoundAverage: number;
  zScore: number;
  sampleReliability: SampleReliability;
  criticalMaxCount: number;
  criticalMaxRate: number;
  criticalMinCount: number;
  criticalMinRate: number;
  hottestFaces: readonly number[];
  /** Present for coin series (faces 2); selects the Heads/Tails narrative. */
  coinStats?: CoinSeriesStats;
}

/**
 * Builds the one-paragraph English summary shown under the series analytics.
 */
export function generateSeriesInsightSummary(input: SeriesInsightInput): string {
  const {
    faces,
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
    coinStats,
  } = input;

  if (totalDiceRolled === 0) {
    return 'No rolls recorded yet. Complete a round to generate statistical insights.';
  }

  const samplePrefix =
    sampleReliability === 'small'
      ? `Small sample (${totalDiceRolled} ${faces === 2 ? 'tosses' : 'dice'}): `
      : '';
  const z = formatSigned(zScore, 2);

  if (faces === 2 && coinStats) {
    const { headsPercentage, tailsPercentage } = coinStats;
    let verdict = '';
    if (Math.abs(zScore) < 1.0) {
      verdict = `Balanced coin split (${headsPercentage.toFixed(1)}% Heads / ${tailsPercentage.toFixed(1)}% Tails), within normal variance (z = ${z}).`;
    } else if (zScore >= 1.0) {
      verdict = `Heads-leaning outcome (${headsPercentage.toFixed(1)}% Heads, ${formatSigned(headsPercentage - 50)}% vs fair baseline, z = ${z}).`;
    } else {
      verdict = `Tails-leaning outcome (${tailsPercentage.toFixed(1)}% Tails, ${formatSigned(tailsPercentage - 50)}% vs fair baseline, z = ${z}).`;
    }

    if (sampleReliability === 'small') {
      verdict += ' Additional tosses recommended for statistical confidence.';
    }
    return `${samplePrefix}${verdict}`;
  }

  // Polyhedral dice (d4..d20)
  const averages = `avg round ${roundAverage.toFixed(1)} vs E[X] = ${expectedRoundAverage.toFixed(1)}, z = ${z}`;
  let performanceVerdict = '';
  if (Math.abs(zScore) < 1.0) {
    performanceVerdict = `Performing within expected variance (${averages}).`;
  } else if (zScore >= 1.0) {
    performanceVerdict = `Running hot above theoretical expectation (${averages}).`;
  } else {
    performanceVerdict = `Running cold below theoretical expectation (${averages}).`;
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

/** Counts behind the one-line insight for a single quick coin throw. */
export interface CoinQuickRollInsightInput {
  count: number;
  headsCount: number;
  tailsCount: number;
  headsPercentage: number;
  tailsPercentage: number;
}

/**
 * Describes a single quick coin throw (one or more coins).
 */
export function generateCoinQuickRollInsight(input: CoinQuickRollInsightInput): string {
  const { count, headsCount, tailsCount, headsPercentage, tailsPercentage } = input;
  if (count === 1) {
    return headsCount === 1 ? 'Landed Heads (winning face).' : 'Landed Tails.';
  }
  if (headsCount > tailsCount) {
    return `Heads majority (${headsCount}H / ${tailsCount}T, ${headsPercentage.toFixed(0)}%).`;
  }
  if (tailsCount > headsCount) {
    return `Tails majority (${tailsCount}T / ${headsCount}H, ${tailsPercentage.toFixed(0)}%).`;
  }
  return `Even split (${headsCount}H / ${tailsCount}T).`;
}

/** Statistics behind the one-line insight for a single quick polyhedral throw. */
export interface DiceQuickRollInsightInput {
  faces: PolyhedralFaces;
  values: readonly number[];
  sum: number;
  expectedSum: number;
  sumDelta: number;
  zScore: number;
  criticalMaxCount: number;
  criticalMinCount: number;
}

/**
 * Describes a single quick polyhedral throw (one or more dice).
 */
export function generateDiceQuickRollInsight(input: DiceQuickRollInsightInput): string {
  const { faces, values, sum, expectedSum, sumDelta, zScore, criticalMaxCount, criticalMinCount } =
    input;
  const expected = expectedSum.toFixed(1);

  if (values.length === 1) {
    const val = values[0] ?? 0;
    if (val === faces) {
      return `Natural ${faces}! Maximum possible roll.`;
    }
    if (val === 1) {
      return 'Natural 1. Minimum possible roll.';
    }
    if (sumDelta > 0) {
      return `Rolled ${val} (${formatSigned(sumDelta)} vs E[X] ${expected}). Above average.`;
    }
    if (sumDelta < 0) {
      return `Rolled ${val} (${formatSigned(sumDelta)} vs E[X] ${expected}). Below average.`;
    }
    return `Rolled ${val} (exact expected average ${expected}).`;
  }

  const critParts: string[] = [];
  if (criticalMaxCount > 0) {
    critParts.push(`${criticalMaxCount}x nat ${faces}`);
  }
  if (criticalMinCount > 0) {
    critParts.push(`${criticalMinCount}x nat 1`);
  }
  const critText = critParts.length > 0 ? ` (${critParts.join(', ')})` : '';

  if (zScore >= 1.0) {
    return `High roll: sum ${sum} (${formatSigned(sumDelta)} vs E[X] ${expected})${critText}.`;
  }
  if (zScore <= -1.0) {
    return `Low roll: sum ${sum} (${formatSigned(sumDelta)} vs E[X] ${expected})${critText}.`;
  }
  return `Typical roll: sum ${sum} (E[X] ${expected})${critText}.`;
}

/**
 * Returns the balance verdict for a quick-roll coin session from its Heads z-score.
 */
export function getCoinBalanceVerdict(zScore: number): string {
  if (Math.abs(zScore) < 1.0) {
    return 'Evenly balanced';
  }
  return zScore >= 1.0 ? 'Heads-leaning' : 'Tails-leaning';
}

/**
 * Describes a quick-roll session with no throws for the selected die.
 */
export function generateEmptyQuickSessionInsight(faces: DieFaces): string {
  return `No ${faces === 2 ? 'coin' : `d${faces}`} rolls in this session yet.`;
}

/** Totals behind the quick-roll coin session insight. */
export interface CoinQuickSessionInsightInput {
  matchingThrows: number;
  totalDiceCount: number;
  headsPercentage: number;
  tailsPercentage: number;
  balanceVerdict: string;
}

/**
 * Describes the coin throws of a quick-roll session.
 */
export function generateCoinQuickSessionInsight(input: CoinQuickSessionInsightInput): string {
  const { matchingThrows, totalDiceCount, headsPercentage, tailsPercentage, balanceVerdict } =
    input;
  return `${matchingThrows} throws (${totalDiceCount} coins): ${headsPercentage.toFixed(1)}% Heads / ${tailsPercentage.toFixed(1)}% Tails (${balanceVerdict.toLowerCase()}).`;
}

/** Totals behind the quick-roll polyhedral session insight. */
export interface DiceQuickSessionInsightInput {
  matchingThrows: number;
  totalDiceCount: number;
  actualAverage: number;
  expectedAverage: number;
  averageDelta: number;
  criticalMaxCount: number;
  criticalMinCount: number;
}

/**
 * Describes the polyhedral throws of a quick-roll session for the selected die.
 */
export function generateDiceQuickSessionInsight(input: DiceQuickSessionInsightInput): string {
  const {
    matchingThrows,
    totalDiceCount,
    actualAverage,
    expectedAverage,
    averageDelta,
    criticalMaxCount,
    criticalMinCount,
  } = input;
  return `${matchingThrows} throws (${totalDiceCount} dice): avg die ${actualAverage.toFixed(2)} (${formatSigned(averageDelta, 2)} vs E[X] ${expectedAverage.toFixed(1)}). ${criticalMaxCount} max crits, ${criticalMinCount} nat 1s.`;
}
