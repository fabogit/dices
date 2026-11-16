import { describe, it, expect, afterEach } from 'vite-plus/test';
import { fireEvent, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { DieFaces } from '../../../core/types';
import type { RollState } from '../../state/rollState.svelte';
import {
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import StatisticalBreakdown from '../StatisticalBreakdown.svelte';

let rollState: RollState;

/** Renders the breakdown for a `faces` × `count` series and plays the planned rounds. */
async function renderBreakdown(faces: DieFaces, count: number, ...rounds: number[][]) {
  rollState = createTestRollState({ provider: createScriptedProvider(...rounds) });
  rollState.setFaces(faces);
  rollState.setCountPerRoll(count);
  rollState.setSeriesLength(Math.max(rounds.length, 1));
  for (const _ of rounds) await rollState.rollNextRound();
  const view = renderWithRollState(StatisticalBreakdown, rollState);
  await tick();
  const metrics = view.getByTestId('analytics-metrics');
  /** The value row of the StatBox labelled `label`. */
  const statValue = (label: string): string =>
    within(metrics).getByText(label).nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim() ??
    '';
  return { ...view, metrics, statValue };
}

describe('StatisticalBreakdown container', () => {
  afterEach(() => {
    rollState.dispose();
  });

  it('shows the zero state of a polyhedral series without deltas', async () => {
    const { getByRole, getByText, metrics, statValue, getAllByTestId } = await renderBreakdown(
      6,
      1,
    );

    expect(getByRole('heading', { name: 'Statistical Breakdown (d6)' })).toBeTruthy();
    expect(getByText('0 dice rolled')).toBeTruthy();
    expect(metrics.dataset.variant).toBe('polyhedral');
    expect(statValue('Std Deviation (σ)')).toContain('0.00');
    expect(within(metrics).getByText('Crit Max (= 6)')).toBeTruthy();
    expect(within(metrics).queryByText(/Δ/)).toBeNull();
    expect(getAllByTestId('dist-row')).toHaveLength(6);
  });

  it('reports rolled polyhedral rounds with signed deltas and z-score', async () => {
    const { getByText, metrics, statValue } = await renderBreakdown(20, 2, [20, 20], [1, 3]);

    expect(getByText('4 dice rolled')).toBeTruthy();
    expect(within(metrics).getByText(/Δ$/)).toBeTruthy();
    expect(within(metrics).getByText(/^\(z: /)).toBeTruthy();
    expect(statValue('Crit Max (= 20)')).toContain('50.0%');
    expect(statValue('Crit Max (= 20)')).toContain('(2/4)');
    expect(statValue('Crit Min (= 1)')).toContain('(1/4)');
    expect(statValue('Std Deviation (σ)')).toContain(
      rollState.summary.analytics.standardDeviation.toFixed(2),
    );
  });

  it('marks a below-expectation average as a negative delta', async () => {
    const { getByText, metrics } = await renderBreakdown(6, 1, [1]);

    expect(getByText('1 die rolled')).toBeTruthy();
    expect(within(metrics).getByText('-2.5 Δ')).toBeTruthy();
  });

  it('switches to the coin grid with share deltas and the round split', async () => {
    const { getByRole, metrics, statValue } = await renderBreakdown(2, 2, [1, 1], [1, 2]);

    expect(getByRole('heading', { name: 'Statistical Breakdown (Coin d2)' })).toBeTruthy();
    expect(metrics.dataset.variant).toBe('coin');
    expect(statValue('Heads Share')).toContain('75.0%');
    expect(within(metrics).getByText('+25.0% vs 50%').classList.contains('positive')).toBe(true);
    expect(within(metrics).getByText('-25.0% vs 50%').classList.contains('negative')).toBe(true);
    expect(statValue('Round Split')).toContain('1H / 0T / 1 Tie');
    expect(statValue('Round Split')).toContain('across 2 rounds');
    expect(statValue('Balance Deviation (z)')).not.toBe('0.00');
  });

  it('marks a tails-heavy coin series with a negative heads delta', async () => {
    const { metrics, statValue } = await renderBreakdown(2, 1, [2]);

    expect(statValue('Heads Share')).toContain('0.0%');
    expect(statValue('Heads Share')).toContain('-50.0% vs 50%');
    expect(within(metrics).getByText('-50.0% vs 50%').classList.contains('negative')).toBe(true);
    expect(within(metrics).getByText('+50.0% vs 50%').classList.contains('positive')).toBe(true);
    expect(statValue('Round Split')).toContain('0H / 1T');
  });

  it('shows an empty coin series without deltas or ties', async () => {
    const { metrics, statValue } = await renderBreakdown(2, 1);

    expect(statValue('Balance Deviation (z)')).toContain('0.00');
    expect(statValue('Round Split')).toContain('0H / 0T');
    expect(statValue('Round Split')).not.toContain('Tie');
    expect(within(metrics).queryByText(/vs 50%/)).toBeNull();
  });

  it('collapses and expands its body', async () => {
    const { getByRole } = await renderBreakdown(6, 1);
    await fireEvent.click(
      getByRole('button', { name: 'Hide Statistical Breakdown & Distribution' }),
    );
    expect(
      getByRole('button', { name: 'Show Statistical Breakdown & Distribution' }).getAttribute(
        'aria-expanded',
      ),
    ).toBe('false');
  });
});
