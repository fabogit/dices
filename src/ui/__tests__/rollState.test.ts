import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeRoundResult, computeSeriesSummary } from '../../core/engine';
import type { PersistedStateV2, RollStorage } from '../../core/persistence';
import type { IRollProvider } from '../../core/provider';
import type { DieFaces } from '../../core/types';
import { RollState } from '../state/rollState.svelte';

/**
 * Arena double whose roll animation only finishes when the test calls `land()`.
 */
function createDeferredArena() {
  let resolveLanding: (() => void) | undefined;
  const land = (): void => {
    resolveLanding?.();
    resolveLanding = undefined;
  };
  const arena: any = {
    rollVisual: () =>
      new Promise<void>((resolve) => {
        resolveLanding = resolve;
      }),
    skipCurrentAnimation: land,
  };
  return { arena, land, isAnimating: () => resolveLanding !== undefined };
}

describe('RollState Controller', () => {
  let state: RollState;

  beforeEach(() => {
    window.localStorage?.clear();
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
    expect(state.latestRound).toBeNull();
    expect(state.progressPercent).toBe(0);
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
    expect(state.latestQuickRoll).toEqual(rollD20);

    state.setFaces(6);
    state.setCountPerRoll(2);
    const rollD6 = await state.executeQuickRoll();
    expect(rollD6?.faces).toBe(6);
    expect(state.latestQuickRoll).toEqual(rollD6);

    state.setFaces(2);
    state.setCountPerRoll(1);
    const rollCoin = await state.executeQuickRoll();
    expect(rollCoin?.faces).toBe(2);
    expect(state.latestQuickRoll).toEqual(rollCoin);

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
    expect(state.latestQuickRoll).toEqual(roll1);
    expect(state.history.length).toBe(0); // Quick rolls do NOT add to series history!

    // Roll 2 immediately without reset
    const roll2 = await state.executeQuickRoll();
    expect(roll2).not.toBeNull();
    expect(state.quickRolls.length).toBe(2);
    expect(state.latestQuickRoll).toEqual(roll2);
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

  it('manages arena attachment, animations, and context loss', async () => {
    let rollVisualCalled = false;
    let skipAnimationCalled = false;

    const mockArena: any = {
      rollVisual: async () => {
        rollVisualCalled = true;
      },
      skipCurrentAnimation: () => {
        skipAnimationCalled = true;
      },
      render: () => {},
      dispose: () => {},
    };

    state.setArena(mockArena);
    state.skipAnimation();
    expect(skipAnimationCalled).toBe(true);

    expect(state.contextLost).toBe(false);
    state.setContextLost(true);
    expect(state.contextLost).toBe(true);
    state.setContextLost(false);
    expect(state.contextLost).toBe(false);

    // Roll with arena attached
    state.instantMode = true;
    await state.rollNextRound();
    expect(rollVisualCalled).toBe(true);

    // Quick roll with arena attached
    rollVisualCalled = false;
    await state.executeQuickRoll();
    expect(rollVisualCalled).toBe(true);

    state.setArena(null);
  });

  it('runs animated autoRollSeries with brief pause when instantMode is false', async () => {
    state.instantMode = false;
    state.setSeriesLength(2);
    state.setCountPerRoll(1);
    await state.autoRollSeries();
    expect(state.rounds.length).toBe(2);
    expect(state.isComplete).toBe(true);
  });

  it('handles edge cases in configuration setters and player management', () => {
    // Setting identical face count does nothing
    state.setFaces(6);
    expect(state.faces).toBe(6);

    // Setting identical count does nothing
    state.setCountPerRoll(1);
    expect(state.countPerRoll).toBe(1);

    // Setting identical series length does nothing
    state.setSeriesLength(3);
    expect(state.seriesLength).toBe(3);

    // addPlayer with whitespace or empty string does not create a player
    const prevCount = state.players.length;
    state.addPlayer('');
    expect(state.players.length).toBe(prevCount);
    state.addPlayer('   ');
    expect(state.players.length).toBe(prevCount);

    // setActivePlayer with identical ID does nothing
    state.setActivePlayer(state.activePlayerId);

    // setActivePlayer with non-existent ID does nothing
    state.setActivePlayer('non-existent-player-id');
    expect(state.activePlayerId).toBe('player-1');

    // setMode with identical mode does nothing
    state.setMode('series');
    expect(state.mode).toBe('series');
  });

  it('handles concurrency and guard conditions on roll actions', async () => {
    state.instantMode = true;
    state.setSeriesLength(1);

    // Complete the series
    await state.rollNextRound();
    expect(state.isComplete).toBe(true);

    // Attempting rollNextRound when isComplete returns null
    const extraRoll = await state.rollNextRound();
    expect(extraRoll).toBeNull();

    // Attempting autoRollSeries when isComplete returns early without error
    await state.autoRollSeries();

    // Reset and test isRolling lock guard
    state.resetCurrentSeries();
    state.isRolling = true;
    const lockedRound = await state.rollNextRound();
    expect(lockedRound).toBeNull();

    const lockedQuick = await state.executeQuickRoll();
    expect(lockedQuick).toBeNull();

    await state.autoRollSeries(); // Returns early because isRolling = true
    state.isRolling = false;
  });

  it('stops autoRollSeries cleanly when requested', async () => {
    state.instantMode = false;
    state.setSeriesLength(10);

    // Start auto roll and immediately stop
    const autoPromise = state.autoRollSeries();
    state.stopAutoRoll();
    await autoPromise;

    expect(state.isAutoRolling).toBe(false);
    expect(state.rounds.length).toBeLessThan(10);
  });

  it('handles corrupt localStorage, v1 migration, and invalid v2 payloads safely', () => {
    const store = new Map<string, string>();
    // Storage is only read in a browser-like environment, so `window` must exist too.
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    });

    try {
      localStorage.setItem('dices_state_v2', 'invalid-json{{');
      const stateFromCorrupt = new RollState();
      expect(stateFromCorrupt.history).toEqual([]);
      expect(stateFromCorrupt.players).toHaveLength(1);
      expect(stateFromCorrupt.activePlayer.name).toBe('Player 1');

      localStorage.setItem('dices_state_v2', '{"not":"v2"}');
      const stateFromObject = new RollState();
      expect(stateFromObject.history).toEqual([]);

      localStorage.removeItem('dices_state_v2');
      const validSummary = computeSeriesSummary(
        'series-persisted',
        { faces: 6, countPerRoll: 1, seriesLength: 1, playerId: 'p-alice' },
        'Alice',
        [computeRoundResult(0, [4], 6, 1_000, 'round-persisted')],
        2_000,
      );
      localStorage.setItem('dices_history_v1', JSON.stringify([{}, validSummary, 42]));
      const stateFromMigrated = new RollState();
      expect(stateFromMigrated.history.map((entry) => entry.id)).toEqual(['series-persisted']);
      expect(stateFromMigrated.players.map((p) => p.name)).toEqual(['Player 1', 'Alice']);
      expect(stateFromMigrated.activePlayer.name).toBe('Alice');
      expect(localStorage.getItem('dices_history_v1')).toBeNull();
      expect(localStorage.getItem('dices_state_v2')).not.toBeNull();

      localStorage.clear();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not revive a stopped auto-roll loop when restarted during the inter-round pause', async () => {
    vi.useFakeTimers();
    try {
      state.instantMode = false;
      state.setSeriesLength(8);

      const first = state.autoRollSeries();
      await vi.advanceTimersByTimeAsync(0);
      expect(state.rounds.length).toBe(1);

      // Stop and restart while the first loop is still inside its 450ms pause
      state.stopAutoRoll();
      const second = state.autoRollSeries();
      await vi.advanceTimersByTimeAsync(0);
      expect(state.rounds.length).toBe(2);
      expect(state.isAutoRolling).toBe(true);

      // Only the second loop may roll once the pauses elapse
      await vi.advanceTimersByTimeAsync(450);
      expect(state.rounds.length).toBe(3);
      expect(state.isAutoRolling).toBe(true);

      state.stopAutoRoll();
      await vi.advanceTimersByTimeAsync(450);
      await Promise.all([first, second]);
      expect(state.isAutoRolling).toBe(false);
      expect(state.rounds.length).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('yields auto-roll to another roll in flight instead of spinning on the busy guard', async () => {
    vi.useFakeTimers();
    try {
      state.instantMode = false;
      state.setSeriesLength(5);

      const auto = state.autoRollSeries();
      await vi.advanceTimersByTimeAsync(0);
      expect(state.rounds.length).toBe(1);

      // A manual roll takes the lock during the pause and fast mode is switched on
      state.isRolling = true;
      state.instantMode = true;
      await vi.advanceTimersByTimeAsync(450);
      await auto;

      expect(state.isAutoRolling).toBe(false);
      expect(state.rounds.length).toBe(1);
      state.isRolling = false;
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps counting quick rolls past the 25-entry feed cap', async () => {
    state.instantMode = true;
    state.setMode('quick');

    for (let i = 0; i < 27; i++) {
      await state.executeQuickRoll();
    }

    expect(state.quickRolls.length).toBe(25);
    expect(state.quickRollCount).toBe(27);
    expect(state.latestQuickRoll?.roundIndex).toBe(26);
    expect(new Set(state.quickRolls.map((roll) => roll.roundIndex)).size).toBe(25);

    state.clearQuickRolls();
    expect(state.quickRollCount).toBe(0);
  });

  it('ignores non-finite configuration input', () => {
    state.setSeriesLength(Number.NaN);
    state.setCountPerRoll(Number.POSITIVE_INFINITY);
    expect(state.seriesLength).toBe(3);
    expect(state.countPerRoll).toBe(1);
  });

  it('locks the setup and the active player while a series is in progress', async () => {
    state.instantMode = true;
    state.setSeriesLength(3);
    state.addPlayer('Alice');
    expect(state.isConfigLocked).toBe(false);

    await state.rollNextRound();
    expect(state.isSeriesInProgress).toBe(true);
    expect(state.isConfigLocked).toBe(true);

    state.setFaces(20);
    state.setCountPerRoll(4);
    state.setSeriesLength(7);
    state.setActivePlayer('player-1');
    state.addPlayer('Bob');

    expect(state.faces).toBe(6);
    expect(state.countPerRoll).toBe(1);
    expect(state.seriesLength).toBe(3);
    expect(state.activePlayer.name).toBe('Alice');
    expect(state.players).toHaveLength(2);
    expect(state.rounds).toHaveLength(1);
    expect(state.announcerMessage).toContain('Series in progress');

    // An explicit reset unlocks the setup
    state.resetCurrentSeries();
    expect(state.isConfigLocked).toBe(false);
    state.setFaces(20);
    expect(state.faces).toBe(20);

    // A completed series no longer locks it either
    state.setSeriesLength(1);
    await state.rollNextRound();
    expect(state.isComplete).toBe(true);
    expect(state.isConfigLocked).toBe(false);
    state.setFaces(8);
    expect(state.faces).toBe(8);
    expect(state.rounds).toHaveLength(0);
  });

  it('keeps a series in progress intact while Quick Roll uses another die', async () => {
    state.instantMode = true;
    state.setCountPerRoll(2);
    await state.rollNextRound();
    const seriesRounds = state.rounds;

    state.setMode('quick');
    expect(state.isConfigLocked).toBe(false);
    state.setFaces(20);
    state.setCountPerRoll(5);
    expect(state.faces).toBe(20);
    expect(state.rounds).toBe(seriesRounds);
    expect(state.announcerMessage).not.toContain('Series reset');

    const quick = await state.executeQuickRoll();
    expect(quick?.faces).toBe(20);
    expect(quick?.values).toHaveLength(5);

    // Returning to Series mode restores the setup the series was started with
    state.setMode('series');
    expect(state.faces).toBe(6);
    expect(state.countPerRoll).toBe(2);
    const next = await state.rollNextRound();
    expect(next?.values).toHaveLength(2);
    expect(state.rounds).toHaveLength(2);
  });

  it('does not announce a series reset for setup changes made in Quick Roll mode', () => {
    state.setMode('quick');
    state.setFaces(12);
    state.setCountPerRoll(4);
    expect(state.faces).toBe(12);
    expect(state.countPerRoll).toBe(4);
    expect(state.announcerMessage).toBe('Switched to Quick Roll mode.');
    expect(state.summary.config.faces).toBe(12);

    // An empty series adopts the setup silently upon returning to Series mode
    state.setMode('series');
    expect(state.faces).toBe(12);
    expect(state.countPerRoll).toBe(4);
    expect(state.summary.config.faces).toBe(12);
    expect(state.summary.config.countPerRoll).toBe(4);
    expect(state.announcerMessage).toBe('Switched to Series mode.');
  });

  it('preserves a completed series while Quick Roll uses another die and restores it on return', async () => {
    state.instantMode = true;
    state.setFaces(6);
    state.setCountPerRoll(2);
    state.setSeriesLength(1);
    await state.rollNextRound();
    expect(state.isComplete).toBe(true);
    const completedRounds = state.rounds;

    state.setMode('quick');
    state.setFaces(20);
    state.setCountPerRoll(5);
    expect(state.rounds).toBe(completedRounds);
    expect(state.isComplete).toBe(true);

    const quick = await state.executeQuickRoll();
    expect(quick?.faces).toBe(20);
    expect(quick?.values).toHaveLength(5);

    state.setMode('series');
    expect(state.faces).toBe(6);
    expect(state.countPerRoll).toBe(2);
    expect(state.rounds).toBe(completedRounds);
    expect(state.summary.config.faces).toBe(6);
    expect(state.summary.config.countPerRoll).toBe(2);
  });

  it('keeps announcement coherent and locks setup while Round 1 is in flight', async () => {
    const { arena, land, isAnimating } = createDeferredArena();
    state.setArena(arena);
    state.instantMode = false;
    state.setSeriesLength(2);
    state.addPlayer('Alice');

    const inFlight = state.rollNextRound();
    await vi.waitFor(() => expect(isAnimating()).toBe(true));
    expect(state.isRolling).toBe(true);
    expect(state.isSeriesInProgress).toBe(false);
    expect(state.isConfigLocked).toBe(false);

    // Direct calls during flight are ignored without emitting "Series in progress"
    state.setFaces(20);
    state.setCountPerRoll(4);
    state.setSeriesLength(5);
    state.setActivePlayer('player-1');
    state.addPlayer('Bob');
    state.setMode('quick');

    expect(state.faces).toBe(6);
    expect(state.countPerRoll).toBe(1);
    expect(state.seriesLength).toBe(2);
    expect(state.activePlayer.name).toBe('Alice');
    expect(state.players).toHaveLength(2);
    expect(state.mode).toBe('series');
    expect(state.announcerMessage).not.toContain('Series in progress');

    land();
    await inFlight;
    expect(state.rounds).toHaveLength(1);
    expect(state.isSeriesInProgress).toBe(true);
    expect(state.isConfigLocked).toBe(true);
    expect(state.announcerMessage).toContain('Round 1 of 2');

    // Quick Roll in flight also ignores direct mode and setup changes until landed
    state.resetCurrentSeries();
    state.setMode('quick');
    const quickInFlight = state.executeQuickRoll();
    await vi.waitFor(() => expect(isAnimating()).toBe(true));
    state.setFaces(20);
    state.setMode('series');
    expect(state.faces).toBe(6);
    expect(state.mode).toBe('quick');
    expect(state.announcerMessage).not.toContain('Series in progress');

    land();
    await quickInFlight;
    expect(state.announcerMessage).toContain('Quick roll:');

    state.setMode('series');
    expect(state.mode).toBe('series');
    state.setArena(null);
  });

  it('blocks mode switching during the auto-roll inter-round pause until stopped', async () => {
    vi.useFakeTimers();
    try {
      state.instantMode = false;
      state.setSeriesLength(4);

      const auto = state.autoRollSeries();
      await vi.advanceTimersByTimeAsync(0);
      expect(state.rounds).toHaveLength(1);
      expect(state.isRolling).toBe(false);
      expect(state.isAutoRolling).toBe(true);

      // Mode switching stays blocked while auto-roll is paused between rounds
      state.setMode('quick');
      expect(state.mode).toBe('series');
      expect(state.isAutoRolling).toBe(true);

      // Stopping auto-roll unlocks mode switching cleanly
      state.stopAutoRoll();
      expect(state.isAutoRolling).toBe(false);
      state.setMode('quick');
      expect(state.mode).toBe('quick');

      await vi.advanceTimersByTimeAsync(450);
      await auto;
      expect(state.rounds).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reveals results only after the dice have landed', async () => {
    const { arena, land, isAnimating } = createDeferredArena();
    state.setArena(arena);
    state.instantMode = false;
    state.setSeriesLength(2);

    const seriesRoll = state.rollNextRound();
    await vi.waitFor(() => expect(isAnimating()).toBe(true));
    expect(state.isRolling).toBe(true);
    expect(state.rounds).toHaveLength(0);
    expect(state.summary.rounds).toHaveLength(0);
    expect(state.announcerMessage).not.toContain('Round 1');

    land();
    const round = await seriesRoll;
    expect(state.rounds).toEqual([round]);
    expect(state.summary.rounds).toHaveLength(1);
    expect(state.announcerMessage).toContain('Round 1 of 2');

    state.setMode('quick');
    const quickRoll = state.executeQuickRoll();
    await vi.waitFor(() => expect(isAnimating()).toBe(true));
    expect(state.quickRolls).toHaveLength(0);
    expect(state.quickRollCount).toBe(0);

    land();
    const quick = await quickRoll;
    expect(state.latestQuickRoll).toEqual(quick);
    expect(state.quickRollCount).toBe(1);
    state.setArena(null);
  });

  it('discards a round still in flight when the series is reset', async () => {
    const { arena, isAnimating } = createDeferredArena();
    state.setArena(arena);
    state.instantMode = false;

    const inFlight = state.rollNextRound();
    await vi.waitFor(() => expect(isAnimating()).toBe(true));
    state.resetCurrentSeries();

    expect(await inFlight).toBeNull();
    expect(state.rounds).toHaveLength(0);
    expect(state.isRolling).toBe(false);
    expect(state.announcerMessage).toContain('Series reset');
    state.setArena(null);
  });

  it('keeps the rolled result when the 3D animation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockArena: any = {
      rollVisual: () => Promise.reject(new Error('DiceArena3D is disposed')),
      skipCurrentAnimation: () => {},
    };
    state.setArena(mockArena);

    try {
      const round = await state.rollNextRound();
      expect(round).not.toBeNull();
      expect(state.rounds).toHaveLength(1);

      state.setMode('quick');
      const quick = await state.executeQuickRoll();
      expect(quick).not.toBeNull();
      expect(state.quickRolls).toHaveLength(1);
      expect(consoleError).toHaveBeenCalledTimes(2);
    } finally {
      consoleError.mockRestore();
      state.setArena(null);
    }
  });

  it('reacts to prefers-reduced-motion media query change events via addEventListener', () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal('window', {
      matchMedia: vi
        .fn<
          (query: string) => {
            matches: boolean;
            addEventListener: (event: string, cb: (event: MediaQueryListEvent) => void) => void;
          }
        >()
        .mockReturnValue({
          matches: false,
          addEventListener: (_event: string, cb: (event: MediaQueryListEvent) => void) => {
            changeHandler = cb;
          },
        }),
    });

    try {
      const motionState = new RollState();
      expect(motionState.instantMode).toBe(false);
      expect(changeHandler).toBeDefined();
      changeHandler?.({ matches: true } as MediaQueryListEvent);
      expect(motionState.instantMode).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('memoizes $derived summary and leaderboard on the Svelte client runtime', async () => {
    state.instantMode = true;
    const firstSummary = state.summary;
    expect(state.summary).toBe(firstSummary);

    const firstLeaderboard = state.leaderboard;
    expect(state.leaderboard).toBe(firstLeaderboard);

    state.setFaces(20);
    const updatedSummary = state.summary;
    expect(updatedSummary).not.toBe(firstSummary);
    expect(state.summary).toBe(updatedSummary);

    state.setSeriesLength(1);
    await state.rollNextRound();
    const updatedLeaderboard = state.leaderboard;
    expect(updatedLeaderboard).not.toBe(firstLeaderboard);
    expect(state.leaderboard).toBe(updatedLeaderboard);
  });

  it('uses injected IRollProvider and RollStorage ports for rolling and v2 persistence', async () => {
    const initialSummary = computeSeriesSummary(
      'initial-series',
      { faces: 6, countPerRoll: 1, seriesLength: 1, playerId: 'player-1' },
      'Player 1',
      [computeRoundResult(0, [3], 6, 1_000, 'initial-round')],
      2_000,
    );
    let persistedPayload: unknown = [initialSummary, { invalid: true }];
    const savedSnapshots: PersistedStateV2[] = [];
    const customStorage: RollStorage = {
      load: () => persistedPayload,
      save: (payload) => {
        persistedPayload = payload;
        savedSnapshots.push(payload as PersistedStateV2);
      },
    };
    const queue = [
      [2, 5],
      [1, 1],
    ];
    const rollCalls: Array<{ faces: DieFaces; count: number }> = [];
    const customProvider: IRollProvider = {
      kind: 'remote-multiplayer',
      rollRound: async (faces, count) => {
        rollCalls.push({ faces, count });
        return queue.shift() ?? [1];
      },
    };

    const injected = new RollState({ provider: customProvider, storage: customStorage });
    injected.instantMode = true;
    injected.setFaces(6);
    injected.setCountPerRoll(2);
    injected.setSeriesLength(1);

    expect(injected.history.map((s) => s.id)).toEqual(['initial-series']);

    injected.addPlayer('Alice');
    expect(savedSnapshots).toHaveLength(1);
    expect(savedSnapshots[0].players.map((p) => p.name)).toEqual(['Player 1', 'Alice']);
    expect(savedSnapshots[0].activePlayerId).toBe(injected.activePlayerId);

    injected.setActivePlayer('player-1');
    expect(savedSnapshots).toHaveLength(2);
    expect(savedSnapshots[1].activePlayerId).toBe('player-1');

    const seriesRound = await injected.rollNextRound();
    expect(seriesRound?.values).toEqual([2, 5]);
    expect(seriesRound?.faces).toBe(6);
    expect(rollCalls).toEqual([{ faces: 6, count: 2 }]);
    expect(injected.history).toHaveLength(2);
    expect(savedSnapshots).toHaveLength(3);
    expect(savedSnapshots[2].version).toBe(2);
    expect(savedSnapshots[2].history[0].id).toBe(injected.history[0].id);

    injected.setMode('quick');
    injected.setFaces(2);
    const quickRound = await injected.executeQuickRoll();
    expect(quickRound?.values).toEqual([1, 1]);
    expect(quickRound?.faces).toBe(2);
    expect(rollCalls).toEqual([
      { faces: 6, count: 2 },
      { faces: 2, count: 2 },
    ]);

    injected.clearHistory();
    expect(injected.history).toEqual([]);
    const afterClear = savedSnapshots.at(-1);
    expect(afterClear?.history).toEqual([]);
    expect(afterClear?.players.map((p) => p.name)).toEqual(['Player 1', 'Alice']);

    // Rehydrating from the saved v2 snapshot retains players cleanly without history
    const reloaded = new RollState({ provider: customProvider, storage: customStorage });
    expect(reloaded.history).toEqual([]);
    expect(reloaded.players.map((p) => p.name)).toEqual(['Player 1', 'Alice']);
    expect(reloaded.activePlayerId).toBe('player-1');
  });

  it('exposes seriesFaces independently and silently resets a completed series on player change in Quick Roll', async () => {
    state.instantMode = true;
    state.setFaces(2);
    state.setSeriesLength(1);
    await state.rollNextRound();
    expect(state.isComplete).toBe(true);
    expect(state.seriesFaces).toBe(2);

    state.setMode('quick');
    state.setFaces(20);
    expect(state.faces).toBe(20);
    expect(state.seriesFaces).toBe(2);

    state.addPlayer('Alice');
    expect(state.activePlayer.name).toBe('Alice');
    expect(state.rounds).toHaveLength(0);
    expect(state.seriesFaces).toBe(20);
    expect(state.announcerMessage).toBe('Switched to Quick Roll mode.');

    state.setActivePlayer('player-1');
    expect(state.activePlayer.id).toBe('player-1');
    expect(state.rounds).toHaveLength(0);
    expect(state.announcerMessage).toBe('Switched to Quick Roll mode.');
  });

  it('ignores clearQuickRolls while a quick roll is in flight', async () => {
    const { arena, land, isAnimating } = createDeferredArena();
    state.instantMode = true;
    state.setMode('quick');

    const initialRoll = await state.executeQuickRoll();
    expect(initialRoll?.roundIndex).toBe(0);
    expect(state.quickRollCount).toBe(1);

    state.setArena(arena);
    state.instantMode = false;
    const inFlight = state.executeQuickRoll();
    await vi.waitFor(() => expect(isAnimating()).toBe(true));
    expect(state.isRolling).toBe(true);

    state.clearQuickRolls();
    expect(state.quickRolls).toHaveLength(1);
    expect(state.quickRollCount).toBe(1);

    land();
    const landedRoll = await inFlight;
    expect(landedRoll?.roundIndex).toBe(1);
    expect(state.quickRollCount).toBe(2);
    expect(state.quickRolls).toHaveLength(2);
    state.setArena(null);
  });
});
