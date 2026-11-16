import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { RollState } from '../../state/rollState.svelte';
import {
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import AppHeader from '../AppHeader.svelte';

let rollState: RollState;

async function openDialog() {
  const view = renderWithRollState(AppHeader, rollState);
  await fireEvent.click(view.getByRole('button', { name: 'Add new local player' }));
  const input = view.getByLabelText('Player Name:') as HTMLInputElement;
  const dialog = view.container.ownerDocument.querySelector('dialog') as HTMLDialogElement;
  return { ...view, input, dialog };
}

describe('AppHeader add-player dialog', () => {
  beforeEach(() => {
    rollState = createTestRollState({ provider: createScriptedProvider() });
  });

  afterEach(() => {
    rollState.dispose();
  });

  it('closes on success and adds the player', async () => {
    const { input, dialog, getByRole } = await openDialog();
    await fireEvent.input(input, { target: { value: 'Zed Unique' } });
    await fireEvent.click(getByRole('button', { name: 'Add Player' }));
    expect(rollState.players.some((p) => p.name === 'Zed Unique')).toBe(true);
    expect(dialog.open).toBe(false);
  });

  it('keeps the dialog open with an accessible error on duplicate, clears it on edit', async () => {
    rollState.addPlayer('Dupe Name');
    const count = rollState.players.length;
    const { input, dialog, getByRole, queryByRole } = await openDialog();
    await fireEvent.input(input, { target: { value: '  dupe name ' } });
    await fireEvent.click(getByRole('button', { name: 'Add Player' }));

    expect(rollState.players).toHaveLength(count);
    expect(dialog.open).toBe(true);
    const alert = getByRole('alert');
    expect(alert.textContent).toBe('A player with this name already exists.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);

    await fireEvent.input(input, { target: { value: 'dupe name 2' } });
    expect(queryByRole('alert')).toBeNull();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('shows an error for a blank name and clears it when reopened', async () => {
    const { input, dialog, getByRole, queryByRole } = await openDialog();
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.click(getByRole('button', { name: 'Add Player' }));
    expect(dialog.open).toBe(true);
    expect(getByRole('alert').textContent).toBe('Enter a name.');

    await fireEvent.click(getByRole('button', { name: 'Cancel' }));
    expect(dialog.open).toBe(false);
    await fireEvent.click(getByRole('button', { name: 'Add new local player' }));
    expect(queryByRole('alert')).toBeNull();
  });

  it('reports a locked roster when a roll starts while the dialog is open', async () => {
    const { input, dialog, getByRole } = await openDialog();
    rollState.isRolling = true;
    await fireEvent.input(input, { target: { value: 'Late Comer' } });
    await fireEvent.click(getByRole('button', { name: 'Add Player' }));

    expect(dialog.open).toBe(true);
    expect(getByRole('alert').textContent).toBe(
      "Players can't be added while a roll or series is in progress.",
    );
    expect(rollState.players).toHaveLength(1);
  });
});

describe('AppHeader controls', () => {
  beforeEach(() => {
    rollState = createTestRollState({ provider: createScriptedProvider([4]) });
  });

  afterEach(() => {
    rollState.dispose();
  });

  it('switches mode through the store and shows the player selector only in Series mode', async () => {
    const { getByRole, queryByRole } = renderWithRollState(AppHeader, rollState);
    const quick = getByRole('button', { name: /Quick Roll/ });
    const series = getByRole('button', { name: /Series/ });
    expect(series.getAttribute('aria-pressed')).toBe('true');
    expect(getByRole('combobox', { name: 'Player:' })).toBeTruthy();

    await fireEvent.click(quick);
    expect(rollState.mode).toBe('quick');
    expect(quick.getAttribute('aria-pressed')).toBe('true');
    expect(series.getAttribute('aria-pressed')).toBe('false');
    expect(queryByRole('combobox', { name: 'Player:' })).toBeNull();
    expect(queryByRole('button', { name: 'Add new local player' })).toBeNull();

    await fireEvent.click(series);
    expect(rollState.mode).toBe('series');
  });

  it('disables the mode switch while dice are rolling or auto-rolling', async () => {
    const { getByRole } = renderWithRollState(AppHeader, rollState);
    rollState.isRolling = true;
    await tick();
    expect(getByRole('button', { name: /Quick Roll/ }).hasAttribute('disabled')).toBe(true);

    rollState.isRolling = false;
    rollState.isAutoRolling = true;
    await tick();
    expect(getByRole('button', { name: /Series/ }).hasAttribute('disabled')).toBe(true);
  });

  it('lists the players and selects the active one through the store', async () => {
    rollState.addPlayer('Alice');
    const { getByRole } = renderWithRollState(AppHeader, rollState);
    const select = getByRole('combobox', { name: 'Player:' }) as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['Player 1', 'Alice']);
    expect(select.value).toBe(rollState.activePlayerId);

    await fireEvent.change(select, { target: { value: 'player-1' } });
    expect(rollState.activePlayerId).toBe('player-1');
    expect(rollState.activePlayer.name).toBe('Player 1');
  });

  it('locks the player controls while a series is in progress', async () => {
    const { getByRole } = renderWithRollState(AppHeader, rollState);
    await rollState.rollNextRound();
    await tick();

    expect(getByRole('combobox', { name: 'Player:' }).hasAttribute('disabled')).toBe(true);
    expect(getByRole('button', { name: 'Add new local player' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('toggles the instant roll mode through the store', async () => {
    rollState.instantMode = false;
    const { getByRole } = renderWithRollState(AppHeader, rollState);
    const toggle = getByRole('button', { name: /Fast: OFF/ });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(toggle);
    expect(rollState.instantMode).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toContain('Fast: ON');
  });
});
