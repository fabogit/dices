import { describe, it, expect, vi } from 'vite-plus/test';
import { render, fireEvent, within } from '@testing-library/svelte';
import type { Player } from '../../../core/types';
import PlayerSelector from '../PlayerSelector.svelte';

const playerOne: Player = { id: 'player-1', name: 'Player 1', color: '#38bdf8' };
const alice: Player = { id: 'player-2', name: 'Alice', color: '#f59e0b' };
const players: Player[] = [playerOne, alice];

function createCallbacks() {
  return {
    onSelect: vi.fn<(playerId: string) => void>(),
    onAddPlayer: vi.fn<() => void>(),
  };
}

describe('PlayerSelector', () => {
  it('lists the players, selects the active one and reports changes', async () => {
    const callbacks = createCallbacks();
    const { getByRole } = render(PlayerSelector, {
      props: { players, activePlayerId: 'player-2', disabled: false, ...callbacks },
    });

    const select = getByRole('combobox', { name: 'Player:' }) as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['Player 1', 'Alice']);
    expect(select.value).toBe('player-2');

    await fireEvent.change(select, { target: { value: 'player-1' } });
    expect(callbacks.onSelect).toHaveBeenCalledWith('player-1');

    await fireEvent.click(getByRole('button', { name: 'Add new local player' }));
    expect(callbacks.onAddPlayer).toHaveBeenCalledOnce();
  });

  it('updates option labels in place and follows a new active player', async () => {
    const callbacks = createCallbacks();
    const { getByRole, rerender } = render(PlayerSelector, {
      props: { players, activePlayerId: 'player-1', disabled: false, ...callbacks },
    });
    const select = getByRole('combobox', { name: 'Player:' }) as HTMLSelectElement;
    const [firstOption] = select.options;

    const renamed: Player[] = [{ ...playerOne, name: 'Robin' }, alice];
    await rerender({ players: renamed, activePlayerId: 'player-2' });

    expect(select.options[0]).toBe(firstOption);
    expect([...select.options].map((o) => o.textContent)).toEqual(['Robin', 'Alice']);
    expect(select.options[0]?.value).toBe('player-1');
    expect(select.value).toBe('player-2');
  });

  it('disables the select and the add button together', () => {
    const { getByRole } = render(PlayerSelector, {
      props: { players, activePlayerId: 'player-1', disabled: true, ...createCallbacks() },
    });

    expect(getByRole('combobox', { name: 'Player:' }).hasAttribute('disabled')).toBe(true);
    expect(getByRole('button', { name: 'Add new local player' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('gives each instance its own label-to-select association', () => {
    const first = render(PlayerSelector, {
      props: { players, activePlayerId: 'player-1', disabled: false, ...createCallbacks() },
    });
    const second = render(PlayerSelector, {
      props: { players, activePlayerId: 'player-2', disabled: false, ...createCallbacks() },
    });

    const firstSelect = within(first.container).getByRole<HTMLSelectElement>('combobox', {
      name: 'Player:',
    });
    const secondSelect = within(second.container).getByRole<HTMLSelectElement>('combobox', {
      name: 'Player:',
    });
    expect(firstSelect.id).not.toBe(secondSelect.id);
    expect(firstSelect.value).toBe('player-1');
    expect(secondSelect.value).toBe('player-2');
  });
});
