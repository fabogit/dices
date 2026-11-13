import { describe, expect, it } from 'vitest';
import {
  ALLOWED_FACES,
  computeMode,
  computePlayerLeaderboard,
  computeQuickRollSessionStats,
  computeQuickRollStats,
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

  it('computes theoreticalRoundStdDev, standardized zScore, sampleReliability, and insightSummary', () => {
    // 2d6 series
    const r1 = computeRoundResult(0, [6, 6], 6); // sum: 12
    const r2 = computeRoundResult(1, [6, 5], 6); // sum: 11
    const analytics = computeSeriesAnalytics(configD6, [r1, r2]);

    // theoreticalRoundStdDev for 2d6: sqrt(2 * (36 - 1) / 12) = sqrt(70 / 12) = ~2.4152
    expect(analytics.theoreticalRoundStdDev).toBeCloseTo(Math.sqrt(70 / 12), 4);

    // 4 dice rolled: totalSum = 23, expected = 4 * 3.5 = 14
    // totalStdDev = sqrt(4 * 35 / 12) = sqrt(140 / 12) = ~3.41565
    // zScore = (23 - 14) / 3.41565 = ~2.6349
    expect(analytics.zScore).toBeGreaterThan(2.0);
    expect(analytics.sampleReliability).toBe('small'); // 4 dice < 10

    // Peak percentage should accommodate either empirical or expected baseline * 1.4
    expect(analytics.distributionPeakPercentage).toBeGreaterThanOrEqual(100 / 6);

    // Hottest face should be 6 (rolled 3 times out of 4)
    expect(analytics.hottestFaces).toEqual([6]);
    expect(analytics.coldestFaces.length).toBeGreaterThan(0);

    // insightSummary should be a descriptive English narrative
    expect(typeof analytics.insightSummary).toBe('string');
    expect(analytics.insightSummary).toContain('Small sample (4 dice)');
    expect(analytics.insightSummary).toContain('Running hot');
  });

  it('computes coin d2 zScore, coinStats, and distribution scaling accurately', () => {
    const configD2: RollConfig = {
      faces: 2,
      countPerRoll: 2,
      seriesLength: 2,
      playerId: 'p1',
    };

    // 4 tosses: 3 Heads (1), 1 Tails (2)
    const r0 = computeRoundResult(0, [1, 1], 2); // 2 Heads -> HEADS won
    const r1 = computeRoundResult(1, [1, 2], 2); // 1 Heads, 1 Tails -> TIE
    const analytics = computeSeriesAnalytics(configD2, [r0, r1]);

    expect(analytics.totalDiceRolled).toBe(4);
    // theoreticalRoundStdDev for 2d2: sqrt(2 * (4 - 1) / 12) = sqrt(6 / 12) = sqrt(0.5) = ~0.7071
    expect(analytics.theoreticalRoundStdDev).toBeCloseTo(Math.SQRT1_2, 4);

    // zScore for d2: (headsCount - 0.5 * n) / (0.5 * sqrt(n)) = (3 - 2) / (0.5 * 2) = 1.0
    expect(analytics.zScore).toBeCloseTo(1.0, 4);

    expect(analytics.coinStats).toBeDefined();
    expect(analytics.coinStats?.headsCount).toBe(3);
    expect(analytics.coinStats?.tailsCount).toBe(1);
    expect(analytics.coinStats?.headsPercentage).toBe(75);
    expect(analytics.coinStats?.tailsPercentage).toBe(25);
    expect(analytics.coinStats?.headsDeltaPercentage).toBe(25); // 75 - 50
    expect(analytics.coinStats?.tailsDeltaPercentage).toBe(-25); // 25 - 50
    expect(analytics.coinStats?.headsRoundsWon).toBe(1);
    expect(analytics.coinStats?.tailsRoundsWon).toBe(0);
    expect(analytics.coinStats?.tieRounds).toBe(1);

    // distributionPeakPercentage should scale relative to the highest empirical bar (75%)
    expect(analytics.distributionPeakPercentage).toBe(75);

    expect(analytics.insightSummary).toContain('Heads-leaning');
  });

  it('classifies sampleReliability levels correctly from empty to solid', () => {
    const configD20: RollConfig = {
      faces: 20,
      countPerRoll: 10,
      seriesLength: 4,
      playerId: 'p1',
    };

    expect(computeSeriesAnalytics(configD20, []).sampleReliability).toBe('empty');

    const singleRoundSmall = [computeRoundResult(0, [5, 10, 15], 20)];
    expect(computeSeriesAnalytics(configD20, singleRoundSmall).sampleReliability).toBe('small'); // 3 dice

    const fifteenDice = [
      computeRoundResult(0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 20),
      computeRoundResult(1, [11, 12, 13, 14, 15], 20),
    ];
    expect(computeSeriesAnalytics(configD20, fifteenDice).sampleReliability).toBe('moderate'); // 15 dice

    const thirtyDice = [
      computeRoundResult(0, Array(10).fill(10), 20),
      computeRoundResult(1, Array(10).fill(10), 20),
      computeRoundResult(2, Array(10).fill(10), 20),
    ];
    expect(computeSeriesAnalytics(configD20, thirtyDice).sampleReliability).toBe('solid'); // 30 dice
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

  it('correctly calculates d2 coin luck score (Heads-based) and avoids inverted scoring', () => {
    // 100% Heads: should yield 200.0% Luck Score (not 66.7%)
    const configCoin: RollConfig = {
      faces: 2,
      countPerRoll: 2,
      seriesLength: 1,
      playerId: 'p1',
    };
    const roundAllHeads = computeRoundResult(0, [1, 1], 2);
    const summaryHeads = computeSeriesSummary('sc-heads', configCoin, 'Alice', [roundAllHeads]);

    // 0% Heads (100% Tails): should yield 0.0% Luck Score (not 133.3%)
    const configCoinBob: RollConfig = {
      faces: 2,
      countPerRoll: 2,
      seriesLength: 1,
      playerId: 'p2',
    };
    const roundAllTails = computeRoundResult(0, [2, 2], 2);
    const summaryTails = computeSeriesSummary('sc-tails', configCoinBob, 'Bob', [roundAllTails]);

    const leaderboard = computePlayerLeaderboard([summaryHeads, summaryTails], players);
    const alice = leaderboard.find((p) => p.playerId === 'p1');
    const bob = leaderboard.find((p) => p.playerId === 'p2');

    expect(alice?.normalizedLuckScore).toBe(200);
    expect(bob?.normalizedLuckScore).toBe(0);
    expect(alice?.coinHeadsRate).toBe(100);
    expect(bob?.coinHeadsRate).toBe(0);
  });

  it('weights player luckScore by total dice rolled in each series', () => {
    // Alice plays a long 10-dice fair series (Luck 100%) and a 1-coin lucky Heads fluke (Luck 200%)
    const configLong: RollConfig = {
      faces: 6,
      countPerRoll: 5,
      seriesLength: 2,
      playerId: 'p1',
    };
    // Expected round sum for 5d6 is 5 * 3.5 = 17.5. Two rounds of sum 17.5 = average 17.5 (100% luck)
    const r1 = computeRoundResult(0, [3, 4, 3, 4, 4], 6); // sum 18
    const r2 = computeRoundResult(1, [3, 4, 3, 4, 3], 6); // sum 17
    const summaryLong = computeSeriesSummary('s-long', configLong, 'Alice', [r1, r2]);

    const configFluke: RollConfig = {
      faces: 2,
      countPerRoll: 1,
      seriesLength: 1,
      playerId: 'p1',
    };
    const rFluke = computeRoundResult(0, [1], 2); // 1 Heads -> 200% luck
    const summaryFluke = computeSeriesSummary('s-fluke', configFluke, 'Alice', [rFluke]);

    const leaderboard = computePlayerLeaderboard([summaryLong, summaryFluke], players);
    const alice = leaderboard.find((p) => p.playerId === 'p1')!;

    // 10 rolls at 100% luck + 1 roll at 200% luck:
    // Weighted luck: (10 * 100 + 1 * 200) / 11 = 1200 / 11 = 109.09%
    // (If it were unweighted: (100 + 200) / 2 = 150%)
    expect(alice.totalRolls).toBe(11);
    expect(alice.normalizedLuckScore).toBeCloseTo(109.09, 1);
  });
});

describe('computeQuickRollStats', () => {
  it('computes single coin toss and multi-coin statistics', () => {
    const singleCoin = computeRoundResult(0, [1], 2);
    const stats1 = computeQuickRollStats(singleCoin, 2);
    expect(stats1.faces).toBe(2);
    expect(stats1.headsCount).toBe(1);
    expect(stats1.tailsCount).toBe(0);
    expect(stats1.headsPercentage).toBe(100);
    expect(stats1.insight).toContain('Landed Heads');

    const singleTails = computeRoundResult(0, [2], 2);
    const statsTails = computeQuickRollStats(singleTails, 2);
    expect(statsTails.insight).toBe('Landed Tails.');

    const multiCoin = computeRoundResult(0, [1, 1, 2], 2);
    const stats2 = computeQuickRollStats(multiCoin, 2);
    expect(stats2.headsCount).toBe(2);
    expect(stats2.tailsCount).toBe(1);
    expect(stats2.headsPercentage).toBeCloseTo(66.67, 1);
    expect(stats2.insight).toContain('Heads majority');

    const multiTails = computeRoundResult(0, [1, 2, 2], 2);
    const stats3 = computeQuickRollStats(multiTails, 2);
    expect(stats3.insight).toContain('Tails majority');

    const evenSplit = computeRoundResult(0, [1, 2], 2);
    const statsEven = computeQuickRollStats(evenSplit, 2);
    expect(statsEven.insight).toBe('Even split (1H / 1T).');
  });

  it('computes polyhedral dice single roll insights (nat 20, nat 1, delta)', () => {
    const nat20 = computeRoundResult(0, [20], 20);
    const stats20 = computeQuickRollStats(nat20, 20);
    expect(stats20.expectedSum).toBe(10.5);
    expect(stats20.sumDelta).toBe(9.5);
    expect(stats20.criticalMaxCount).toBe(1);
    expect(stats20.insight).toContain('Natural 20! Maximum possible roll');

    const nat1 = computeRoundResult(0, [1], 20);
    const stats1 = computeQuickRollStats(nat1, 20);
    expect(stats1.criticalMinCount).toBe(1);
    expect(stats1.insight).toContain('Natural 1. Minimum possible roll');

    const aboveAvg = computeRoundResult(0, [5], 6);
    const statsAbove = computeQuickRollStats(aboveAvg, 6);
    expect(statsAbove.insight).toContain('Above average');

    const belowAvg = computeRoundResult(0, [2], 6);
    const statsBelow = computeQuickRollStats(belowAvg, 6);
    expect(statsBelow.insight).toContain('Below average');
  });

  it('computes multi-dice round statistics and standardized z-score', () => {
    // 3d6 roll: [6, 6, 5] -> sum 17
    // Expected sum: 3 * 3.5 = 10.5. sumDelta = 6.5
    const roll3d6 = computeRoundResult(0, [6, 6, 5], 6);
    const stats = computeQuickRollStats(roll3d6, 6);
    expect(stats.sum).toBe(17);
    expect(stats.expectedSum).toBe(10.5);
    expect(stats.sumDelta).toBe(6.5);
    expect(stats.criticalMaxCount).toBe(2);
    expect(stats.zScore).toBeGreaterThan(1.5);
    expect(stats.insight).toContain('High roll');
    expect(stats.insight).toContain('2x nat 6');

    // 3d6 low roll: [1, 1, 1] -> sum 3
    const low3d6 = computeRoundResult(0, [1, 1, 1], 6);
    const statsLow = computeQuickRollStats(low3d6, 6);
    expect(statsLow.zScore).toBeLessThan(-1.5);
    expect(statsLow.insight).toContain('Low roll: sum 3');
    expect(statsLow.insight).toContain('3x nat 1');

    // 3d6 typical roll: [3, 4, 4] -> sum 11 (near 10.5)
    const typical3d6 = computeRoundResult(0, [3, 4, 4], 6);
    const statsTypical = computeQuickRollStats(typical3d6, 6);
    expect(statsTypical.zScore).toBeDefined();
    expect(Math.abs(statsTypical.zScore!)).toBeLessThan(1.0);
    expect(statsTypical.insight).toContain('Typical roll: sum 11');
  });
});

describe('computeQuickRollSessionStats', () => {
  it('filters rolls matching active die face so d6 and d20 are not mixed', () => {
    const rD6_1 = computeRoundResult(0, [4], 6);
    rD6_1.faces = 6;
    const rD6_2 = computeRoundResult(1, [6], 6);
    rD6_2.faces = 6;

    const rD20 = computeRoundResult(2, [20], 20);
    rD20.faces = 20;

    const quickRolls = [rD20, rD6_2, rD6_1];

    const d6Session = computeQuickRollSessionStats(quickRolls, 6);
    expect(d6Session.matchingThrows).toBe(2);
    expect(d6Session.totalDiceCount).toBe(2);
    // Average of 4 and 6 is 5.0
    expect(d6Session.actualAverage).toBe(5.0);
    expect(d6Session.expectedAverage).toBe(3.5);
    expect(d6Session.averageDelta).toBe(1.5);
    expect(d6Session.criticalMaxCount).toBe(1);

    const d20Session = computeQuickRollSessionStats(quickRolls, 20);
    expect(d20Session.matchingThrows).toBe(1);
    expect(d20Session.actualAverage).toBe(20.0);
  });

  it('computes coin balance verdict and session split', () => {
    const r1 = computeRoundResult(0, [1, 1], 2);
    r1.faces = 2;
    const r2 = computeRoundResult(1, [1, 2], 2);
    r2.faces = 2;

    const coinSession = computeQuickRollSessionStats([r2, r1], 2);
    expect(coinSession.matchingThrows).toBe(2);
    expect(coinSession.totalDiceCount).toBe(4);
    expect(coinSession.totalHeads).toBe(3);
    expect(coinSession.totalTails).toBe(1);
    expect(coinSession.headsPercentage).toBe(75);
    expect(coinSession.tailsPercentage).toBe(25);
    expect(coinSession.balanceVerdict).toBe('Heads-leaning');
    expect(coinSession.insight).toContain('75.0% Heads / 25.0% Tails');

    // Tails-leaning session
    const rTails1 = computeRoundResult(2, [2, 2], 2);
    rTails1.faces = 2;
    const rTails2 = computeRoundResult(3, [2, 2], 2);
    rTails2.faces = 2;
    const tailsSession = computeQuickRollSessionStats([rTails2, rTails1], 2);
    expect(tailsSession.balanceVerdict).toBe('Tails-leaning');
    expect(tailsSession.headsPercentage).toBe(0);
    expect(tailsSession.tailsPercentage).toBe(100);

    // Evenly balanced session
    const rEven1 = computeRoundResult(4, [1, 2], 2);
    rEven1.faces = 2;
    const rEven2 = computeRoundResult(5, [1, 2], 2);
    rEven2.faces = 2;
    const evenSession = computeQuickRollSessionStats([rEven2, rEven1], 2);
    expect(evenSession.balanceVerdict).toBe('Evenly balanced');
    expect(evenSession.headsPercentage).toBe(50);
  });

  it('handles empty quick roll sessions gracefully', () => {
    const emptySession = computeQuickRollSessionStats([], 12);
    expect(emptySession.matchingThrows).toBe(0);
    expect(emptySession.totalDiceCount).toBe(0);
    expect(emptySession.insight).toContain('No d12 rolls');
  });
});

