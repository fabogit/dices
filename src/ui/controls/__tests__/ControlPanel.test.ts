import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { SERIES_LENGTH_LIMITS } from '../../../core/limits';
import type { RollState } from '../../state/rollState.svelte';
import { createTestRollState, renderWithRollState } from '../../__tests__/renderWithRollState';
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
    rollState = createTestRollState();
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
