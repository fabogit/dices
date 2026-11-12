import { describe, it, expect, beforeEach } from 'vitest';
import { RollState } from '../rollState.svelte';

describe('RollState Controller', () => {
  let state: RollState;

  beforeEach(() => {
    state = new RollState();
    state.clearHistory();
    state.resetCurrentSeries();
  });

  it('initializes with default settings', () => {
    expect(state.faces).toBe(6);
    expect(state.countPerRoll).toBe(1);
    expect(state.seriesLength).toBe(3);
    expect(state.players.length).toBe(1);
    expect(state.activePlayer.name).toBe('Player 1');
    expect(state.rounds.length).toBe(0);
    expect(state.isComplete).toBe(false);
  });

  it('updates faces and clamps parameters', () => {
    state.setFaces(20);
    expect(state.faces).toBe(20);

    state.setCountPerRoll(15);
    expect(state.countPerRoll).toBe(10);

    state.setCountPerRoll(0);
    expect(state.countPerRoll).toBe(1);

    state.setSeriesLength(30);
    expect(state.seriesLength).toBe(21);

    state.setSeriesLength(-5);
    expect(state.seriesLength).toBe(1);
  });

  it('manages players correctly', () => {
    state.addPlayer('Alice');
    expect(state.players.length).toBe(2);
    expect(state.activePlayer.name).toBe('Alice');

    state.setActivePlayer('player-1');
    expect(state.activePlayer.name).toBe('Player 1');
  });

  it('executes a round and produces valid summary', async () => {
    state.setFaces(6);
    state.setCountPerRoll(2);
    state.setSeriesLength(2);

    const round1 = await state.rollNextRound();
    expect(round1).not.toBeNull();
    expect(round1?.values.length).toBe(2);
    expect(state.rounds.length).toBe(1);
    expect(state.isComplete).toBe(false);
    expect(state.announcerMessage).toContain('Round 1 of 2: Rolled');

    const round2 = await state.rollNextRound();
    expect(round2).not.toBeNull();
    expect(state.rounds.length).toBe(2);
    expect(state.isComplete).toBe(true);
    expect(state.history.length).toBe(1);
    expect(state.announcerMessage).toContain('Series complete');
  });

  it('handles coin d2 series outcome and tie detection', async () => {
    state.setFaces(2);
    state.setCountPerRoll(1);
    state.setSeriesLength(1);

    const round = await state.rollNextRound();
    expect(round).not.toBeNull();
    expect(state.isComplete).toBe(true);
    expect(state.summary.coinSeriesWinner).toBeDefined();
    expect(['HEADS', 'TAILS', 'TIE']).toContain(state.summary.coinSeriesWinner);
  });

  it('executes autoRollSeries to completion in instant mode', async () => {
    state.instantMode = true;
    state.setFaces(8);
    state.setCountPerRoll(3);
    state.setSeriesLength(5);

    await state.autoRollSeries();
    expect(state.rounds.length).toBe(5);
    expect(state.isComplete).toBe(true);
    expect(state.history.length).toBe(1);
  });

  it('toggles instant mode and handles reset and clear history', () => {
    const prev = state.instantMode;
    state.toggleInstantMode();
    expect(state.instantMode).toBe(!prev);

    state.clearHistory();
    expect(state.history.length).toBe(0);
  });

  it('provides analytics and updates leaderboard upon series completion', async () => {
    state.instantMode = true;
    state.setFaces(6);
    state.setCountPerRoll(2);
    state.setSeriesLength(3);

    await state.autoRollSeries();

    expect(state.isComplete).toBe(true);
    expect(state.summary.analytics).toBeDefined();
    expect(state.summary.analytics.totalDiceRolled).toBe(6);
    expect(state.summary.analytics.distribution).toHaveLength(6);
    expect(state.summary.analytics.expectedRoundAverage).toBe(7);
    expect(state.summary.analytics.theoreticalRoundStdDev).toBeGreaterThan(0);
    expect(typeof state.summary.analytics.zScore).toBe('number');
    expect(['small', 'moderate', 'solid']).toContain(state.summary.analytics.sampleReliability);
    expect(state.summary.analytics.distributionPeakPercentage).toBeGreaterThan(0);
    expect(state.summary.analytics.insightSummary.length).toBeGreaterThan(0);

    // Leaderboard should have an entry for Player 1
    expect(state.leaderboard).toHaveLength(1);
    expect(state.leaderboard[0].playerName).toBe('Player 1');
    expect(state.leaderboard[0].seriesPlayed).toBe(1);
    expect(state.leaderboard[0].totalRolls).toBe(6);
    expect(state.leaderboard[0].normalizedLuckScore).toBeGreaterThan(0);
  });

  it('preserves faces property on QuickRoll results across configuration changes', async () => {
    state.setMode('quick');

    state.setFaces(20);
    state.setCountPerRoll(1);
    const rollD20 = await state.executeQuickRoll();
    expect(rollD20?.faces).toBe(20);
    expect(state.latestQuickRoll).toBe(rollD20);

    state.setFaces(6);
    state.setCountPerRoll(2);
    const rollD6 = await state.executeQuickRoll();
    expect(rollD6?.faces).toBe(6);
    expect(state.latestQuickRoll).toBe(rollD6);

    state.setFaces(2);
    state.setCountPerRoll(1);
    const rollCoin = await state.executeQuickRoll();
    expect(rollCoin?.faces).toBe(2);
    expect(state.latestQuickRoll).toBe(rollCoin);

    // Verify all history retains their respective original faces
    expect(state.quickRolls[0].faces).toBe(2);
    expect(state.quickRolls[1].faces).toBe(6);
    expect(state.quickRolls[2].faces).toBe(20);
  });

  it('handles Quick Roll mode, continuous execution without locks, and feed clearing', async () => {
    state.setMode('quick');
    expect(state.mode).toBe('quick');
    expect(state.announcerMessage).toContain('Switched to Quick Roll mode');

    state.setFaces(20);
    state.setCountPerRoll(2);

    // Roll 1
    const roll1 = await state.executeQuickRoll();
    expect(roll1).not.toBeNull();
    expect(roll1?.values.length).toBe(2);
    expect(state.quickRolls.length).toBe(1);
    expect(state.latestQuickRoll).toBe(roll1);
    expect(state.history.length).toBe(0); // Quick rolls do NOT add to series history!

    // Roll 2 immediately without reset
    const roll2 = await state.executeQuickRoll();
    expect(roll2).not.toBeNull();
    expect(state.quickRolls.length).toBe(2);
    expect(state.latestQuickRoll).toBe(roll2);
    expect(state.history.length).toBe(0);

    // Roll coin in quick mode
    state.setFaces(2);
    state.setCountPerRoll(3);
    const rollCoin = await state.executeQuickRoll();
    expect(rollCoin).not.toBeNull();
    expect(rollCoin?.values.length).toBe(3);
    expect(state.quickRolls.length).toBe(3);
    expect(state.announcerMessage).toContain('Quick roll:');

    // Clear feed
    state.clearQuickRolls();
    expect(state.quickRolls.length).toBe(0);
    expect(state.latestQuickRoll).toBeNull();
    expect(state.announcerMessage).toContain('Quick roll feed cleared');

    // Switch back to series
    state.setMode('series');
    expect(state.mode).toBe('series');
  });
});
