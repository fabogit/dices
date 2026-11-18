import { describe, expect, it, vi } from 'vite-plus/test';
import { LocalCryptoRollProvider, type IRollProvider } from '../provider';
import { computeRoundResult, createSeriesId } from '../round';

describe('computeRoundResult', () => {
  it('computes polyhedral dice metrics correctly (sum, min, max)', () => {
    const fixedTimestamp = 1700000000000;
    const round = computeRoundResult(0, [4, 6, 1, 5], 6, fixedTimestamp);

    expect(round).toEqual({
      kind: 'dice',
      id: expect.any(String) as string,
      roundIndex: 0,
      values: [4, 6, 1, 5],
      sum: 16,
      max: 6,
      min: 1,
      timestamp: fixedTimestamp,
      faces: 6,
    });
    expect(round.id.length).toBeGreaterThan(0);
    expect('headsCount' in round).toBe(false);
    expect('tailsCount' in round).toBe(false);
    expect('roundWinnerSide' in round).toBe(false);
  });

  it('assigns distinct stable ids across sequential rounds and handles missing randomUUID', () => {
    const r1 = computeRoundResult(0, [3], 6, 1700000000001);
    const r2 = computeRoundResult(0, [3], 6, 1700000000001);
    expect(r1.id).not.toBe(r2.id);

    vi.stubGlobal('crypto', {});
    try {
      const rFallback = computeRoundResult(0, [2], 6, 1700000000002);
      expect(rFallback.id).toMatch(/^round-1700000000002-\d+$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('computes coin toss metrics (faces = 2) for HEADS win', () => {
    // 1 = HEADS, 2 = TAILS
    const round = computeRoundResult(1, [1, 1, 2], 2);
    expect(round.sum).toBe(4);
    expect(round.headsCount).toBe(2);
    expect(round.tailsCount).toBe(1);
    expect(round.roundWinnerSide).toBe('HEADS');
  });

  it('computes coin toss metrics (faces = 2) for TAILS win', () => {
    const round = computeRoundResult(2, [2, 2, 1], 2);
    expect(round.headsCount).toBe(1);
    expect(round.tailsCount).toBe(2);
    expect(round.roundWinnerSide).toBe('TAILS');
  });

  it('computes coin toss metrics (faces = 2) for TIE', () => {
    const round = computeRoundResult(3, [1, 2], 2);
    expect(round.headsCount).toBe(1);
    expect(round.tailsCount).toBe(1);
    expect(round.roundWinnerSide).toBe('TIE');
  });

  it('handles empty round values', () => {
    const round = computeRoundResult(0, [], 6);
    expect(round.sum).toBe(0);
    expect(round.max).toBe(0);
    expect(round.min).toBe(0);
  });
});

describe('createSeriesId and LocalCryptoRollProvider', () => {
  it('generates distinct series ids and falls back cleanly when randomUUID is absent', () => {
    const id1 = createSeriesId(1700000000100);
    const id2 = createSeriesId(1700000000100);
    expect(id1.length).toBeGreaterThan(0);
    expect(id1).not.toBe(id2);

    vi.stubGlobal('crypto', {});
    try {
      const fallback = createSeriesId(1700000000200);
      expect(fallback).toMatch(/^series-1700000000200-\d+$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rolls deterministically with a custom RandomSource and uniformly with Web Crypto', async () => {
    const sequence = [5, 0];
    let idx = 0;
    const deterministicProvider: IRollProvider = new LocalCryptoRollProvider((buf) => {
      buf[0] = sequence[idx++];
      return buf;
    });
    expect(deterministicProvider.kind).toBe('local-csprng');
    expect(await deterministicProvider.rollRound(6, 2)).toEqual([6, 1]);

    const liveProvider: IRollProvider = new LocalCryptoRollProvider();
    const liveValues = await liveProvider.rollRound(20, 4);
    expect(liveValues).toHaveLength(4);
    for (const val of liveValues) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(20);
    }
  });
});
