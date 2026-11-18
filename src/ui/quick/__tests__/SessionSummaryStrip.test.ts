import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/svelte';
import { computeQuickRollSessionStats } from '../../../core/quick-stats';
import { computeRoundResult } from '../../../core/round';
import SessionSummaryStrip from '../SessionSummaryStrip.svelte';

describe('SessionSummaryStrip', () => {
  it('renders coin session metrics and balance verdict', () => {
    const rolls = [
      computeRoundResult(0, [1, 1], 2, 1_700_000_000_000, 'c1'),
      computeRoundResult(1, [1, 2], 2, 1_700_000_001_000, 'c2'),
    ];
    const sessionStats = computeQuickRollSessionStats(rolls, 2);
    if (sessionStats.kind !== 'coin') throw new Error('Expected coin quick roll session stats');

    const { getByRole, getByText } = render(SessionSummaryStrip, {
      props: { sessionStats },
    });

    expect(getByRole('group', { name: 'Session summary for active die' })).toBeTruthy();
    expect(getByText('Session Summary (Coin d2)')).toBeTruthy();
    expect(getByText(/2 throws • 4 coins/)).toBeTruthy();
    expect(getByText('75.0% Heads (3)')).toBeTruthy();
    expect(getByText('25.0% Tails (1)')).toBeTruthy();
    expect(sessionStats.balanceVerdict).toBeTruthy();
    expect(getByText(sessionStats.balanceVerdict)).toBeTruthy();
    expect(getByText(sessionStats.insight)).toBeTruthy();
  });

  it('renders polyhedral session average, delta tone, and optional critical counters', async () => {
    const rollsWithCrits = [
      computeRoundResult(0, [6], 6, 1_700_000_000_000, 'd1'),
      computeRoundResult(1, [1], 6, 1_700_000_001_000, 'd2'),
    ];
    const statsWithCrits = computeQuickRollSessionStats(rollsWithCrits, 6);
    if (statsWithCrits.kind !== 'dice') throw new Error('Expected dice quick roll session stats');

    const { getByText, queryByText, rerender } = render(SessionSummaryStrip, {
      props: { sessionStats: statsWithCrits },
    });

    expect(getByText('Session Summary (d6)')).toBeTruthy();
    expect(getByText(/2 throws • 2 dice/)).toBeTruthy();
    expect(getByText('Die Avg: 3.50')).toBeTruthy();
    expect(getByText('+0.00 Δ')).toBeTruthy();
    expect(getByText('1x crit (6)')).toBeTruthy();
    expect(getByText('1x nat 1')).toBeTruthy();

    // Without criticals and negative average delta
    const midRolls = [
      computeRoundResult(0, [2], 6, 1_700_000_002_000, 'd3'),
      computeRoundResult(1, [3], 6, 1_700_000_003_000, 'd4'),
    ];
    const midStats = computeQuickRollSessionStats(midRolls, 6);
    if (midStats.kind !== 'dice') throw new Error('Expected dice quick roll session stats');
    await rerender({ sessionStats: midStats });

    expect(getByText('Die Avg: 2.50')).toBeTruthy();
    expect(getByText('-1.00 Δ')).toBeTruthy();
    expect(queryByText(/\dx crit/)).toBeNull();
    expect(queryByText(/\dx nat 1/)).toBeNull();
  });
});
