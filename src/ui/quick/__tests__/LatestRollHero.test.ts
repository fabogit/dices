import { describe, it, expect } from 'vite-plus/test';
import { render, within } from '@testing-library/svelte';
import { computeQuickRollStats, computeRoundResult } from '../../../core/engine';
import LatestRollHero from '../LatestRollHero.svelte';

describe('LatestRollHero', () => {
  it('renders coin hero for tie and winner results with split bar and insight', async () => {
    const tieRoll = computeRoundResult(0, [1, 2], 2, 1_700_000_000_000, 'q-tie');
    const tieStats = computeQuickRollStats(tieRoll);

    const { getByRole, getByText, rerender } = render(LatestRollHero, {
      props: { stats: tieStats },
    });

    const region = getByRole('region', { name: 'Latest Quick Roll Result' });
    expect(region.textContent).toContain('Coin d2');
    expect(region.textContent).toContain('× 2');
    expect(getByText(/Tied Result/)).toBeTruthy();
    expect(getByText('HEADS')).toBeTruthy();
    expect(getByText('TAILS')).toBeTruthy();
    expect(getByRole('img', { name: 'Split: 50% Heads, 50% Tails' })).toBeTruthy();
    expect(getByText(tieStats.insight)).toBeTruthy();

    const headsWinRoll = computeRoundResult(1, [1, 1], 2, 1_700_000_005_000, 'q-win');
    const headsWinStats = computeQuickRollStats(headsWinRoll);
    await rerender({ stats: headsWinStats });

    expect(getByText(/HEADS Wins/)).toBeTruthy();
    expect(getByRole('img', { name: 'Split: 100% Heads, 0% Tails' })).toBeTruthy();
  });

  it('renders polyhedral dice hero with conditional high/low, criticals, and delta tone', async () => {
    const multiRoll = computeRoundResult(0, [6, 1], 6, 1_700_000_000_000, 'q-multi');
    const multiStats = computeQuickRollStats(multiRoll);

    const { getByRole, getByText, queryByText, rerender } = render(LatestRollHero, {
      props: { stats: multiStats },
    });

    const region = within(getByRole('region', { name: 'Latest Quick Roll Result' }));
    expect(region.getByText('TOTAL SUM')).toBeTruthy();
    expect(region.getByText('7')).toBeTruthy();
    expect(region.getAllByText('6')).toHaveLength(2);
    expect(region.getAllByText('1')).toHaveLength(2);
    expect(getByText(/High:/)).toBeTruthy();
    expect(getByText(/Low:/)).toBeTruthy();
    expect(getByText('1x crit (6)')).toBeTruthy();
    expect(getByText('1x nat 1')).toBeTruthy();
    expect(getByText(multiStats.insight)).toBeTruthy();

    // Single roll omits High/Low and shows negative delta when below expected (3.5)
    const singleLowRoll = computeRoundResult(1, [2], 6, 1_700_000_005_000, 'q-single');
    const singleLowStats = computeQuickRollStats(singleLowRoll);
    await rerender({ stats: singleLowStats });

    expect(queryByText(/High:/)).toBeNull();
    expect(queryByText(/Low:/)).toBeNull();
    expect(queryByText(/\dx crit/)).toBeNull();
    expect(queryByText(/\dx nat 1/)).toBeNull();
    expect(getByText('-1.5')).toBeTruthy();
  });
});
