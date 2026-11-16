import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/svelte';
import type { RoundResult } from '../../../core/types';
import ArenaHud from '../ArenaHud.svelte';

const diceRoll: RoundResult = {
  id: 'round-1',
  roundIndex: 1,
  values: [2, 5],
  sum: 7,
  max: 5,
  min: 2,
  timestamp: 1_700_000_000_000,
  faces: 6,
};

const coinRoll: RoundResult = {
  id: 'coin-1',
  roundIndex: 0,
  values: [1, 2],
  sum: 3,
  max: 2,
  min: 1,
  headsCount: 1,
  tailsCount: 1,
  roundWinnerSide: 'TIE',
  timestamp: 1_700_000_000_000,
  faces: 2,
};

describe('ArenaHud', () => {
  it('renders accessible WebGL context-loss alert outside aria-hidden overlay when contextLost is true', async () => {
    const { getByRole, queryByRole, rerender } = render(ArenaHud, {
      props: {
        mode: 'series',
        contextLost: true,
        isRolling: false,
        isComplete: false,
        instantMode: false,
        roundsCount: 0,
        seriesLength: 3,
        roll: null,
        rollFaces: 6,
      },
    });

    const alert = getByRole('alert');
    expect(alert.textContent).toContain('WebGL Context Suspended');
    expect(alert.closest('[aria-hidden="true"]')).toBeNull();
    expect(queryByRole('status')).toBeNull();

    await rerender({
      mode: 'series',
      contextLost: false,
      isRolling: false,
      isComplete: false,
      instantMode: false,
      roundsCount: 0,
      seriesLength: 3,
      roll: null,
      rollFaces: 6,
    });
    expect(queryByRole('alert')).toBeNull();
  });

  it('displays status pills for quick, ready, active, complete, and instant states', async () => {
    const { getByText, queryByText, rerender } = render(ArenaHud, {
      props: {
        mode: 'series',
        contextLost: false,
        isRolling: false,
        isComplete: false,
        instantMode: false,
        roundsCount: 0,
        seriesLength: 3,
        roll: null,
        rollFaces: 6,
      },
    });

    expect(getByText('Ready to Roll')).toBeTruthy();
    expect(queryByText(/Fast Roll/)).toBeNull();

    await rerender({
      mode: 'series',
      contextLost: false,
      isRolling: false,
      isComplete: false,
      instantMode: true,
      roundsCount: 2,
      seriesLength: 3,
      roll: diceRoll,
      rollFaces: 6,
    });
    expect(getByText('Round 2 of 3')).toBeTruthy();
    expect(getByText(/Fast Roll \(No Anim\)/)).toBeTruthy();

    await rerender({
      mode: 'series',
      contextLost: false,
      isRolling: false,
      isComplete: true,
      instantMode: false,
      roundsCount: 3,
      seriesLength: 3,
      roll: diceRoll,
      rollFaces: 6,
    });
    expect(getByText('Series Complete (3/3)')).toBeTruthy();

    await rerender({
      mode: 'quick',
      contextLost: false,
      isRolling: false,
      isComplete: false,
      instantMode: false,
      roundsCount: 0,
      seriesLength: 3,
      roll: null,
      rollFaces: 6,
    });
    expect(getByText('Quick Roll (Free)')).toBeTruthy();
  });

  it('renders dice/coin result badges only when not rolling and respects rollFaces', async () => {
    const { getByText, queryByText, rerender } = render(ArenaHud, {
      props: {
        mode: 'series',
        contextLost: false,
        isRolling: false,
        isComplete: false,
        instantMode: false,
        roundsCount: 2,
        seriesLength: 3,
        roll: diceRoll,
        rollFaces: 6,
      },
    });

    expect(getByText('Round #2:')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();

    // Single die omits Sum
    await rerender({
      mode: 'series',
      contextLost: false,
      isRolling: false,
      isComplete: false,
      instantMode: false,
      roundsCount: 2,
      seriesLength: 3,
      roll: { ...diceRoll, values: [4], sum: 4 },
      rollFaces: 6,
    });
    expect(queryByText(/Sum:/)).toBeNull();

    // Coin roll in Quick mode renders HEADS/TAILS and omits Sum
    await rerender({
      mode: 'quick',
      contextLost: false,
      isRolling: false,
      isComplete: false,
      instantMode: false,
      roundsCount: 0,
      seriesLength: 3,
      roll: coinRoll,
      rollFaces: 2,
    });
    expect(getByText('Quick Roll:')).toBeTruthy();
    expect(getByText('HEADS')).toBeTruthy();
    expect(getByText('TAILS')).toBeTruthy();
    expect(queryByText(/Sum:/)).toBeNull();

    // Hidden while dice are rolling
    await rerender({
      mode: 'quick',
      contextLost: false,
      isRolling: true,
      isComplete: false,
      instantMode: false,
      roundsCount: 0,
      seriesLength: 3,
      roll: coinRoll,
      rollFaces: 2,
    });
    expect(queryByText('Quick Roll:')).toBeNull();
    expect(queryByText('HEADS')).toBeNull();
  });
});
