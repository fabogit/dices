import { describe, it, expect, vi } from 'vite-plus/test';
import { render, fireEvent } from '@testing-library/svelte';
import { MAX_PLAYER_NAME_LENGTH } from '../../../core/persistence';
import AddPlayerDialog from '../AddPlayerDialog.svelte';

function createCallbacks() {
  return {
    onNameInput: vi.fn<(name: string) => void>(),
    onSubmit: vi.fn<(name: string) => void>(),
    onClose: vi.fn<() => void>(),
  };
}

function renderDialog(props: { open: boolean; name: string; error?: string }) {
  const callbacks = createCallbacks();
  const view = render(AddPlayerDialog, { props: { ...props, ...callbacks } });
  const dialog = view.container.ownerDocument.querySelector('dialog') as HTMLDialogElement;
  const input = view.getByLabelText('Player Name:') as HTMLInputElement;
  return { ...view, ...callbacks, dialog, input };
}

describe('AddPlayerDialog', () => {
  it('opens a labelled modal with a controlled, length-capped name field', async () => {
    const { dialog, input, getByRole, rerender, onNameInput } = renderDialog({
      open: true,
      name: 'Robin',
    });

    expect(dialog.open).toBe(true);
    expect(getByRole('dialog', { name: 'Add Local Player' })).toBe(dialog);
    expect(input.value).toBe('Robin');
    expect(input.maxLength).toBe(MAX_PLAYER_NAME_LENGTH);
    expect(input.placeholder).toBe('e.g. Robin');

    await fireEvent.input(input, { target: { value: 'Robin Hood' } });
    expect(onNameInput).toHaveBeenCalledWith('Robin Hood');

    // The parent owns the value: a reset flows back into the field
    await rerender({ name: '' });
    expect(input.value).toBe('');
  });

  it('submits the current name without reloading the page', async () => {
    const { getByRole, onSubmit } = renderDialog({ open: true, name: 'Zed' });
    const submit = new Event('submit', { bubbles: true, cancelable: true });

    await fireEvent(
      getByRole('button', { name: 'Add Player' }).closest('form') as HTMLFormElement,
      submit,
    );
    expect(submit.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith('Zed');
  });

  it('links the validation message to the field only while there is an error', async () => {
    const { input, getByRole, queryByRole, rerender } = renderDialog({
      open: true,
      name: 'dupe',
      error: 'A player with this name already exists.',
    });

    const alert = getByRole('alert');
    expect(alert.textContent).toBe('A player with this name already exists.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);

    await rerender({ error: undefined });
    expect(queryByRole('alert')).toBeNull();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('asks the parent to close on Cancel and follows the open prop', async () => {
    const { dialog, getByRole, rerender, onClose } = renderDialog({ open: true, name: '' });

    await fireEvent.click(getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();

    await rerender({ open: false });
    expect(dialog.open).toBe(false);
  });
});
