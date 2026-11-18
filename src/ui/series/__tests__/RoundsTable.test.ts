import { describe, it, expect } from 'vite-plus/test';
import { render, within } from '@testing-library/svelte';
import { computeRoundResult } from '../../../core/round';
import RoundsTable from '../RoundsTable.svelte';

describe('RoundsTable', () => {
  it('renders empty state and switches headers/cells between coin and polyhedral dice', async () => {
    const { getByRole, getByText, rerender } = render(RoundsTable, {
      props: {
        rounds: [],
        faces: 6,
        playerName: 'Robin',
      },
    });

    const table = getByRole('table', { name: 'Round results for active series (Robin)' });
    expect(table).toBeTruthy();
    expect(getByText('No rounds rolled yet. Press "Roll Round" to begin.')).toBeTruthy();
    expect(getByRole('columnheader', { name: 'Dice Values' })).toBeTruthy();
    expect(getByRole('columnheader', { name: 'Sum' })).toBeTruthy();
    expect(getByRole('columnheader', { name: 'Max / Min' })).toBeTruthy();

    const diceRounds = [computeRoundResult(0, [2, 5], 6, 1_700_000_000_000, 'rt-d1')];
    await rerender({ rounds: diceRounds, faces: 6, playerName: 'Robin' });

    const diceRow = within(getByRole('row', { name: /#1/ }));
    expect(diceRow.getByText('2, 5')).toBeTruthy();
    expect(diceRow.getByText('7')).toBeTruthy();
    expect(diceRow.getByText('▲5 ▼2')).toBeTruthy();

    const coinRounds = [
      computeRoundResult(0, [1, 2], 2, 1_700_000_000_000, 'rt-c1'),
      computeRoundResult(1, [1, 1], 2, 1_700_000_001_000, 'rt-c2'),
    ];
    await rerender({ rounds: coinRounds, faces: 2, playerName: 'Sam' });

    expect(getByRole('columnheader', { name: 'Coins' })).toBeTruthy();
    expect(getByRole('columnheader', { name: 'Winner' })).toBeTruthy();
    expect(getByRole('columnheader', { name: 'Score' })).toBeTruthy();

    const tieRow = within(getByRole('row', { name: /#1/ }));
    expect(tieRow.getByText('TIE')).toBeTruthy();
    expect(tieRow.getByText('1H / 1T')).toBeTruthy();

    const winRow = within(getByRole('row', { name: /#2/ }));
    expect(winRow.getByText('HEADS')).toBeTruthy();
    expect(winRow.getByText('2H / 0T')).toBeTruthy();
  });
});
