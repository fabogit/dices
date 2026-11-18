import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { isValidRollConfig } from '../limits';
import { computeRoundResult, computeSeriesSummary } from '../engine';
import {
  DEFAULT_PLAYER,
  defaultStorage,
  hydratePersistedState,
  hydrateSeriesRecord,
  isPersistedRound,
  isPersistedSeriesRecord,
  LEGACY_HISTORY_STORAGE_KEY,
  migrateV1ToV2,
  PLAYER_PALETTE,
  sanitizePersistedPlayers,
  serializePersistedState,
  STATE_STORAGE_KEY,
  toPersistedSeriesRecord,
  type PersistedSeriesRecord,
} from '../persistence';
import type { Player, RollConfig } from '../types';

const d6Config: RollConfig = { faces: 6, countPerRoll: 2, seriesLength: 2, playerId: 'player-1' };

function makeSummary(
  id: string,
  config: RollConfig = { faces: 6, countPerRoll: 2, seriesLength: 1, playerId: 'player-1' },
  playerName: string = 'Player 1',
  valuesPerRound: number[][] = [[3, 5]],
) {
  const rounds = valuesPerRound.map((values, index) =>
    computeRoundResult(index, values, config.faces, 1_000 + index, `${id}-round-${index}`),
  );
  return computeSeriesSummary(id, config, playerName, rounds, 2_000);
}

function createMemoryStorage(options: { throwOnSet?: boolean } = {}): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      if (options.throwOnSet) {
        throw new Error('QuotaExceededError');
      }
      store.set(key, value);
    },
  };
}

