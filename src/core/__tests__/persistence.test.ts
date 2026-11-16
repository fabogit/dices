import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeRoundResult, computeSeriesSummary } from '../engine';
import {
  defaultStorage,
  HISTORY_STORAGE_KEY,
  isPersistedSeriesSummary,
  sanitizePersistedHistory,
} from '../persistence';
import type { RollConfig } from '../types';

const config: RollConfig = { faces: 6, countPerRoll: 2, seriesLength: 1, playerId: 'player-1' };

function makeSummary(id: string) {
  const round = computeRoundResult(0, [3, 5], 6, 1_000, `${id}-round`);
  return computeSeriesSummary(id, config, 'Player 1', [round], 2_000);
}

describe('persisted history sanitization', () => {
  it('accepts valid polyhedral and coin summaries after a JSON round-trip', () => {
    const roundTripped: unknown = JSON.parse(JSON.stringify(makeSummary('series-a')));
    expect(isPersistedSeriesSummary(roundTripped)).toBe(true);

    const coinConfig: RollConfig = { faces: 2, countPerRoll: 3, seriesLength: 1, playerId: 'p1' };
    const coinRound = computeRoundResult(0, [1, 2, 1], 2, 1_000, 'coin-round');
    const coinSummary: unknown = JSON.parse(
      JSON.stringify(
        computeSeriesSummary('coin-series', coinConfig, 'Player 1', [coinRound], 2_000),
      ),
    );
    expect(isPersistedSeriesSummary(coinSummary)).toBe(true);
  });

  it('rejects primitives, arrays, and objects missing dereferenced fields', () => {
    const valid = makeSummary('series-b');
    const coinConfig: RollConfig = { faces: 2, countPerRoll: 2, seriesLength: 1, playerId: 'p1' };
    const validCoin = computeSeriesSummary(
      'coin-b',
      coinConfig,
      'Player 1',
      [computeRoundResult(0, [1, 2], 2, 1_000, 'coin-round-b')],
      2_000,
    );
    const rejected: unknown[] = [
      null,
      42,
      'series',
      [],
      {},
      { ...valid, id: 7 },
      { ...valid, analytics: undefined },
      { ...valid, analytics: { ...valid.analytics, totalDiceRolled: 'many' } },
      { ...valid, config: { ...valid.config, faces: 7 } },
      { ...valid, rounds: 'none' },
      { ...valid, rounds: [{ values: ['x'] }] },
      { ...valid, rounds: [{ ...valid.rounds[0], faces: 7 }] },
      { ...valid, completedAt: Number.NaN },
      { ...validCoin, analytics: { ...validCoin.analytics, coinStats: {} } },
      { ...validCoin, totalHeads: 'many' },
      { ...validCoin, coinSeriesWinner: 'DRAW' },
    ];
    for (const candidate of rejected) {
      expect(isPersistedSeriesSummary(candidate)).toBe(false);
    }
  });

  it('keeps only well-formed entries and tolerates non-array payloads', () => {
    const valid = makeSummary('series-c');
    expect(sanitizePersistedHistory([valid, {}, 42, null])).toEqual([valid]);
    expect(sanitizePersistedHistory({ not: 'an array' })).toEqual([]);
    expect(sanitizePersistedHistory(undefined)).toEqual([]);
  });
});

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

describe('defaultStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and saves JSON payloads via window.localStorage and tolerates corrupt JSON or write errors', () => {
    const memoryStorage = createMemoryStorage();
    vi.stubGlobal('window', { localStorage: memoryStorage });

    const storage = defaultStorage();
    expect(storage.load()).toBeNull();

    const sample = [makeSummary('series-storage')];
    storage.save(sample);
    expect(memoryStorage.getItem(HISTORY_STORAGE_KEY)).toBe(JSON.stringify(sample));
    expect(storage.load()).toEqual(sample);

    memoryStorage.setItem(HISTORY_STORAGE_KEY, '{broken-json');
    expect(storage.load()).toBeNull();

    vi.stubGlobal('window', { localStorage: createMemoryStorage({ throwOnSet: true }) });
    expect(() => storage.save(sample)).not.toThrow();
  });

  it('returns null and no-ops safely when window or localStorage is unavailable or throws', () => {
    const storage = defaultStorage('custom-key');

    vi.stubGlobal('window', undefined);
    expect(storage.load()).toBeNull();
    expect(() => storage.save([{ test: true }])).not.toThrow();

    vi.stubGlobal('window', {});
    expect(storage.load()).toBeNull();
    expect(() => storage.save([{ test: true }])).not.toThrow();

    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
    });
    expect(storage.load()).toBeNull();
    expect(() => storage.save([{ test: true }])).not.toThrow();
  });
});
