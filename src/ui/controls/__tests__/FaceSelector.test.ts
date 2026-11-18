import { describe, it, expect, vi } from 'vite-plus/test';
import type { ComponentProps } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import type { DieFaces } from '../../../core/types';
import FaceSelector from '../FaceSelector.svelte';

describe('FaceSelector', () => {
  it('renders all 7 instruments with roving tabindex matching selectedFaces', () => {
    const onSelect = vi.fn<(faces: DieFaces) => void>();
    const { getByRole } = render(FaceSelector, {
      props: {
        selectedFaces: 6,
        disabled: false,
        onSelect,
      },
    });

    const group = getByRole('radiogroup', { name: 'Die face selector' });
    expect(group).toBeTruthy();

    const coinRadio = getByRole('radio', { name: 'Coin (d2)' });
    const d6Radio = getByRole('radio', { name: 'd6' });
    const d20Radio = getByRole('radio', { name: 'd20' });

    expect(d6Radio.getAttribute('aria-checked')).toBe('true');
    expect(d6Radio.getAttribute('tabindex')).toBe('0');
    expect(coinRadio.getAttribute('aria-checked')).toBe('false');
    expect(coinRadio.getAttribute('tabindex')).toBe('-1');
    expect(d20Radio.getAttribute('tabindex')).toBe('-1');
  });

  it('calls onSelect on click and supports Arrow, Home, and End navigation with wrap-around', async () => {
    const onSelect = vi.fn<(faces: DieFaces) => void>();
    const { getByRole, rerender } = render(FaceSelector, {
      props: {
        selectedFaces: 6,
        disabled: false,
        onSelect,
      },
    });

    const d4Radio = getByRole('radio', { name: 'd4' });
    const d6Radio = getByRole('radio', { name: 'd6' });
    const d8Radio = getByRole('radio', { name: 'd8' });
    const d10Radio = getByRole('radio', { name: 'd10' });
    const coinRadio = getByRole('radio', { name: 'Coin (d2)' });
    const d20Radio = getByRole('radio', { name: 'd20' });

    await fireEvent.click(d4Radio);
    expect(onSelect).toHaveBeenCalledWith(4);
    await rerender({ selectedFaces: 4, disabled: false, onSelect });

    d4Radio.focus();
    await fireEvent.keyDown(d4Radio, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenLastCalledWith(6);
    expect(document.activeElement).toBe(d6Radio);
    await rerender({ selectedFaces: 6, disabled: false, onSelect });

    await fireEvent.keyDown(d6Radio, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith(8);
    expect(document.activeElement).toBe(d8Radio);
    await rerender({ selectedFaces: 8, disabled: false, onSelect });

    await fireEvent.keyDown(d8Radio, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith(10);
    expect(document.activeElement).toBe(d10Radio);
    await rerender({ selectedFaces: 10, disabled: false, onSelect });

    await fireEvent.keyDown(d10Radio, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenLastCalledWith(8);
    expect(document.activeElement).toBe(d8Radio);
    await rerender({ selectedFaces: 8, disabled: false, onSelect });

    await fireEvent.keyDown(d8Radio, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenLastCalledWith(6);
    expect(document.activeElement).toBe(d6Radio);
    await rerender({ selectedFaces: 6, disabled: false, onSelect });

    await fireEvent.keyDown(d6Radio, { key: 'ArrowUp' });
    expect(onSelect).toHaveBeenLastCalledWith(4);
    expect(document.activeElement).toBe(d4Radio);
    await rerender({ selectedFaces: 4, disabled: false, onSelect });

    await fireEvent.keyDown(d4Radio, { key: 'End' });
    expect(onSelect).toHaveBeenLastCalledWith(20);
    expect(document.activeElement).toBe(d20Radio);
    await rerender({ selectedFaces: 20, disabled: false, onSelect });

    // Wrap forward from last (20) -> first (2)
    await fireEvent.keyDown(d20Radio, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenLastCalledWith(2);
    expect(document.activeElement).toBe(coinRadio);
    await rerender({ selectedFaces: 2, disabled: false, onSelect });

    // Wrap backward from first (2) -> last (20)
    await fireEvent.keyDown(coinRadio, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenLastCalledWith(20);
    expect(document.activeElement).toBe(d20Radio);
    await rerender({ selectedFaces: 20, disabled: false, onSelect });

    await fireEvent.keyDown(d20Radio, { key: 'Home' });
    expect(onSelect).toHaveBeenLastCalledWith(2);
    expect(document.activeElement).toBe(coinRadio);

    const countBefore = onSelect.mock.calls.length;
    await fireEvent.keyDown(coinRadio, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(countBefore);
  });

  it('ignores clicks and keyboard navigation when disabled', async () => {
    const onSelect = vi.fn<(faces: DieFaces) => void>();
    const { getByRole } = render(FaceSelector, {
      props: {
        selectedFaces: 6,
        disabled: true,
        onSelect,
      },
    });

    const d6Radio = getByRole('radio', { name: 'd6' });
    const d8Radio = getByRole('radio', { name: 'd8' });

    expect(d6Radio.hasAttribute('disabled')).toBe(true);
    expect(d8Radio.hasAttribute('disabled')).toBe(true);

    await fireEvent.click(d8Radio);
    await fireEvent.keyDown(d6Radio, { key: 'ArrowRight' });
    await fireEvent.keyDown(d6Radio, { key: 'Home' });
    await fireEvent.keyDown(d6Radio, { key: 'End' });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('falls back to index 0 when selectedFaces is not in ALLOWED_FACES', async () => {
    const onSelect = vi.fn<(faces: DieFaces) => void>();
    const invalidFaces: unknown = 99;
    const props: ComponentProps<typeof FaceSelector> = {
      selectedFaces: invalidFaces as DieFaces,
      disabled: false,
      onSelect,
    };

    const { getByRole } = render(FaceSelector, { props });
    const coinRadio = getByRole('radio', { name: 'Coin (d2)' });
    await fireEvent.keyDown(coinRadio, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith(4);
  });
});
