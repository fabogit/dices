import { describe, it, expect, vi } from 'vite-plus/test';
import { render, fireEvent } from '@testing-library/svelte';
import type { AppMode } from '../../../core/types';
import ModeSwitch from '../ModeSwitch.svelte';

describe('ModeSwitch', () => {
  it('marks the current mode as pressed and reports the clicked mode', async () => {
    const onSelect = vi.fn<(mode: AppMode) => void>();
    const { getByRole, rerender } = render(ModeSwitch, {
      props: { mode: 'series', disabled: false, onSelect },
    });

    expect(getByRole('group', { name: 'Application mode' })).toBeTruthy();
    const quick = getByRole('button', { name: /Quick Roll/ });
    const series = getByRole('button', { name: /Series/ });
    expect(quick.getAttribute('aria-pressed')).toBe('false');
    expect(series.getAttribute('aria-pressed')).toBe('true');
    expect(series.classList.contains('active')).toBe(true);

    await fireEvent.click(quick);
    expect(onSelect).toHaveBeenLastCalledWith('quick');
    await fireEvent.click(series);
    expect(onSelect).toHaveBeenLastCalledWith('series');

    // The parent owns the mode: clicking does not toggle it locally
    expect(series.getAttribute('aria-pressed')).toBe('true');
    await rerender({ mode: 'quick', disabled: false, onSelect });
    expect(quick.getAttribute('aria-pressed')).toBe('true');
    expect(quick.classList.contains('active')).toBe(true);
    expect(series.getAttribute('aria-pressed')).toBe('false');
  });

  it('disables both buttons and ignores clicks while disabled', async () => {
    const onSelect = vi.fn<(mode: AppMode) => void>();
    const { getAllByRole } = render(ModeSwitch, {
      props: { mode: 'quick', disabled: true, onSelect },
    });

    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.hasAttribute('disabled')).toBe(true);
      await fireEvent.click(button);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });
});
