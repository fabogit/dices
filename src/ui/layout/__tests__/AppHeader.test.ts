import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { render, fireEvent } from '@testing-library/svelte';
import { rollState } from '../../state/rollState.svelte';
import AppHeader from '../AppHeader.svelte';

async function openDialog() {
  const view = render(AppHeader);
  await fireEvent.click(view.getByRole('button', { name: 'Add new local player' }));
  const input = view.getByLabelText('Player Name:') as HTMLInputElement;
  const dialog = view.container.ownerDocument.querySelector('dialog') as HTMLDialogElement;
  return { ...view, input, dialog };
}

describe('AppHeader add-player dialog', () => {
  beforeEach(() => {
    rollState.mode = 'series';
    rollState.isRolling = false;
    rollState.resetCurrentSeries({ announce: false });
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
});
