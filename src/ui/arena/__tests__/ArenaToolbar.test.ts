import { describe, it, expect, vi } from 'vite-plus/test';
import { render, fireEvent } from '@testing-library/svelte';
import ArenaToolbar from '../ArenaToolbar.svelte';

function createCallbacks() {
  return {
    onQuickRoll: vi.fn<() => void>(),
    onClearQuickRolls: vi.fn<() => void>(),
    onRollRound: vi.fn<() => void>(),
    onAutoRoll: vi.fn<() => void>(),
    onStopAutoRoll: vi.fn<() => void>(),
    onResetSeries: vi.fn<() => void>(),
    onSkipAnimation: vi.fn<() => void>(),
  };
}

describe('ArenaToolbar', () => {
  it('renders Quick Roll controls for coins and dice and triggers quick callbacks', async () => {
    const callbacks = createCallbacks();
    const { getByRole, queryByRole, rerender } = render(ArenaToolbar, {
      props: {
        mode: 'quick',
        faces: 2,
        countPerRoll: 1,
        isRolling: false,
        isAutoRolling: false,
        isComplete: false,
        instantMode: false,
        quickRollsCount: 0,
        roundsCount: 0,
        seriesLength: 3,
        ...callbacks,
      },
    });

    const toolbar = getByRole('toolbar', { name: 'Roll controls' });
    expect(toolbar).toBeTruthy();

    const flipSingle = getByRole('button', { name: /Flip Coin/ });
    const clearBtn = getByRole('button', { name: 'Clear feed of all quick rolls' });
    expect(clearBtn.hasAttribute('disabled')).toBe(true);

    await fireEvent.click(flipSingle);
    expect(callbacks.onQuickRoll).toHaveBeenCalledOnce();

    await rerender({
      mode: 'quick',
      faces: 2,
      countPerRoll: 3,
      isRolling: false,
      isAutoRolling: false,
      isComplete: false,
      instantMode: false,
      quickRollsCount: 2,
      roundsCount: 0,
      seriesLength: 3,
      ...callbacks,
    });
    expect(getByRole('button', { name: /Flip 3 Coins/ })).toBeTruthy();
    expect(clearBtn.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(clearBtn);
    expect(callbacks.onClearQuickRolls).toHaveBeenCalledOnce();

    await rerender({
      mode: 'quick',
      faces: 6,
      countPerRoll: 2,
      isRolling: true,
      isAutoRolling: false,
      isComplete: false,
      instantMode: false,
      quickRollsCount: 2,
      roundsCount: 0,
      seriesLength: 3,
      ...callbacks,
    });
    const rollDiceBtn = getByRole('button', { name: /Roll 2d6/ });
    expect(rollDiceBtn.hasAttribute('disabled')).toBe(true);
    expect(clearBtn.hasAttribute('disabled')).toBe(true);

    const skipBtn = getByRole('button', { name: /Skip Animation/ });
    await fireEvent.click(skipBtn);
    expect(callbacks.onSkipAnimation).toHaveBeenCalledOnce();

    // Skip Animation is hidden in instantMode even while rolling
    await rerender({
      mode: 'quick',
      faces: 6,
      countPerRoll: 2,
      isRolling: true,
      isAutoRolling: false,
      isComplete: false,
      instantMode: true,
      quickRollsCount: 2,
      roundsCount: 0,
      seriesLength: 3,
      ...callbacks,
    });
    expect(queryByRole('button', { name: /Skip Animation/ })).toBeNull();
  });

  it('handles Series controls including Auto-Roll, Stop Auto-Roll, Reset, and completion state', async () => {
    const callbacks = createCallbacks();
    const { getByRole, rerender } = render(ArenaToolbar, {
      props: {
        mode: 'series',
        faces: 6,
        countPerRoll: 1,
        isRolling: false,
        isAutoRolling: false,
        isComplete: false,
        instantMode: false,
        quickRollsCount: 0,
        roundsCount: 0,
        seriesLength: 3,
        ...callbacks,
      },
    });

    const rollRoundBtn = getByRole('button', { name: 'Roll Round (1/3)' });
    const autoBtn = getByRole('button', { name: /Auto-Roll Series \(3\)/ });
    const resetBtn = getByRole('button', { name: /Reset/ });

    await fireEvent.click(rollRoundBtn);
    expect(callbacks.onRollRound).toHaveBeenCalledOnce();

    await fireEvent.click(autoBtn);
    expect(callbacks.onAutoRoll).toHaveBeenCalledOnce();

    await fireEvent.click(resetBtn);
    expect(callbacks.onResetSeries).toHaveBeenCalledOnce();

    // Rolling manually disables Auto-Roll and Reset
    await rerender({
      mode: 'series',
      faces: 6,
      countPerRoll: 1,
      isRolling: true,
      isAutoRolling: false,
      isComplete: false,
      instantMode: false,
      quickRollsCount: 0,
      roundsCount: 1,
      seriesLength: 3,
      ...callbacks,
    });
    expect(getByRole('button', { name: /Auto-Roll Series/ }).hasAttribute('disabled')).toBe(true);
    expect(getByRole('button', { name: /Reset/ }).hasAttribute('disabled')).toBe(true);

    // While auto-rolling, Stop button remains enabled even if isRolling is true
    await rerender({
      mode: 'series',
      faces: 6,
      countPerRoll: 1,
      isRolling: true,
      isAutoRolling: true,
      isComplete: false,
      instantMode: false,
      quickRollsCount: 0,
      roundsCount: 1,
      seriesLength: 3,
      ...callbacks,
    });
    const stopBtn = getByRole('button', { name: /Stop Auto-Roll/ });
    expect(stopBtn.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(stopBtn);
    expect(callbacks.onStopAutoRoll).toHaveBeenCalledOnce();

    // Series complete disables Roll Round and Auto-Roll while keeping Reset enabled
    await rerender({
      mode: 'series',
      faces: 6,
      countPerRoll: 1,
      isRolling: false,
      isAutoRolling: false,
      isComplete: true,
      instantMode: false,
      quickRollsCount: 0,
      roundsCount: 3,
      seriesLength: 3,
      ...callbacks,
    });
    const completeBtn = getByRole('button', { name: 'Series Complete (3/3)' });
    expect(completeBtn.hasAttribute('disabled')).toBe(true);
    expect(getByRole('button', { name: /Auto-Roll Series/ }).hasAttribute('disabled')).toBe(true);
    expect(getByRole('button', { name: /Reset/ }).hasAttribute('disabled')).toBe(false);
  });
});
