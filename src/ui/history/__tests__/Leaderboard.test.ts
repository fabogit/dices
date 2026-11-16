import { describe, it, expect } from 'vite-plus/test';
import { render, within } from '@testing-library/svelte';
import type { PlayerLeaderboardEntry } from '../../../core/types';
import Leaderboard from '../Leaderboard.svelte';

describe('Leaderboard', () => {
  it('renders leaderboard entries with hot/cold luck badges and conditional coin metrics', () => {
    const entries: PlayerLeaderboardEntry[] = [
      {
        playerId: 'p-1',
        playerName: 'Robin',
        color: '#38bdf8',
        seriesPlayed: 3,
        totalRolls: 15,
        normalizedLuckScore: 108.5,
        criticalMaxRate: 25.0,
        coinSeriesWon: 2,
        coinHeadsRate: 60.0,
      },
      {
        playerId: 'p-2',
        playerName: 'Alex',
        color: '#34d399',
        seriesPlayed: 1,
        totalRolls: 6,
        normalizedLuckScore: 92.3,
        criticalMaxRate: 10.0,
        coinSeriesWon: 0,
      },
    ];

    const { getByRole } = render(Leaderboard, {
      props: { entries },
    });

    expect(getByRole('heading', { name: 'Player Leaderboard & Luck Index' })).toBeTruthy();

    const list = getByRole('list', { name: 'Player leaderboard' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const robinItem = within(items[0]);
    expect(robinItem.getByText('Robin')).toBeTruthy();
    expect(robinItem.getByRole('img', { name: /Luck Index: 108\.5%/ })).toBeTruthy();
    expect(robinItem.getByText(/🔥/)).toBeTruthy();
    expect(robinItem.getByText('25.0%')).toBeTruthy();
    expect(robinItem.getByText('Coins Won')).toBeTruthy();
    expect(robinItem.getByText('2')).toBeTruthy();
    expect(robinItem.getByText('Heads Rate')).toBeTruthy();
    expect(robinItem.getByText('60.0%')).toBeTruthy();

    const alexItem = within(items[1]);
    expect(alexItem.getByText('Alex')).toBeTruthy();
    expect(alexItem.getByRole('img', { name: /Luck Index: 92\.3%/ })).toBeTruthy();
    expect(alexItem.getByText(/❄️/)).toBeTruthy();
    expect(alexItem.queryByText('Coins Won')).toBeNull();
    expect(alexItem.queryByText('Heads Rate')).toBeNull();
  });
});
