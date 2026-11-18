import { describe, it, expect } from 'vite-plus/test';
import { render, within } from '@testing-library/svelte';
import { computeRoundResult } from '../../../core/round';
import { computeSeriesSummary } from '../../../core/series-analytics';
import type { DiceRollConfig, DiceSeriesAnalytics, PolyhedralFaces } from '../../../core/types';
import DiceAnalyticsGrid from '../DiceAnalyticsGrid.svelte';

/** Polyhedral analytics for rounds of `faces`-sided dice. */
function diceAnalytics(faces: PolyhedralFaces, ...rounds: number[][]): DiceSeriesAnalytics {
  const config: DiceRollConfig = {
    faces,
    countPerRoll: rounds[0]?.length ?? 1,
    seriesLength: 3,
    playerId: 'p-1',
  };
  const results = rounds.map((values, i) =>
    computeRoundResult(i, values, faces, 1_700_000_000_000 + i, `d${i}`),
  );
  return computeSeriesSummary('d-series', config, 'Robin', results).analytics;
}

function renderGrid(analytics: DiceSeriesAnalytics, faces: PolyhedralFaces, roundsCount: number) {
  const view = render(DiceAnalyticsGrid, { props: { analytics, faces, roundsCount } });
  const grid = view.getByTestId('analytics-metrics');
  /** The value row of the StatBox labelled `label`. */
  const statValue = (label: string): string =>
    within(grid).getByText(label).nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim() ??
    '';
  return { ...view, grid, statValue };
}

describe('DiceAnalyticsGrid', () => {
  it('renders the zero state without the average delta or z-score', () => {
    const { grid, statValue } = renderGrid(diceAnalytics(6), 6, 0);

    expect(grid.dataset.variant).toBe('polyhedral');
    expect(statValue('Expected Avg (E[X])')).toBe('3.5');
    expect(within(grid).queryByText(/Δ/)).toBeNull();
    expect(within(grid).queryByText(/^\(z: /)).toBeNull();
    expect(statValue('Std Deviation (σ)')).toBe('0.00 across round sums (σ)');
    expect(statValue('Crit Max (= 6)')).toBe('0.0% (0/0)');
    expect(statValue('Crit Min (= 1)')).toBe('0.0% (0/0)');
  });

  it('shows a positive average delta, z-score, σ and critical rates once rounds exist', () => {
    const analytics = diceAnalytics(20, [20, 20], [1, 3]);
    const { grid, statValue } = renderGrid(analytics, 20, 2);

    const delta = within(grid).getByText(/Δ$/);
    expect(delta.textContent?.trim()).toBe(`+${analytics.averageDelta.toFixed(1)} Δ`);
    expect(delta.classList.contains('positive')).toBe(true);
    expect(
      within(grid)
        .getByText(/^\(z: /)
        .textContent?.trim(),
    ).toBe(`(z: +${analytics.zScore.toFixed(2)})`);
    expect(statValue('Std Deviation (σ)')).toContain(analytics.standardDeviation.toFixed(2));
    expect(statValue('Crit Max (= 20)')).toBe('50.0% (2/4)');
    expect(statValue('Crit Min (= 1)')).toBe('25.0% (1/4)');
  });

  it('marks a below-expectation average as a negative delta', () => {
    const { grid } = renderGrid(diceAnalytics(6, [1]), 6, 1);

    expect(within(grid).getByText('-2.5 Δ').classList.contains('negative')).toBe(true);
    expect(within(grid).getByText('(z: -1.46)')).toBeTruthy();
  });
});
