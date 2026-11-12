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
});
