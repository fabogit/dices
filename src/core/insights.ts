import type { CoinSeriesStats, DieFaces, SampleReliability } from './types';

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

export function generateSeriesInsightSummary(
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
