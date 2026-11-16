import { describe, it, expect, vi } from 'vite-plus/test';
import type { RollStorage } from '../../../core/persistence';
import { RollState } from '../rollState.svelte';

function createSpyStorage() {
  const save = vi.fn<RollStorage['save']>();
  const storage: RollStorage = { load: () => null, save };
  return { storage, save };
}

describe('RollState.addPlayer result', () => {
  it('returns the new player on success, activates it and persists', () => {
    const { storage, save } = createSpyStorage();
    const state = new RollState({ storage });
    const result = state.addPlayer('  Alice  ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.player.name).toBe('Alice');
    expect(state.players).toContainEqual(result.player);
    expect(state.activePlayerId).toBe(result.player.id);
    expect(save).toHaveBeenCalledOnce();
  });

  it.each(['', '   ', '\t\n'])('rejects empty name %j without persisting', (name) => {
    const { storage, save } = createSpyStorage();
    const state = new RollState({ storage });
    expect(state.addPlayer(name)).toEqual({ ok: false, reason: 'empty' });
    expect(state.players).toHaveLength(1);
    expect(save).not.toHaveBeenCalled();
  });

  it.each(['Alice', 'alice', 'ALICE', '  Alice  ', ' aLiCe\t'])(
    'rejects duplicate variant %j without persisting',
    (variant) => {
      const { storage, save } = createSpyStorage();
      const state = new RollState({ storage });
      expect(state.addPlayer('Alice').ok).toBe(true);
      save.mockClear();
      const activeBefore = state.activePlayerId;
      expect(state.addPlayer(variant)).toEqual({ ok: false, reason: 'duplicate' });
      expect(state.players).toHaveLength(2);
      expect(state.activePlayerId).toBe(activeBefore);
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('rejects the default player name as a duplicate', () => {
    const state = new RollState({ storage: createSpyStorage().storage });
    const existing = state.players[0].name;
    expect(state.addPlayer(existing.toUpperCase())).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('compares after slicing to the max name length', () => {
    const state = new RollState({ storage: createSpyStorage().storage });
    expect(state.addPlayer('x'.repeat(24)).ok).toBe(true);
    expect(state.addPlayer('x'.repeat(40))).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects with "locked" while rolling', () => {
    const { storage, save } = createSpyStorage();
    const state = new RollState({ storage });
    state.isRolling = true;
    expect(state.addPlayer('Bob')).toEqual({ ok: false, reason: 'locked' });
    expect(state.players).toHaveLength(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects with "locked" while a series is in progress', async () => {
    const { storage, save } = createSpyStorage();
    const state = new RollState({ storage });
    state.instantMode = true;
    state.setSeriesLength(3);
    await state.rollNextRound();
    expect(state.isSeriesInProgress).toBe(true);
    save.mockClear();
    expect(state.addPlayer('Bob')).toEqual({ ok: false, reason: 'locked' });
    expect(state.players).toHaveLength(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not crash on hydrated duplicates and still adds distinct names', () => {
    const payload = {
      version: 2,
      players: [
        { id: 'a', name: 'Sam', color: '#111111' },
        { id: 'b', name: 'sam', color: '#222222' },
      ],
      activePlayerId: 'a',
      history: [],
    };
    const state = new RollState({
      storage: { load: () => payload, save: vi.fn<RollStorage['save']>() },
    });
    expect(state.addPlayer('SAM')).toEqual({ ok: false, reason: 'duplicate' });
    expect(state.addPlayer('Other').ok).toBe(true);
  });
});
