import { describe, it, expect, vi } from 'vite-plus/test';
import { render, fireEvent } from '@testing-library/svelte';
import InstantModeToggle from '../InstantModeToggle.svelte';

describe('InstantModeToggle', () => {
  it('reflects the active prop and reports clicks without toggling locally', async () => {
    const onToggle = vi.fn<() => void>();
    const { getByRole, rerender } = render(InstantModeToggle, {
      props: { active: false, onToggle },
    });

    const toggle = getByRole('button', { name: /Fast: OFF/ });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.classList.contains('active')).toBe(false);
    expect(toggle.getAttribute('title')).toBe(
      'Toggle instant roll mode without 3D kinematic tumble',
    );

    await fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await rerender({ active: true, onToggle });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.classList.contains('active')).toBe(true);
    expect(toggle.textContent).toContain('Fast: ON');
  });
});
