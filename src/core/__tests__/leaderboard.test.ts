import { describe, expect, it } from 'vite-plus/test';
import { computePlayerLeaderboard } from '../leaderboard';
import { computeRoundResult } from '../round';
import { computeSeriesSummary } from '../series-analytics';
import type { Player, RollConfig } from '../types';

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

  it('keeps history-only players with a neutral color and ranks players without series last', () => {
    const configGhost: RollConfig = {
      faces: 6,
      countPerRoll: 1,
      seriesLength: 1,
      playerId: 'ghost',
    };
    const ghostRound = computeRoundResult(0, [3], 6);
    const ghostSummary = computeSeriesSummary('s-ghost', configGhost, 'Ghost', [ghostRound]);

    const leaderboard = computePlayerLeaderboard([ghostSummary], players);

    expect(leaderboard.map((entry) => entry.playerId)).toEqual(['ghost', 'p1', 'p2']);
    expect(leaderboard[0]).toMatchObject({
      playerName: 'Ghost',
      color: '#94a3b8',
      seriesPlayed: 1,
      totalRolls: 1,
    });
    expect(leaderboard[1]).toMatchObject({
      playerName: 'Alice',
      seriesPlayed: 0,
      totalRolls: 0,
      normalizedLuckScore: 100,
      criticalMaxRate: 0,
      coinSeriesWon: 0,
    });
    expect('coinTosses' in leaderboard[1]).toBe(false);

    const reversed = computePlayerLeaderboard([ghostSummary], [players[1], players[0]]);
    expect(reversed.map((entry) => entry.playerId)).toEqual(['ghost', 'p2', 'p1']);
  });

  it('scores empty coin and dice series as neutral luck without coin toss fields', () => {
    const coinConfig: RollConfig = {
      faces: 2,
      countPerRoll: 1,
      seriesLength: 1,
      playerId: 'p1',
    };
    const diceConfig: RollConfig = {
      faces: 6,
      countPerRoll: 1,
      seriesLength: 1,
      playerId: 'p2',
    };
    const emptyCoin = computeSeriesSummary('s-coin-empty', coinConfig, 'Alice', []);
    const emptyDice = computeSeriesSummary('s-dice-empty', diceConfig, 'Bob', []);

    const leaderboard = computePlayerLeaderboard([emptyCoin, emptyDice], players);
    const alice = leaderboard.find((p) => p.playerId === 'p1')!;
    const bob = leaderboard.find((p) => p.playerId === 'p2')!;

    expect(alice).toMatchObject({ seriesPlayed: 1, totalRolls: 0, normalizedLuckScore: 100 });
    expect(alice.coinSeriesWon).toBe(0);
    expect('coinTosses' in alice).toBe(false);
    expect(bob).toMatchObject({ seriesPlayed: 1, totalRolls: 0, normalizedLuckScore: 100 });
  });
});
