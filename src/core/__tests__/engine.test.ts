import { describe, expect, it } from 'vitest';
import {
  ALLOWED_FACES,
  computeMode,
  computePlayerLeaderboard,
  computeRoundResult,
  computeSeriesAnalytics,
  computeSeriesSummary,
  LocalCryptoRollProvider,
  rollBatchCryptoFair,
  rollCryptoFair,
  RollSeriesEngine,
  validateRollConfig,
  type DieFaces,
  type IRollProvider,
  type Player,
  type RollConfig,
  type RoundResult,
} from '../index';

describe('validateRollConfig', () => {
  const validBaseConfig: RollConfig = {
    faces: 6,
    countPerRoll: 2,
    seriesLength: 5,
    playerId: 'player-1',
  };

  it('accepts all allowed polyhedral faces and coin', () => {
    for (const faces of ALLOWED_FACES) {
      expect(() =>
        validateRollConfig({
          ...validBaseConfig,
          faces,
        })
      ).not.toThrow();
    }
  });

  it('rejects invalid face counts', () => {
    const invalidFaces = [0, 1, 3, 5, 7, 9, 11, 100, -6, NaN] as unknown as DieFaces[];
    for (const faces of invalidFaces) {
      expect(() =>
        validateRollConfig({
          ...validBaseConfig,
          faces,
        })
      ).toThrow(/Invalid faces count/i);
    }
  });

  it('rejects non-integer float values for countPerRoll and seriesLength', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: 2.5,
      })
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: 4.8,
      })
    ).toThrow(/Invalid seriesLength/i);
  });

  it('rejects NaN or infinity values', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: NaN,
      })
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: Infinity,
      })
    ).toThrow(/Invalid seriesLength/i);
  });

  it('rejects out-of-range countPerRoll (< 1 or > 10)', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: 0,
      })
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: -1,
      })
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: 11,
      })
    ).toThrow(/Invalid countPerRoll/i);
  });

  it('rejects out-of-range seriesLength (< 1 or > 21)', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: 0,
      })
    ).toThrow(/Invalid seriesLength/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: -5,
      })
    ).toThrow(/Invalid seriesLength/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: 22,
      })
    ).toThrow(/Invalid seriesLength/i);
  });

  it('rejects empty or whitespace-only playerId', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        playerId: '',
      })
    ).toThrow(/playerId must be a non-empty string/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        playerId: '    ',
      })
    ).toThrow(/playerId must be a non-empty string/i);
  });

  it('rejects non-object configurations', () => {
    expect(() => validateRollConfig(null as unknown as RollConfig)).toThrow(
      /Roll configuration must be a valid object/i
    );
  });
});

