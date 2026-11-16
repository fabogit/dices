import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { SERIES_LENGTH_LIMITS } from '../../../core/limits';
import type { RollState } from '../../state/rollState.svelte';
import {
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import ControlPanel from '../ControlPanel.svelte';

let rollState: RollState;

function renderInput(): HTMLInputElement {
  const { getByLabelText } = renderWithRollState(ControlPanel, rollState);
  return getByLabelText(
    `Custom series length (${SERIES_LENGTH_LIMITS.min} to ${SERIES_LENGTH_LIMITS.max})`,
  ) as HTMLInputElement;
}

async function type(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  await fireEvent.change(input);
}

describe('ControlPanel custom series length input', () => {
  beforeEach(() => {
    rollState = createTestRollState({ provider: createScriptedProvider() });
    rollState.setSeriesLength(5);
  });

  afterEach(() => {
    rollState.dispose();
  });

  it('re-syncs to the clamped value when it equals the current state (99 at 21)', async () => {
    rollState.setSeriesLength(21);
    const input = renderInput();
    await type(input, '99');
    expect(rollState.seriesLength).toBe(21);
    expect(input.value).toBe('21');
  });

  it('re-syncs a fractional entry that rounds to the current value (5.4 at 5)', async () => {
    const input = renderInput();
    await type(input, '5.4');
    expect(rollState.seriesLength).toBe(5);
    expect(input.value).toBe('5');
  });

  it('restores the current value on empty input at the minimum (empty at 1)', async () => {
    rollState.setSeriesLength(1);
    const input = renderInput();
    await type(input, '');
    expect(rollState.seriesLength).toBe(1);
    expect(input.value).toBe('1');
  });

  it('empty input keeps the current value instead of silently resetting to 1', async () => {
    const input = renderInput();
    await type(input, '');
    expect(rollState.seriesLength).toBe(5);
    expect(input.value).toBe('5');
  });

  it('still applies valid and out-of-range-but-changing values', async () => {
    const input = renderInput();
    await type(input, '9');
    expect(rollState.seriesLength).toBe(9);
    expect(input.value).toBe('9');
    await type(input, '-4');
    expect(rollState.seriesLength).toBe(1);
    expect(input.value).toBe('1');
  });
});

describe('ControlPanel setup controls', () => {
  beforeEach(() => {
    rollState = createTestRollState({ provider: createScriptedProvider([2]) });
  });

  afterEach(() => {
    rollState.dispose();
  });

  it('selects the instrument through the store and words the quantity hint for it', async () => {
    const { getByRole, getByText } = renderWithRollState(ControlPanel, rollState);
    expect(getByRole('radio', { name: 'd6' }).getAttribute('aria-checked')).toBe('true');
    expect(getByText('1 to 10 dice')).toBeTruthy();

    await fireEvent.click(getByRole('radio', { name: 'Coin (d2)' }));
    expect(rollState.faces).toBe(2);
    expect(getByRole('radio', { name: 'Coin (d2)' }).getAttribute('aria-checked')).toBe('true');
    expect(getByText('1 to 10 coins')).toBeTruthy();
  });

  it('changes the quantity and the series length through the steppers', async () => {
    const { getByRole } = renderWithRollState(ControlPanel, rollState);

    await fireEvent.click(getByRole('button', { name: 'Increase quantity' }));
    expect(rollState.countPerRoll).toBe(2);

    await fireEvent.click(getByRole('button', { name: 'Increase series rounds' }));
    expect(rollState.seriesLength).toBe(4);
  });

  it('applies a series length preset and marks it active', async () => {
    const { getByRole } = renderWithRollState(ControlPanel, rollState);
    const bo5 = getByRole('button', { name: 'Bo5 (5)' });
    expect(getByRole('button', { name: 'Bo3 (3)' }).classList.contains('active')).toBe(true);

    await fireEvent.click(bo5);
    expect(rollState.seriesLength).toBe(5);
    expect(bo5.classList.contains('active')).toBe(true);
    expect(getByRole('button', { name: 'Bo3 (3)' }).classList.contains('active')).toBe(false);
  });

  it('hides the series length controls in Quick mode', async () => {
    const { queryByRole } = renderWithRollState(ControlPanel, rollState);
    rollState.setMode('quick');
    await tick();

    expect(queryByRole('group', { name: 'Series length presets' })).toBeNull();
    expect(queryByRole('slider', { name: /Series Rounds/ })).toBeNull();
    expect(queryByRole('slider', { name: /Quantity Per Roll/ })).toBeTruthy();
  });

  it('locks the setup with a hint while a series is in progress', async () => {
    const { getByRole, queryByRole } = renderWithRollState(ControlPanel, rollState);
    expect(queryByRole('note')).toBeNull();

    await rollState.rollNextRound();
    await tick();

    expect(getByRole('note').textContent).toContain('Series in progress');
    expect(getByRole('radio', { name: 'd20' }).hasAttribute('disabled')).toBe(true);
    expect(getByRole('button', { name: 'Bo5 (5)' }).hasAttribute('disabled')).toBe(true);
    expect(getByRole('button', { name: 'Increase quantity' }).hasAttribute('disabled')).toBe(true);
  });

  it('collapses and expands its body', async () => {
    const { getByRole } = renderWithRollState(ControlPanel, rollState);
    await fireEvent.click(getByRole('button', { name: 'Hide Dice & Series Setup' }));
    expect(
      getByRole('button', { name: 'Show Dice & Series Setup' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });
});
