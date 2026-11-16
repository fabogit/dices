import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/svelte';
import { computeRoundResult, computeSeriesAnalytics } from '../../../core/engine';
import DistributionChart from '../DistributionChart.svelte';

describe('DistributionChart', () => {
  it('renders hot faces for dice (>2) and omits hot badges for coins (=2)', async () => {
    const diceAnalytics = computeSeriesAnalytics(
      { faces: 6, countPerRoll: 2, seriesLength: 2, playerId: 'p-1' },
      [
        computeRoundResult(0, [6, 6], 6, 1_700_000_000_000, 'dc-1'),
        computeRoundResult(1, [6, 1], 6, 1_700_000_001_000, 'dc-2'),
      ],
    );

    const { getByRole, getByText, queryByText, rerender } = render(DistributionChart, {
      props: {
        distribution: diceAnalytics.distribution,
        faces: 6,
      },
    });

    expect(getByText('Empirical vs Expected Distribution')).toBeTruthy();
    expect(getByText('Expected: 16.7%')).toBeTruthy();
    expect(getByRole('group', { name: 'Face frequency distribution bars' })).toBeTruthy();
    expect(getByRole('img', { name: /Face d6 \(6\): 3 rolls|Face 6: 3 rolls/ })).toBeTruthy();
    expect(getByText('🔥')).toBeTruthy();

    // Coin series hides hot badge even for highest-count side
    const coinAnalytics = computeSeriesAnalytics(
      { faces: 2, countPerRoll: 1, seriesLength: 2, playerId: 'p-1' },
      [
        computeRoundResult(0, [1], 2, 1_700_000_000_000, 'cc-1'),
        computeRoundResult(1, [1], 2, 1_700_000_001_000, 'cc-2'),
      ],
    );

    await rerender({
      distribution: coinAnalytics.distribution,
      faces: 2,
    });

    expect(getByText('Expected: 50.0%')).toBeTruthy();
    expect(queryByText('🔥')).toBeNull();
    expect(
      getByRole('img', { name: /Face HEADS: 2 rolls, 100\.0% \(expected 50\.0%\)/ }),
    ).toBeTruthy();

    // Empty distribution fallback
    await rerender({
      distribution: [],
      faces: 6,
    });
    expect(getByText('Expected: %')).toBeTruthy();
  });
});