describe('rollCryptoFair and rollBatchCryptoFair', () => {
  it('rejects values >= rejection limit deterministically and recovers on valid value', () => {
    // For d6: limit is Math.floor(0x100000000 / 6) * 6 = 4294967292 (0xfffffffcu)
    // 4294967295 (0xffffffffu) >= limit -> MUST REJECT
    // 4294967293 (0xfffffffdu) >= limit -> MUST REJECT
    // 8 < limit -> ACCEPT -> (8 % 6) + 1 = 3
    const sequence = [4294967295, 4294967293, 8];
    let callCount = 0;

    const mockRandomSource = (buf: Uint32Array): Uint32Array => {
      buf[0] = sequence[callCount++];
      return buf;
    };

    const result = rollCryptoFair(6, mockRandomSource);

    expect(callCount).toBe(3);
    expect(result).toBe(3);
  });

  it('maps boundary values correctly', () => {
    // Minimum value: rand = 0 -> (0 % 20) + 1 = 1
    const minMock = (buf: Uint32Array): Uint32Array => {
      buf[0] = 0;
      return buf;
    };
    expect(rollCryptoFair(20, minMock)).toBe(1);

    // Maximum accepted value for d6: limit - 1 = 4294967291 -> (4294967291 % 6) + 1 = 5 + 1 = 6
    const limitD6 = Math.floor(0x100000000 / 6) * 6;
    const maxMock = (buf: Uint32Array): Uint32Array => {
      buf[0] = limitD6 - 1;
      return buf;
    };
    expect(rollCryptoFair(6, maxMock)).toBe(6);
  });

  it('throws when rollCryptoFair is called with unsupported face count', () => {
    expect(() => rollCryptoFair(7 as unknown as DieFaces)).toThrow(/Invalid faces count/i);
  });

  it('generates batches of fair rolls in range [1, faces]', () => {
    const results = rollBatchCryptoFair(20, 50);
    expect(results).toHaveLength(50);
    for (const val of results) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  it('handles empty batch (count = 0)', () => {
    const results = rollBatchCryptoFair(6, 0);
    expect(results).toEqual([]);
  });

  it('rejects negative or non-integer counts in rollBatchCryptoFair', () => {
    expect(() => rollBatchCryptoFair(6, -1)).toThrow(/non-negative integer/i);
    expect(() => rollBatchCryptoFair(6, 1.5)).toThrow(/non-negative integer/i);
  });
});

describe('computeRoundResult', () => {
  it('computes polyhedral dice metrics correctly (sum, min, max)', () => {
    const fixedTimestamp = 1700000000000;
    const round = computeRoundResult(0, [4, 6, 1, 5], 6, fixedTimestamp);

    expect(round).toEqual({
      roundIndex: 0,
      values: [4, 6, 1, 5],
      sum: 16,
      max: 6,
      min: 1,
      timestamp: fixedTimestamp,
    });
    expect(round.headsCount).toBeUndefined();
    expect(round.tailsCount).toBeUndefined();
    expect(round.roundWinnerSide).toBeUndefined();
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

describe('computeMode', () => {
  it('handles empty array', () => {
    const mode = computeMode([]);
    expect(mode).toEqual({
      values: [],
      frequency: 0,
      isTie: false,
    });
  });

  it('identifies single unique mode', () => {
    const mode = computeMode([1, 4, 4, 2, 4, 3]);
    expect(mode).toEqual({
      values: [4],
      frequency: 3,
      isTie: false,
    });
  });

  it('identifies multimodal / tie mode sorted ascending', () => {
    const mode = computeMode([6, 2, 6, 3, 2, 5]);
    expect(mode).toEqual({
      values: [2, 6],
      frequency: 2,
      isTie: true,
    });
  });

  it('marks all values as tie when every frequency is 1', () => {
    const mode = computeMode([5, 1, 3]);
    expect(mode).toEqual({
      values: [1, 3, 5],
      frequency: 1,
      isTie: true,
    });
  });
});

describe('computeSeriesSummary', () => {
  it('summarizes polyhedral dice series (d6 multi-dice, best/worst round, mode)', () => {
    const config: RollConfig = {
      faces: 6,
      countPerRoll: 2,
      seriesLength: 3,
      playerId: 'player-alpha',
    };

    const r0 = computeRoundResult(0, [2, 3], 6); // sum: 5
    const r1 = computeRoundResult(1, [6, 6], 6); // sum: 12 (best)
    const r2 = computeRoundResult(2, [1, 2], 6); // sum: 3 (worst)

    const summary = computeSeriesSummary('series-1', config, 'Alice', [r0, r1, r2]);

    expect(summary.id).toBe('series-1');
    expect(summary.playerId).toBe('player-alpha');
    expect(summary.playerName).toBe('Alice');
    expect(summary.totalSum).toBe(20);
    expect(summary.overallMax).toBe(6);
    expect(summary.overallMin).toBe(1);
    expect(summary.average).toBeCloseTo(20 / 3, 5);
    expect(summary.bestRoundIndex).toBe(1);
    expect(summary.worstRoundIndex).toBe(2);
    // values: 2, 3, 6, 6, 1, 2 -> 2 appears twice, 6 appears twice -> tie between 2 and 6
    expect(summary.mode).toEqual({
      values: [2, 6],
      frequency: 2,
      isTie: true,
    });
    expect(summary.coinSeriesWinner).toBeUndefined();
  });

  it('summarizes coin Best-of-3 series with clear winner', () => {
    const config: RollConfig = {
      faces: 2,
      countPerRoll: 1,
      seriesLength: 3,
      playerId: 'coin-player',
    };

    // 1 = HEADS, 2 = TAILS
    const r0 = computeRoundResult(0, [1], 2); // HEADS
    const r1 = computeRoundResult(1, [2], 2); // TAILS
    const r2 = computeRoundResult(2, [1], 2); // HEADS

    const summary = computeSeriesSummary('series-coin', config, 'Bob', [r0, r1, r2]);

    expect(summary.totalHeads).toBe(2);
    expect(summary.totalTails).toBe(1);
    expect(summary.headsRoundsWon).toBe(2);
    expect(summary.tailsRoundsWon).toBe(1);
    expect(summary.coinSeriesWinner).toBe('HEADS');
  });

  it('summarizes coin series resulting in a TIE', () => {
    const config: RollConfig = {
      faces: 2,
      countPerRoll: 1,
      seriesLength: 2,
      playerId: 'coin-player',
    };

    const r0 = computeRoundResult(0, [1], 2); // HEADS
    const r1 = computeRoundResult(1, [2], 2); // TAILS

    const summary = computeSeriesSummary('series-coin-tie', config, 'Bob', [r0, r1]);

    expect(summary.headsRoundsWon).toBe(1);
    expect(summary.tailsRoundsWon).toBe(1);
    expect(summary.coinSeriesWinner).toBe('TIE');
  });

  it('handles empty series safely', () => {
    const config: RollConfig = {
      faces: 20,
      countPerRoll: 1,
      seriesLength: 5,
      playerId: 'p1',
    };

    const summary = computeSeriesSummary('empty-series', config, 'Solo', []);

    expect(summary.totalSum).toBe(0);
    expect(summary.overallMax).toBe(0);
    expect(summary.overallMin).toBe(0);
    expect(summary.average).toBe(0);
    expect(summary.bestRoundIndex).toBe(-1);
    expect(summary.worstRoundIndex).toBe(-1);
    expect(summary.rounds).toHaveLength(0);
  });
});

describe('RollSeriesEngine and IRollProvider', () => {
  class MockDeterministicProvider implements IRollProvider {
    readonly kind = 'local-csprng' as const;
    private call = 0;

    constructor(private readonly sequence: number[][]) {}

    async rollRound(_faces: DieFaces, _count: number): Promise<number[]> {
      const next = this.sequence[this.call++];
      return next ?? [1];
    }
  }

  it('executes a series round-by-round and tracks completion state', async () => {
    const config: RollConfig = {
      faces: 20,
      countPerRoll: 1,
      seriesLength: 2,
      playerId: 'hero',
    };

    const mockProvider = new MockDeterministicProvider([[15], [20]]);
    const engine = new RollSeriesEngine(config, 'Paladin', mockProvider, 'test-engine-id');

    expect(engine.id).toBe('test-engine-id');
    expect(engine.isComplete).toBe(false);
    expect(engine.currentRoundIndex).toBe(0);

    const round0 = await engine.rollNextRound();
    expect(round0.roundIndex).toBe(0);
    expect(round0.values).toEqual([15]);
    expect(engine.isComplete).toBe(false);
    expect(engine.currentRoundIndex).toBe(1);

    const round1 = await engine.rollNextRound();
    expect(round1.roundIndex).toBe(1);
    expect(round1.values).toEqual([20]);
    expect(engine.isComplete).toBe(true);

    // Further rolls should throw error
    await expect(engine.rollNextRound()).rejects.toThrow(/Series is already complete/i);

    const summary = engine.getSummary();
    expect(summary.overallMax).toBe(20);
    expect(summary.overallMin).toBe(15);
    expect(summary.totalSum).toBe(35);
    expect(summary.bestRoundIndex).toBe(1);
    expect(summary.worstRoundIndex).toBe(0);

    // Reset allows re-running
    engine.reset();
    expect(engine.rounds).toHaveLength(0);
    expect(engine.isComplete).toBe(false);
  });

  it('executes all remaining rounds at once with rollAllRemainingRounds', async () => {
    const config: RollConfig = {
      faces: 6,
      countPerRoll: 2,
      seriesLength: 3,
      playerId: 'wizard',
    };

    const mockProvider = new MockDeterministicProvider([
      [3, 4],
      [1, 6],
      [5, 5],
    ]);
    const engine = new RollSeriesEngine(config, 'Gandalf', mockProvider);

    const rounds = await engine.rollAllRemainingRounds();
    expect(rounds).toHaveLength(3);
    expect(engine.isComplete).toBe(true);
    expect(rounds[0].values).toEqual([3, 4]);
    expect(rounds[1].values).toEqual([1, 6]);
    expect(rounds[2].values).toEqual([5, 5]);

    const summary = engine.getSummary();
    expect(summary.totalSum).toBe(24);
    expect(summary.average).toBe(8);
  });

  it('works seamlessly with LocalCryptoRollProvider', async () => {
    const config: RollConfig = {
      faces: 6,
      countPerRoll: 2,
      seriesLength: 2,
      playerId: 'local-player',
    };

    const provider = new LocalCryptoRollProvider();
    const engine = new RollSeriesEngine(config, 'DefaultUser', provider);

    const rounds = await engine.rollAllRemainingRounds();
    expect(rounds).toHaveLength(2);
    for (const r of rounds) {
      expect(r.values).toHaveLength(2);
      for (const val of r.values) {
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('computeSeriesAnalytics', () => {
  const configD6: RollConfig = {
    faces: 6,
    countPerRoll: 2,
    seriesLength: 2,
    playerId: 'p1',
  };

  it('computes empty analytics correctly when no rounds have been played', () => {
    const analytics = computeSeriesAnalytics(configD6, []);
    expect(analytics.totalDiceRolled).toBe(0);
    expect(analytics.expectedRoundAverage).toBe(7); // 2 * (6 + 1)/2 = 7
    expect(analytics.averageDelta).toBe(0);
    expect(analytics.standardDeviation).toBe(0);
    expect(analytics.highRollRate).toBe(0);
    expect(analytics.criticalMaxRate).toBe(0);
    expect(analytics.criticalMinRate).toBe(0);
    expect(analytics.distribution).toHaveLength(6);
    for (const item of analytics.distribution) {
      expect(item.count).toBe(0);
      expect(item.percentage).toBe(0);
      expect(item.expectedPercentage).toBeCloseTo(16.666, 2);
      expect(item.deltaPercentage).toBeCloseTo(-16.666, 2);
    }
  });

  it('computes mathematical variance, std deviation, and averages accurately', () => {
    const round1 = computeRoundResult(0, [2, 4], 6); // sum = 6
    const round2 = computeRoundResult(1, [6, 6], 6); // sum = 12
    const rounds: RoundResult[] = [round1, round2];

    const analytics = computeSeriesAnalytics(configD6, rounds);
    expect(analytics.totalDiceRolled).toBe(4);
    expect(analytics.expectedRoundAverage).toBe(7);

    // Round sums: 6, 12. Mean = 9.
    // Variance = ((6-9)^2 + (12-9)^2) / 2 = (9 + 9) / 2 = 9
    // Std deviation = sqrt(9) = 3
    expect(analytics.standardDeviation).toBe(3);
    expect(analytics.averageDelta).toBe(2); // 9 - 7 = 2

    // High rolls (> 3): [4, 6, 6] -> 3 out of 4 (75%)
    expect(analytics.highRollCount).toBe(3);
    expect(analytics.highRollRate).toBe(75);

    // Critical max (= 6): [6, 6] -> 2 out of 4 (50%)
    expect(analytics.criticalMaxCount).toBe(2);
    expect(analytics.criticalMaxRate).toBe(50);

    // Critical min (= 1): 0 out of 4 (0%)
    expect(analytics.criticalMinCount).toBe(0);
    expect(analytics.criticalMinRate).toBe(0);

    // Distribution
    const d6Face6 = analytics.distribution.find((d) => d.face === 6);
    expect(d6Face6?.count).toBe(2);
    expect(d6Face6?.percentage).toBe(50);
    expect(d6Face6?.expectedPercentage).toBeCloseTo(16.666, 2);
    expect(d6Face6?.deltaPercentage).toBeCloseTo(33.333, 2);

    const d6Face2 = analytics.distribution.find((d) => d.face === 2);
    expect(d6Face2?.count).toBe(1);
    expect(d6Face2?.percentage).toBe(25);
  });

  it('computes coin d2 analytics with HEADS/TAILS labels and critical semantics', () => {
    const configD2: RollConfig = {
      faces: 2,
      countPerRoll: 1,
      seriesLength: 3,
      playerId: 'p1',
    };

    // 1 = HEADS, 2 = TAILS
    const round1 = computeRoundResult(0, [1], 2); // Heads
    const round2 = computeRoundResult(1, [1], 2); // Heads
    const round3 = computeRoundResult(2, [2], 2); // Tails
    const rounds = [round1, round2, round3];

    const analytics = computeSeriesAnalytics(configD2, rounds);
    expect(analytics.totalDiceRolled).toBe(3);
    expect(analytics.expectedRoundAverage).toBe(1.5); // 1 * (2 + 1)/2

    // For d2, 1 = HEADS is criticalMax and highRoll, 2 = TAILS is criticalMin
    expect(analytics.criticalMaxCount).toBe(2);
    expect(analytics.criticalMaxRate).toBeCloseTo(66.666, 2);
    expect(analytics.criticalMinCount).toBe(1);
    expect(analytics.criticalMinRate).toBeCloseTo(33.333, 2);

    expect(analytics.distribution[0].label).toBe('HEADS');
    expect(analytics.distribution[0].count).toBe(2);
    expect(analytics.distribution[1].label).toBe('TAILS');
    expect(analytics.distribution[1].count).toBe(1);
  });
});

describe('computePlayerLeaderboard', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alice', color: '#38bdf8' },
    { id: 'p2', name: 'Bob', color: '#34d399' },
  ];

  it('aggregates and normalizes stats across different dice face sizes', () => {
    const configD6: RollConfig = {
      faces: 6,
      countPerRoll: 1,
      seriesLength: 2,
      playerId: 'p1',
    };
    const r1 = computeRoundResult(0, [6], 6);
    const r2 = computeRoundResult(1, [6], 6);
    const summaryD6 = computeSeriesSummary('s1', configD6, 'Alice', [r1, r2]);
    // Alice rolled average 6 on d6 (expected 3.5).
    // Luck = (6 / 3.5) * 100 = ~171.4%

    const configD20: RollConfig = {
      faces: 20,
      countPerRoll: 1,
      seriesLength: 1,
      playerId: 'p2',
    };
    const r3 = computeRoundResult(0, [10], 20);
    const summaryD20 = computeSeriesSummary('s2', configD20, 'Bob', [r3]);
    // Bob rolled average 10 on d20 (expected 10.5).
    // Luck = (10 / 10.5) * 100 = ~95.2%

    const leaderboard = computePlayerLeaderboard([summaryD6, summaryD20], players);

    expect(leaderboard).toHaveLength(2);
    // Alice should be ranked #1
    expect(leaderboard[0].playerName).toBe('Alice');
    expect(leaderboard[0].seriesPlayed).toBe(1);
    expect(leaderboard[0].totalRolls).toBe(2);
    expect(leaderboard[0].normalizedLuckScore).toBeGreaterThan(170);
    expect(leaderboard[0].criticalMaxRate).toBe(100);

    // Bob should be ranked #2
    expect(leaderboard[1].playerName).toBe('Bob');
    expect(leaderboard[1].seriesPlayed).toBe(1);
    expect(leaderboard[1].totalRolls).toBe(1);
    expect(leaderboard[1].normalizedLuckScore).toBeLessThan(100);
    expect(leaderboard[1].criticalMaxRate).toBe(0);
  });

  it('tracks coinSeriesWon accurately when Heads wins the series', () => {
    const configCoin: RollConfig = {
      faces: 2,
      countPerRoll: 1,
      seriesLength: 1,
      playerId: 'p1',
    };
    const roundWin = computeRoundResult(0, [1], 2); // Heads
    const summaryCoin = computeSeriesSummary('sc1', configCoin, 'Alice', [roundWin]);

    const leaderboard = computePlayerLeaderboard([summaryCoin], players);
    const aliceEntry = leaderboard.find((p) => p.playerId === 'p1');
    expect(aliceEntry?.coinSeriesWon).toBe(1);
  });
});