describe('persistence v2 validators and serialization', () => {
  it('validates roll configs via isValidRollConfig without throwing', () => {
    expect(isValidRollConfig(d6Config)).toBe(true);
    expect(isValidRollConfig({ ...d6Config, faces: 7 })).toBe(false);
    expect(isValidRollConfig([])).toBe(false);
    expect(isValidRollConfig(null)).toBe(false);
  });

  it('validates rounds strictly against countPerRoll and face bounds while allowing omitted faces', () => {
    const validRound = { id: 'r1', values: [1, 6], timestamp: 1_000 };
    expect(isPersistedRound(validRound, d6Config)).toBe(true);
    expect(isPersistedRound({ ...validRound, faces: 6 }, d6Config)).toBe(true);

    expect(isPersistedRound({ ...validRound, id: '' }, d6Config)).toBe(false);
    expect(isPersistedRound({ ...validRound, faces: 20 }, d6Config)).toBe(false);
    expect(isPersistedRound({ ...validRound, values: [1] }, d6Config)).toBe(false);
    expect(isPersistedRound({ ...validRound, values: [1, 7] }, d6Config)).toBe(false);
    expect(isPersistedRound({ ...validRound, values: [0, 2] }, d6Config)).toBe(false);
    expect(isPersistedRound({ ...validRound, values: [1.5, 2] }, d6Config)).toBe(false);
  });

  it('validates persisted series records strictly including rounds.length === seriesLength', () => {
    const validRecord: PersistedSeriesRecord = {
      id: 'series-a',
      config: d6Config,
      playerName: 'Player 1',
      rounds: [
        { id: 'r1', values: [2, 4], timestamp: 1_000 },
        { id: 'r2', values: [5, 6], timestamp: 2_000 },
      ],
      completedAt: 3_000,
    };
    expect(isPersistedSeriesRecord(validRecord)).toBe(true);

    const rejected: unknown[] = [
      null,
      42,
      [],
      {},
      { ...validRecord, id: '' },
      { ...validRecord, playerName: '   ' },
      { ...validRecord, completedAt: Number.NaN },
      { ...validRecord, config: { ...d6Config, faces: 7 } },
      { ...validRecord, rounds: [validRecord.rounds[0]] },
      {
        ...validRecord,
        rounds: [...validRecord.rounds, { id: 'r3', values: [1, 1], timestamp: 3 }],
      },
      {
        ...validRecord,
        rounds: [validRecord.rounds[0], { id: 'r2', values: [5, 99], timestamp: 2_000 }],
      },
    ];
    for (const candidate of rejected) {
      expect(isPersistedSeriesRecord(candidate)).toBe(false);
    }
  });

  it('strips derived fields on save and recomputes analytics when hydrating raw records', () => {
    const alice: Player = { id: 'p-alice', name: 'Alice', color: PLAYER_PALETTE[1] };
    const summary = makeSummary(
      'series-raw',
      { faces: 2, countPerRoll: 3, seriesLength: 2, playerId: alice.id },
      'Alice',
      [
        [1, 1, 2],
        [1, 2, 2],
      ],
    );

    const serialized = serializePersistedState({
      players: [DEFAULT_PLAYER, alice],
      activePlayerId: alice.id,
      history: [summary],
    });

    expect(serialized.version).toBe(2);
    expect(serialized.history).toHaveLength(1);
    const savedRecord = serialized.history[0] as unknown as Record<string, unknown>;
    expect(savedRecord.analytics).toBeUndefined();
    expect(savedRecord.totalSum).toBeUndefined();

    const jsonRoundTrip: unknown = JSON.parse(JSON.stringify(serialized));
    const hydrated = hydratePersistedState(jsonRoundTrip);
    expect(hydrated.players).toEqual([DEFAULT_PLAYER, alice]);
    expect(hydrated.activePlayerId).toBe(alice.id);
    expect(hydrated.history).toHaveLength(1);
    expect(hydrated.history[0]).toEqual(hydrateSeriesRecord(serialized.history[0]));
    if (hydrated.history[0].kind !== 'coin') {
      throw new Error('Expected coin series summary after hydration');
    }
    expect(hydrated.history[0].coinSeriesWinner).toBe('TIE');
    expect(hydrated.history[0].rounds[0].faces).toBe(2);
  });

  it('sanitizes persisted players and falls back independently from valid history', () => {
    const alice: Player = { id: 'p-alice', name: '  Alice  ', color: '#34d399' };
    expect(sanitizePersistedPlayers([DEFAULT_PLAYER, alice], 'missing-id')).toEqual({
      players: [DEFAULT_PLAYER, { id: 'p-alice', name: 'Alice', color: '#34d399' }],
      activePlayerId: DEFAULT_PLAYER.id,
    });

    const invalidSets: unknown[] = [
      [],
      'not-an-array',
      [null],
      [{ id: 'p1', name: '   ', color: '#fff' }],
      [{ id: 'p1', name: 'X'.repeat(25), color: '#fff' }],
      [{ id: 'p1', name: 'Valid', color: ' ' }],
      [
        { id: 'dup', name: 'A', color: '#111' },
        { id: 'dup', name: 'B', color: '#222' },
      ],
    ];
    for (const badPlayers of invalidSets) {
      expect(sanitizePersistedPlayers(badPlayers, 'dup')).toEqual({
        players: [DEFAULT_PLAYER],
        activePlayerId: DEFAULT_PLAYER.id,
      });
    }

    const summary = makeSummary('s-keep');
    const record = toPersistedSeriesRecord(summary);
    const hydrated = hydratePersistedState({
      version: 2,
      players: [],
      activePlayerId: 'missing',
      history: [record, { invalid: true }],
    });
    expect(hydrated.players).toEqual([DEFAULT_PLAYER]);
    expect(hydrated.activePlayerId).toBe(DEFAULT_PLAYER.id);
    expect(hydrated.history.map((s) => s.id)).toEqual(['s-keep']);
  });
});

