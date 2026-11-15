import { ALLOWED_FACES, type SeriesSummary } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPersistedRoundResult(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.roundIndex) &&
    isFiniteNumber(value.sum) &&
    isFiniteNumber(value.max) &&
    isFiniteNumber(value.min) &&
    isFiniteNumber(value.timestamp) &&
    (value.headsCount === undefined || isFiniteNumber(value.headsCount)) &&
    Array.isArray(value.values) &&
    value.values.length > 0 &&
    value.values.every(isFiniteNumber)
  );
}

/**
 * Structural guard for a series summary read back from storage. It checks the fields
 * the history list and the leaderboard dereference, so a malformed or foreign entry
 * can never crash rendering; it is not a full schema validation.
 */
export function isPersistedSeriesSummary(value: unknown): value is SeriesSummary {
  if (!isRecord(value)) return false;
  const { config, analytics, rounds } = value;
  if (!isRecord(config) || !isRecord(analytics) || !Array.isArray(rounds)) return false;

  const hasValidCore =
    typeof value.id === 'string' &&
    typeof value.playerId === 'string' &&
    typeof value.playerName === 'string' &&
    isFiniteNumber(value.completedAt) &&
    isFiniteNumber(value.totalSum) &&
    isFiniteNumber(value.average) &&
    isFiniteNumber(value.bestRoundIndex) &&
    (ALLOWED_FACES as readonly unknown[]).includes(config.faces) &&
    isFiniteNumber(config.countPerRoll) &&
    isFiniteNumber(analytics.totalDiceRolled) &&
    isFiniteNumber(analytics.criticalMaxCount) &&
    isFiniteNumber(analytics.expectedRoundAverage) &&
    rounds.every(isPersistedRoundResult);

  if (!hasValidCore) return false;

  if (config.faces === 2) {
    const validHeads = value.totalHeads === undefined || isFiniteNumber(value.totalHeads);
    const validTails = value.totalTails === undefined || isFiniteNumber(value.totalTails);
    const validRoundWins =
      isFiniteNumber(value.headsRoundsWon) && isFiniteNumber(value.tailsRoundsWon);
    const validWinner =
      value.coinSeriesWinner === 'HEADS' ||
      value.coinSeriesWinner === 'TAILS' ||
      value.coinSeriesWinner === 'TIE';
    const validCoinStats =
      analytics.coinStats === undefined ||
      (isRecord(analytics.coinStats) &&
        isFiniteNumber(analytics.coinStats.headsCount) &&
        isFiniteNumber(analytics.coinStats.tailsCount) &&
        isFiniteNumber(analytics.coinStats.headsPercentage) &&
        isFiniteNumber(analytics.coinStats.tailsPercentage));

    return validHeads && validTails && validRoundWins && validWinner && validCoinStats;
  }

  return true;
}

/**
 * Keeps only well-formed series summaries from an untrusted parsed storage payload.
 */
export function sanitizePersistedHistory(raw: unknown): SeriesSummary[] {
  return Array.isArray(raw) ? raw.filter(isPersistedSeriesSummary) : [];
}
