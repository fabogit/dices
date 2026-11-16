import { ALLOWED_FACES, type DieFaces, type SeriesSummary } from './types';

export const HISTORY_STORAGE_KEY = 'dices_history_v1';

export interface RollStorage {
  load(): unknown;
  save(state: unknown): void;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  } catch {
    return null;
  }
}

/**
 * Default browser localStorage-backed persistence adapter for series history.
 */
export function defaultStorage(key: string = HISTORY_STORAGE_KEY): RollStorage {
  return {
    load(): unknown {
      const storage = getBrowserStorage();
      if (!storage) {
        return null;
      }
      try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    save(state: unknown): void {
      const storage = getBrowserStorage();
      if (!storage) {
        return;
      }
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        // Ignore storage quota or access errors in sandbox / restricted browsers
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isAllowedFaces(value: unknown): value is DieFaces {
  return (ALLOWED_FACES as readonly unknown[]).includes(value);
}

function isPersistedRoundResult(value: unknown, expectedFaces: DieFaces): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.roundIndex) &&
    isFiniteNumber(value.sum) &&
    isFiniteNumber(value.max) &&
    isFiniteNumber(value.min) &&
    isFiniteNumber(value.timestamp) &&
    (value.faces === undefined || value.faces === expectedFaces) &&
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
  if (!isAllowedFaces(config.faces)) return false;
  const expectedFaces = config.faces;

  const hasValidCore =
    typeof value.id === 'string' &&
    typeof value.playerId === 'string' &&
    typeof value.playerName === 'string' &&
    isFiniteNumber(value.completedAt) &&
    isFiniteNumber(value.totalSum) &&
    isFiniteNumber(value.average) &&
    isFiniteNumber(value.bestRoundIndex) &&
    isFiniteNumber(config.countPerRoll) &&
    isFiniteNumber(analytics.totalDiceRolled) &&
    isFiniteNumber(analytics.criticalMaxCount) &&
    isFiniteNumber(analytics.expectedRoundAverage) &&
    rounds.every((round) => isPersistedRoundResult(round, expectedFaces));

  if (!hasValidCore) return false;

  if (expectedFaces === 2) {
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
 * Keeps only well-formed series summaries from an untrusted parsed storage payload and
 * backfills `round.faces` from `config.faces` for entries written before per-round faces existed.
 */
export function sanitizePersistedHistory(raw: unknown): SeriesSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPersistedSeriesSummary).map((summary) => {
    const faces = summary.config.faces;
    const needsNormalization = summary.rounds.some(
      (round) => (round as { faces?: DieFaces }).faces === undefined,
    );
    if (!needsNormalization) {
      return summary;
    }
    return {
      ...summary,
      rounds: summary.rounds.map((round) =>
        (round as { faces?: DieFaces }).faces === undefined ? { ...round, faces } : round,
      ),
    };
  });
}
