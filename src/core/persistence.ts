import { computeRoundResult, computeSeriesSummary } from './engine';
import { isValidRollConfig } from './limits';
import type { Player, RollConfig, SeriesSummary } from './types';

export const STATE_STORAGE_KEY = 'dices_state_v2';
export const LEGACY_HISTORY_STORAGE_KEY = 'dices_history_v1';
export const PLAYER_PALETTE = [
  '#38bdf8',
  '#34d399',
  '#f472b6',
  '#fbbf24',
  '#a78bfa',
  '#fb923c',
] as const;
export const DEFAULT_PLAYER: Player = {
  id: 'player-1',
  name: 'Player 1',
  color: PLAYER_PALETTE[0],
};

export const MAX_HISTORY_ENTRIES = 50;
export const MAX_QUICK_ROLLS = 25;
export const MAX_PLAYER_NAME_LENGTH = 24;

export interface RollStorage {
  load(): unknown;
  save(state: unknown): void;
}

export interface PersistedRound {
  id: string;
  values: number[];
  timestamp: number;
}

export interface PersistedSeriesRecord {
  id: string;
  config: RollConfig;
  playerName: string;
  rounds: PersistedRound[];
  completedAt: number;
}

export interface PersistedStateV2 {
  version: 2;
  players: Player[];
  activePlayerId: string;
  history: PersistedSeriesRecord[];
}

export interface HydratedState {
  players: Player[];
  activePlayerId: string;
  history: SeriesSummary[];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validates an untrusted persisted round against the parent series configuration.
 * Legacy rounds without `faces` remain accepted; if `faces` is present, it must match `config.faces`.
 */
export function isPersistedRound(value: unknown, config: RollConfig): value is PersistedRound {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    isFiniteNumber(value.timestamp) &&
    (value.faces === undefined || value.faces === config.faces) &&
    Array.isArray(value.values) &&
    value.values.length === config.countPerRoll &&
    value.values.every(
      (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= config.faces,
    )
  );
}

/**
 * Structural guard for a persisted series record (used for both v2 raw records and v1 migration).
 */
export function isPersistedSeriesRecord(value: unknown): value is PersistedSeriesRecord {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.playerName !== 'string' ||
    value.playerName.trim().length === 0 ||
    !isFiniteNumber(value.completedAt)
  ) {
    return false;
  }

  if (!isValidRollConfig(value.config)) return false;
  const config = value.config;

  return (
    Array.isArray(value.rounds) &&
    value.rounds.length === config.seriesLength &&
    value.rounds.every((round) => isPersistedRound(round, config))
  );
}

/**
 * Strips derived analytics and summary fields so storage only keeps raw series facts.
 */
export function toPersistedSeriesRecord(source: PersistedSeriesRecord): PersistedSeriesRecord {
  const playerName =
    source.playerName.trim().slice(0, MAX_PLAYER_NAME_LENGTH) || DEFAULT_PLAYER.name;
  return {
    id: source.id,
    config: { ...source.config },
    playerName,
    rounds: source.rounds.map((round) => ({
      id: round.id,
      values: [...round.values],
      timestamp: round.timestamp,
    })),
    completedAt: source.completedAt,
  };
}

/**
 * Reconstructs full `RoundResult[]` and derived `SeriesSummary` from a validated raw record.
 */
export function hydrateSeriesRecord(record: PersistedSeriesRecord): SeriesSummary {
  const rounds = record.rounds.map((round, index) =>
    computeRoundResult(index, round.values, record.config.faces, round.timestamp, round.id),
  );
  return computeSeriesSummary(
    record.id,
    record.config,
    record.playerName.trim(),
    rounds,
    record.completedAt,
  );
}

/**
 * Sanitizes persisted players and active player ID, resetting to `DEFAULT_PLAYER` if invalid.
 */
export function sanitizePersistedPlayers(
  rawPlayers: unknown,
  rawActivePlayerId: unknown,
): { players: Player[]; activePlayerId: string } {
  if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
    return { players: [{ ...DEFAULT_PLAYER }], activePlayerId: DEFAULT_PLAYER.id };
  }

  const seenIds = new Set<string>();
  const players: Player[] = [];

  for (const entry of rawPlayers) {
    if (!isRecord(entry)) {
      return { players: [{ ...DEFAULT_PLAYER }], activePlayerId: DEFAULT_PLAYER.id };
    }
    const trimmedName = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (
      typeof entry.id !== 'string' ||
      entry.id.trim().length === 0 ||
      seenIds.has(entry.id) ||
      trimmedName.length === 0 ||
      trimmedName.length > MAX_PLAYER_NAME_LENGTH ||
      typeof entry.color !== 'string' ||
      entry.color.trim().length === 0
    ) {
      return { players: [{ ...DEFAULT_PLAYER }], activePlayerId: DEFAULT_PLAYER.id };
    }
    seenIds.add(entry.id);
    players.push({
      id: entry.id,
      name: trimmedName,
      color: entry.color,
    });
  }

  const activePlayerId =
    typeof rawActivePlayerId === 'string' && seenIds.has(rawActivePlayerId)
      ? rawActivePlayerId
      : players[0].id;

  return { players, activePlayerId };
}

