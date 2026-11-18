import { describe, it, expect, afterEach } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { RollState } from '../../state/rollState.svelte';
import {
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import SeriesScoreboard from '../SeriesScoreboard.svelte';

let rollState: RollState;

function renderScoreboard(...rounds: number[][]) {
  rollState = createTestRollState({ provider: createScriptedProvider(...rounds) });
  return renderWithRollState(SeriesScoreboard, rollState);
}

async function roll(times: number): Promise<void> {
  for (let i = 0; i < times; i++) await rollState.rollNextRound();
  await tick();
}

describe('SeriesScoreboard container', () => {
  afterEach(() => {
    rollState.dispose();
  });

  it('shows an empty dice series for the active player', () => {
    const { getByText, getByRole } = renderScoreboard();

    expect(getByText('Round 0 of 3')).toBeTruthy();
    const progress = getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('3');
    expect(progress.style.width).toBe('0%');
    expect(getByText('Total Sum (∑)')).toBeTruthy();
    expect(getByText('No rounds rolled yet. Press "Roll Round" to begin.')).toBeTruthy();
    expect(getByText(/Round results for active series \(Player 1\)/)).toBeTruthy();
  });

  it('tracks rolled rounds, progress and the rounds table', async () => {
    const { getByText, getByRole, getAllByRole } = renderScoreboard([4], [6]);
    await roll(2);

    expect(getByText('Round 2 of 3')).toBeTruthy();
    const progress = getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(progress.style.width).toBe(`${rollState.progressPercent}%`);
    expect(getByText('10')).toBeTruthy();
    // header row + one row per round
    expect(getAllByRole('row')).toHaveLength(3);
    expect(getByRole('rowheader', { name: '#2' })).toBeTruthy();
  });

  it('switches to the coin cards and announces the series winner once complete', async () => {
    const { getByText, getByRole, queryByRole } = renderScoreboard([1], [1]);
    rollState.setFaces(2);
    rollState.setSeriesLength(2);
    await tick();

    expect(getByText('HEADS')).toBeTruthy();
    expect(getByRole('columnheader', { name: 'Coins' })).toBeTruthy();
    expect(queryByRole('status')).toBeNull();

    await roll(2);
    expect(getByRole('status').textContent).toContain('HEADS Wins the Series!');
    expect(getByText('Round 2 of 2')).toBeTruthy();
  });

  it('collapses and expands its body', async () => {
    const { getByRole } = renderScoreboard();
    const toggle = getByRole('button', { name: 'Hide Live Series Scoreboard' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    await fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show Live Series Scoreboard');
  });
});
