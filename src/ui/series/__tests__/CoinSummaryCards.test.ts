import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/svelte';
import { computeRoundResult } from '../../../core/round';
import { computeSeriesSummary } from '../../../core/series-analytics';
import type { CoinRollConfig } from '../../../core/types';
import CoinSummaryCards from '../CoinSummaryCards.svelte';

const coinConfig: CoinRollConfig = {
  faces: 2,
  countPerRoll: 1,
  seriesLength: 2,
  playerId: 'p-1',
};

describe('CoinSummaryCards', () => {
  it('renders empty fallback metrics when incomplete and hides winner banner', () => {
    const emptySummary = computeSeriesSummary('c-empty', coinConfig, 'Robin', []);

    const { getByText, queryByRole } = render(CoinSummaryCards, {
      props: { summary: emptySummary, isComplete: false },
    });

    expect(getByText('HEADS')).toBeTruthy();
    expect(getByText('TAILS')).toBeTruthy();
    expect(queryByRole('status')).toBeNull();
  });

  it('renders named winner banner and tie banner when series is complete', async () => {
    const winSummary = computeSeriesSummary('c-win', coinConfig, 'Robin', [
      computeRoundResult(0, [1], 2, 1_700_000_000_000, 'r1'),
      computeRoundResult(1, [1], 2, 1_700_000_001_000, 'r2'),
    ]);

    const { getByRole, getByText, rerender } = render(CoinSummaryCards, {
      props: { summary: winSummary, isComplete: true },
    });

    expect(getByText('100.0%')).toBeTruthy();
    expect(getByText('2 coins')).toBeTruthy();
    expect(getByRole('status').textContent).toContain('🏆 HEADS Wins the Series!');

    const tieSummary = computeSeriesSummary('c-tie', coinConfig, 'Robin', [
      computeRoundResult(0, [1], 2, 1_700_000_000_000, 't1'),
      computeRoundResult(1, [2], 2, 1_700_000_001_000, 't2'),
    ]);

    await rerender({ summary: tieSummary, isComplete: true });
    expect(getByRole('status').textContent).toContain('⚖️ Coin Series Ended in a Tie!');
  });
});