/**
 * Converts a legacy v1 history array into version 2 raw state, reconstructing distinct players
 * in chronological creation order (oldest to newest) with palette colors.
 */
export function migrateV1ToV2(rawV1: unknown): PersistedStateV2 {
  const records = Array.isArray(rawV1)
    ? rawV1
        .filter(isPersistedSeriesRecord)
        .slice(0, MAX_HISTORY_ENTRIES)
        .map(toPersistedSeriesRecord)
    : [];

  const playerMap = new Map<string, Player>([[DEFAULT_PLAYER.id, { ...DEFAULT_PLAYER }]]);
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    if (!playerMap.has(record.config.playerId)) {
      const color = PLAYER_PALETTE[playerMap.size % PLAYER_PALETTE.length];
      playerMap.set(record.config.playerId, {
        id: record.config.playerId,
        name: record.playerName,
        color,
      });
    }
  }

  const players = Array.from(playerMap.values());
  const firstPlayerId = records[0]?.config.playerId;
  const activePlayerId =
    firstPlayerId && playerMap.has(firstPlayerId) ? firstPlayerId : DEFAULT_PLAYER.id;

  return {
    version: 2,
    players,
    activePlayerId,
    history: records,
  };
}

/**
 * Hydrates runtime players, active player ID, and full series summaries from v2 state or v1 array.
 * Player and history sections are validated independently so corruption in one never discards the other.
 */
export function hydratePersistedState(raw: unknown): HydratedState {
  if (Array.isArray(raw)) {
    const migrated = migrateV1ToV2(raw);
    return {
      players: migrated.players,
      activePlayerId: migrated.activePlayerId,
      history: migrated.history.map(hydrateSeriesRecord),
    };
  }

  if (isRecord(raw) && raw.version === 2) {
    const { players, activePlayerId } = sanitizePersistedPlayers(raw.players, raw.activePlayerId);
    const rawHistory = Array.isArray(raw.history) ? raw.history : [];
    const history = rawHistory
      .filter(isPersistedSeriesRecord)
      .slice(0, MAX_HISTORY_ENTRIES)
      .map(hydrateSeriesRecord);

    return { players, activePlayerId, history };
  }

  return {
    players: [{ ...DEFAULT_PLAYER }],
    activePlayerId: DEFAULT_PLAYER.id,
    history: [],
  };
}

/**
 * Serializes runtime store state into a version 2 payload containing only raw persistent facts.
 */
export function serializePersistedState(state: {
  players: Player[];
  activePlayerId: string;
  history: SeriesSummary[];
}): PersistedStateV2 {
  return {
    version: 2,
    players: state.players.map((p) => ({ ...p })),
    activePlayerId: state.activePlayerId,
    history: state.history.slice(0, MAX_HISTORY_ENTRIES).map(toPersistedSeriesRecord),
  };
}

/**
 * Default browser localStorage-backed persistence adapter supporting v2 state and v1 migration.
 */
export function defaultStorage(
  key: string = STATE_STORAGE_KEY,
  legacyKey: string = LEGACY_HISTORY_STORAGE_KEY,
): RollStorage {
  return {
    load(): unknown {
      const storage = getBrowserStorage();
      if (!storage) {
        return null;
      }

      try {
        const rawV2 = storage.getItem(key);
        if (rawV2 !== null) {
          return JSON.parse(rawV2);
        }
      } catch {
        return null;
      }

      try {
        const rawLegacy = storage.getItem(legacyKey);
        if (rawLegacy === null) {
          return null;
        }
        const migrated = migrateV1ToV2(JSON.parse(rawLegacy));
        try {
          storage.setItem(key, JSON.stringify(migrated));
          storage.removeItem(legacyKey);
        } catch {
          // Keep legacy key intact so migration retries cleanly if v2 write failed
        }
        return migrated;
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
