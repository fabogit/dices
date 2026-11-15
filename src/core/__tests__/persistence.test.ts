import { describe, expect, it } from 'vitest';
import { computeRoundResult, computeSeriesSummary } from '../engine';
import { isPersistedSeriesSummary, sanitizePersistedHistory } from '../persistence';
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
