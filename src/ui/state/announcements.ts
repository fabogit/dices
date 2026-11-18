import type { AppMode, RoundResult, SeriesSummary } from '../../core/types';

// Text for the polite aria-live announcer. RollState decides when to announce; these pure
// functions decide what is said.

export type CoinSideLabel = 'Heads' | 'Tails';

export const SERIES_LOCKED_ANNOUNCEMENT =
  'Series in progress. Reset the series to change the setup.';
export const QUICK_FEED_CLEARED_ANNOUNCEMENT = 'Quick roll feed cleared.';
export const HISTORY_CLEARED_ANNOUNCEMENT = 'Roll history cleared.';

/**
 * Spoken name of a coin face value: 1 is Heads, anything else is Tails.
 */
export function coinSideLabel(value: number): CoinSideLabel {
  return value === 1 ? 'Heads' : 'Tails';
}

function coinSidesText(values: readonly number[]): string {
  return values.map((value) => coinSideLabel(value)).join(', ');
}

function rolledText(round: RoundResult): string {
  return `Rolled ${round.values.join(', ')}. Sum: ${round.sum}.`;
}

export function modeSwitchedAnnouncement(mode: AppMode): string {
  return mode === 'quick' ? 'Switched to Quick Roll mode.' : 'Switched to Series mode.';
}

export function seriesResetAnnouncement(playerName: string): string {
  return `Series reset for ${playerName}. Ready to roll.`;
}

/**
 * Announces a landed quick roll: each coin side and the winning side, or the dice and their sum.
 */
export function quickRollAnnouncement(round: RoundResult): string {
  if (round.kind === 'coin') {
    const outcome = round.roundWinnerSide === 'TIE' ? 'Tied.' : `${round.roundWinnerSide} wins.`;
    return `Quick roll: ${coinSidesText(round.values)}. ${outcome}`;
  }
  return `Quick roll: ${rolledText(round)}`;
}

/**
 * Announces a landed series round and its position in the series.
 */
export function seriesRoundAnnouncement(round: RoundResult, seriesLength: number): string {
  const prefix = `Round ${round.roundIndex + 1} of ${seriesLength}:`;
  if (round.kind === 'coin') {
    const outcome =
      round.roundWinnerSide === 'TIE' ? 'Round tied.' : `${round.roundWinnerSide} wins round.`;
    return `${prefix} ${coinSidesText(round.values)}. ${outcome}`;
  }
  return `${prefix} ${rolledText(round)}`;
}

/**
 * Announces the result of a completed series: the coin winner, or the dice totals.
 */
export function seriesCompleteAnnouncement(summary: SeriesSummary): string {
  if (summary.kind === 'coin') {
    const winner =
      summary.coinSeriesWinner === 'TIE'
        ? 'Series ended in a tie'
        : `${summary.coinSeriesWinner} wins series`;
    return `Series complete! ${winner} with ${summary.headsRoundsWon} Heads rounds to ${summary.tailsRoundsWon} Tails rounds.`;
  }
  return `Series complete for ${summary.playerName}! Total sum: ${summary.totalSum}, Average: ${summary.average.toFixed(1)}, Best round: ${summary.bestRoundIndex + 1}.`;
}
