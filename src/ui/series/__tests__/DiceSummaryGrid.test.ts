import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/svelte';
import { computeRoundResult, computeSeriesSummary } from '../../../core/engine';
import type { RollConfig } from '../../../core/types';
import DiceSummaryGrid from '../DiceSummaryGrid.svelte';

const diceConfig: RollConfig = {
  faces: 6,
  countPerRoll: 2,
  seriesLength: 3,
  playerId: 'p-1',
};

describe('DiceSummaryGrid', () => {
  it('renders zeroed placeholders when no rounds have been rolled', () => {
    const emptySummary = computeSeriesSummary('d-empty', diceConfig, 'Robin', []);

    const { getByText, getAllByText } = render(DiceSummaryGrid, {
      props: { summary: emptySummary, rounds: [] },
    });

    expect(getByText('Total Sum (∑)')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
    expect(getByText('0.0')).toBeTruthy();
    expect(getAllByText('—')).toHaveLength(3);
  });

  it('renders aggregate metrics for unique mode and tied mode', async () => {
    const uniqueRounds = [
      computeRoundResult(0, [1, 2], 6, 1_700_000_000_000, 'u1'),
      computeRoundResult(1, [6, 6], 6, 1_700_000_001_000, 'u2'),
    ];
    const uniqueSummary = computeSeriesSummary('d-uniq', diceConfig, 'Robin', uniqueRounds);

    const { getByText, queryByText, rerender } = render(DiceSummaryGrid, {
      props: { summary: uniqueSummary, rounds: uniqueRounds },
    });

    expect(getByText('15')).toBeTruthy();
    expect(getByText('7.5')).toBeTruthy();
    expect(getByText('#2 (12)')).toBeTruthy();
    expect(getByText('#1 (3)')).toBeTruthy();
    expect(getByText('(2x)')).toBeTruthy();
    expect(queryByText('(Tie)')).toBeNull();

    const tiedRounds = [
      computeRoundResult(0, [2, 5], 6, 1_700_000_000_000, 't1'),
      computeRoundResult(1, [2, 5], 6, 1_700_000_001_000, 't2'),
    ];
    const tiedSummary = computeSeriesSummary('d-tie', diceConfig, 'Robin', tiedRounds);
    await rerender({ summary: tiedSummary, rounds: tiedRounds });

    expect(getByText('2, 5')).toBeTruthy();
    expect(getByText('(Tie)')).toBeTruthy();
  });
});
