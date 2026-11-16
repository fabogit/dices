import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/svelte';
import { computeRoundResult, computeSeriesSummary } from '../../../core/engine';
import type { RollConfig, SeriesSummary } from '../../../core/types';
import HistoryList from '../HistoryList.svelte';

function makeSummary(
  id: string,
  playerName: string,
  config: RollConfig,
  rawRounds: number[][],
): SeriesSummary {
  const rounds = rawRounds.map((values, idx) =>
    computeRoundResult(idx, values, config.faces, 1_700_000_000_000 + idx * 1000, `${id}-r${idx}`),
  );
  return computeSeriesSummary(id, config, playerName, rounds, 1_700_000_010_000);
}

describe('HistoryList', () => {
  it('renders dice summaries, named coin winners, coin ties, and singular/plural labels', () => {
    const diceSummary = makeSummary(
      's-dice',
      'Robin',
      { faces: 6, countPerRoll: 2, seriesLength: 2, playerId: 'p-1' },
      [
        [1, 2],
        [6, 5],
      ],
    );

    const coinWinSummary = makeSummary(
      's-coin-win',
      'Sam',
      { faces: 2, countPerRoll: 1, seriesLength: 1, playerId: 'p-2' },
      [[1]],
    );

    const coinTieSummary = makeSummary(
      's-coin-tie',
      'Alex',
      { faces: 2, countPerRoll: 1, seriesLength: 2, playerId: 'p-3' },
      [[1], [2]],
    );

    const { getByRole } = render(HistoryList, {
      props: {
        items: [diceSummary, coinWinSummary, coinTieSummary],
      },
    });

    expect(getByRole('heading', { name: 'Past Completed Series' })).toBeTruthy();

    const region = getByRole('region', { name: 'Scrollable list of past series' });
    expect(region.getAttribute('tabindex')).toBe('0');

    const list = within(region).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    // Dice series (2 dice, 2 rounds)
    const diceScope = within(items[0]);
    expect(diceScope.getByText('Robin')).toBeTruthy();
    expect(diceScope.getByText('d6')).toBeTruthy();
    expect(diceScope.getByText('× 2 dice')).toBeTruthy();
    expect(diceScope.getByText('(2 rounds)')).toBeTruthy();
    expect(diceScope.getByText('14')).toBeTruthy();
    expect(diceScope.getByText('7.0')).toBeTruthy();
    expect(diceScope.getByText('#2')).toBeTruthy();

    // Coin series won by HEADS (1 die, 1 round)
    const coinWinScope = within(items[1]);
    expect(coinWinScope.getByText('Sam')).toBeTruthy();
    expect(coinWinScope.getByText('Coin d2')).toBeTruthy();
    expect(coinWinScope.getByText('× 1 die')).toBeTruthy();
    expect(coinWinScope.getByText('(1 round)')).toBeTruthy();
    expect(coinWinScope.getByText('HEADS')).toBeTruthy();
    expect(coinWinScope.getByText(/100\.0% Heads \/ 0\.0% Tails/)).toBeTruthy();

    // Coin series ending in Tie
    const coinTieScope = within(items[2]);
    expect(coinTieScope.getByText('Tie')).toBeTruthy();
    expect(coinTieScope.getByText(/50\.0% Heads \/ 50\.0% Tails/)).toBeTruthy();
  });
});