describe('v1 to v2 migration and defaultStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('migrates v1 history arrays into raw v2 state and reconstructs distinct players in palette order', () => {
    const sAliceRecent = makeSummary(
      's-alice-2',
      { faces: 6, countPerRoll: 1, seriesLength: 1, playerId: 'p-alice' },
      'Alice',
      [[6]],
    );
    const sBobOlder = makeSummary(
      's-bob-1',
      { faces: 20, countPerRoll: 1, seriesLength: 1, playerId: 'p-bob' },
      'Bob',
      [[20]],
    );
    // Simulate a legacy v1 entry whose round omitted `faces`
    const legacyNoFaces = {
      ...sBobOlder,
      rounds: [
        { id: 'old-r', roundIndex: 0, values: [20], sum: 20, max: 20, min: 20, timestamp: 100 },
      ],
    };

    const migrated = migrateV1ToV2([{}, sAliceRecent, legacyNoFaces]);
    expect(migrated.version).toBe(2);
    expect(migrated.history).toHaveLength(2);
    expect(migrated.players).toEqual([
      DEFAULT_PLAYER,
      { id: 'p-bob', name: 'Bob', color: PLAYER_PALETTE[1] },
      { id: 'p-alice', name: 'Alice', color: PLAYER_PALETTE[2] },
    ]);
    expect(migrated.activePlayerId).toBe('p-alice');

    const hydrated = hydratePersistedState([{}, sAliceRecent, legacyNoFaces]);
    expect(hydrated.players).toEqual(migrated.players);
    expect(hydrated.history[1].rounds[0].faces).toBe(20);
  });

  it('reads/writes dices_state_v2, migrates dices_history_v1 safely, and tolerates errors', () => {
    const memoryStorage = createMemoryStorage();
    vi.stubGlobal('window', { localStorage: memoryStorage });

    const storage = defaultStorage();
    expect(storage.load()).toBeNull();

    const summary = makeSummary(
      'v1-entry',
      { faces: 6, countPerRoll: 1, seriesLength: 1, playerId: 'p-a' },
      'Alice',
      [[5]],
    );
    memoryStorage.setItem(LEGACY_HISTORY_STORAGE_KEY, JSON.stringify([summary]));

    const loadedMigrated = storage.load();
    expect(memoryStorage.getItem(STATE_STORAGE_KEY)).not.toBeNull();
    expect(memoryStorage.getItem(LEGACY_HISTORY_STORAGE_KEY)).toBeNull();

    const hydrated = hydratePersistedState(loadedMigrated);
    expect(hydrated.history.map((h) => h.id)).toEqual(['v1-entry']);
    expect(hydrated.players.map((p) => p.name)).toEqual(['Player 1', 'Alice']);

    // Corrupt v2 or corrupt v1 JSON returns null gracefully
    memoryStorage.setItem(STATE_STORAGE_KEY, '{broken-v2');
    expect(storage.load()).toBeNull();

    memoryStorage.removeItem(STATE_STORAGE_KEY);
    memoryStorage.setItem(LEGACY_HISTORY_STORAGE_KEY, '{broken-v1');
    expect(storage.load()).toBeNull();

    // Preserves legacy v1 key if writing v2 throws (e.g. QuotaExceededError)
    const quotaStorage = createMemoryStorage();
    quotaStorage.setItem(LEGACY_HISTORY_STORAGE_KEY, JSON.stringify([summary]));
    const setItemSpy = vi.spyOn(quotaStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.stubGlobal('window', { localStorage: quotaStorage });

    const fallbackLoaded = storage.load();
    expect(hydratePersistedState(fallbackLoaded).history.map((h) => h.id)).toEqual(['v1-entry']);
    expect(quotaStorage.getItem(LEGACY_HISTORY_STORAGE_KEY)).not.toBeNull();
    setItemSpy.mockRestore();

    expect(() => storage.save({ version: 2 })).not.toThrow();
  });

  it('returns null and no-ops safely when window or localStorage is unavailable or throws', () => {
    const storage = defaultStorage('custom-v2', 'custom-v1');

    vi.stubGlobal('window', undefined);
    expect(storage.load()).toBeNull();
    expect(() => storage.save({ version: 2 })).not.toThrow();

    vi.stubGlobal('window', {});
    expect(storage.load()).toBeNull();
    expect(() => storage.save({ version: 2 })).not.toThrow();

    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
    });
    expect(storage.load()).toBeNull();
    expect(() => storage.save({ version: 2 })).not.toThrow();
  });
});
