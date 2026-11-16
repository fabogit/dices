import { describe, it, expect, afterEach } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { RollStorage } from '../../../core/persistence';
import type { RollState } from '../../state/rollState.svelte';
import {
  createMemoryStorage,
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import HistoryPanel from '../HistoryPanel.svelte';

let rollState: RollState;
let storage: RollStorage;

function renderPanel(...rounds: number[][]) {
  storage = createMemoryStorage();
  rollState = createTestRollState({ provider: createScriptedProvider(...rounds), storage });
  return renderWithRollState(HistoryPanel, rollState);
}

/** Completes a one-round series per planned roll, so each lands in the history. */
async function completeSeries(times: number): Promise<void> {
  rollState.setSeriesLength(1);
  for (let i = 0; i < times; i++) {
    await rollState.rollNextRound();
    rollState.resetCurrentSeries({ announce: false });
  }
  await tick();
}

describe('HistoryPanel container', () => {
  afterEach(() => {
    rollState.dispose();
  });

  it('shows the empty state and no Clear action without history', () => {
    const { getByText, queryByRole } = renderPanel();

    expect(getByText(/No completed series yet/)).toBeTruthy();
    expect(queryByRole('button', { name: 'Clear all completed series history' })).toBeNull();
    expect(queryByRole('list', { name: 'Player leaderboard' })).toBeNull();
  });

  it('lists completed series and the leaderboard', async () => {
    const { getByRole, getAllByRole, getAllByTestId, queryByText } = renderPanel([5], [2]);
    await completeSeries(2);

    expect(queryByText(/No completed series yet/)).toBeNull();
    expect(getAllByTestId('player-name').map((el) => el.textContent)).toEqual(['Player 1']);
    const pastSeries = getByRole('region', { name: 'Scrollable list of past series' });
    expect(pastSeries.querySelectorAll('li')).toHaveLength(2);
    expect(getAllByRole('button', { name: 'Clear all completed series history' })).toHaveLength(1);
  });

  it('clears the history through the store and persists it', async () => {
    const { getByRole, getByText } = renderPanel([3]);
    await completeSeries(1);

    await fireEvent.click(getByRole('button', { name: 'Clear all completed series history' }));

    expect(rollState.history).toEqual([]);
    expect(storage.load()).toMatchObject({ history: [] });
    expect(getByText(/No completed series yet/)).toBeTruthy();
  });

  it('collapses and expands its body', async () => {
    const { getByRole } = renderPanel();
    await fireEvent.click(getByRole('button', { name: 'Hide History & Leaderboard' }));
    expect(
      getByRole('button', { name: 'Show History & Leaderboard' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });
});
