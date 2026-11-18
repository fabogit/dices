import { describe, it, expect } from 'vite-plus/test';
import { render, within } from '@testing-library/svelte';
import { computeRoundResult } from '../../../core/round';
import { computeSeriesSummary } from '../../../core/series-analytics';
import type { CoinRollConfig, CoinSeriesAnalytics } from '../../../core/types';
import CoinAnalyticsGrid from '../CoinAnalyticsGrid.svelte';

const coinConfig: CoinRollConfig = {
  faces: 2,
  countPerRoll: 2,
  seriesLength: 3,
  playerId: 'p-1',
};

/** Coin analytics for rounds of tosses (1 = Heads, 2 = Tails). */
function coinAnalytics(...rounds: number[][]): CoinSeriesAnalytics {
  const results = rounds.map((values, i) =>
    computeRoundResult(i, values, 2, 1_700_000_000_000 + i, `c${i}`),
  );
  return computeSeriesSummary('c-series', coinConfig, 'Robin', results).analytics;
}

function renderGrid(analytics: CoinSeriesAnalytics, roundsCount: number) {
  const view = render(CoinAnalyticsGrid, { props: { analytics, roundsCount } });
  const grid = view.getByTestId('analytics-metrics');
  /** The value row of the StatBox labelled `label`. */
  const statValue = (label: string): string =>
    within(grid).getByText(label).nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim() ??
    '';
  return { ...view, grid, statValue };
}

describe('CoinAnalyticsGrid', () => {
  it('renders the empty series without share deltas, z-score or ties', () => {
    const { grid, statValue } = renderGrid(coinAnalytics(), 0);

    expect(grid.dataset.variant).toBe('coin');
    expect(grid.classList.contains('coin-analytics-grid')).toBe(true);
    expect(statValue('Heads Share')).toBe('0.0%');
    expect(statValue('Tails Share')).toBe('0.0%');
    expect(within(grid).queryByText(/vs 50%/)).toBeNull();
    expect(statValue('Balance Deviation (z)')).toContain('0.00');
    expect(statValue('Round Split')).toBe('0H / 0T across 0 rounds');
  });

  it('shows signed share deltas with their tone and the round split with ties', () => {
    const analytics = coinAnalytics([1, 1], [1, 2]);
    const { grid, statValue } = renderGrid(analytics, 2);

    expect(statValue('Heads Share')).toContain('75.0%');
    expect(statValue('Tails Share')).toContain('25.0%');
    expect(within(grid).getByText('+25.0% vs 50%').classList.contains('positive')).toBe(true);
    expect(within(grid).getByText('-25.0% vs 50%').classList.contains('negative')).toBe(true);
    expect(statValue('Balance Deviation (z)')).toContain(`+${analytics.zScore.toFixed(2)}`);
    expect(statValue('Balance Deviation (z)')).toContain(analytics.coinStats.zQualitative);
    expect(statValue('Round Split')).toBe('1H / 0T / 1 Tie across 2 rounds');
  });

  it('marks a tails-heavy series with a negative heads delta', () => {
    const { grid, statValue } = renderGrid(coinAnalytics([2, 2]), 1);

    expect(within(grid).getByText('-50.0% vs 50%').classList.contains('negative')).toBe(true);
    expect(within(grid).getByText('+50.0% vs 50%').classList.contains('positive')).toBe(true);
    expect(statValue('Round Split')).toBe('0H / 1T across 1 rounds');
  });
});
