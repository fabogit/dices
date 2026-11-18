import { describe, it, expect, afterEach } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { RollState } from '../../state/rollState.svelte';
import {
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import QuickResultPanel from '../QuickResultPanel.svelte';

let rollState: RollState;

function renderPanel(...rounds: number[][]) {
  rollState = createTestRollState({ provider: createScriptedProvider(...rounds) });
  rollState.setMode('quick');
  return renderWithRollState(QuickResultPanel, rollState);
}

async function quickRoll(times: number): Promise<void> {
  for (let i = 0; i < times; i++) await rollState.executeQuickRoll();
  await tick();
}

const SESSION_STRIP = { name: 'Session summary for active die' };

describe('QuickResultPanel container', () => {
  afterEach(() => {
    rollState.dispose();
  });

  it('shows the ready state before the first roll', () => {
    const { getByText, queryByRole } = renderPanel();

    expect(getByText('0 in session')).toBeTruthy();
    expect(getByText('Ready to Roll')).toBeTruthy();
    expect(queryByRole('region', { name: 'Latest Quick Roll Result' })).toBeNull();
    expect(queryByRole('group', SESSION_STRIP)).toBeNull();
    expect(queryByRole('region', { name: 'Recent quick rolls feed' })).toBeNull();
  });

  it('shows the latest roll and the feed, and the session summary from two throws', async () => {
    const { getByText, getByTestId, getByRole, queryByRole, queryByText } = renderPanel([4], [6]);

    await quickRoll(1);
    expect(getByText('1 in session')).toBeTruthy();
    expect(queryByText('Ready to Roll')).toBeNull();
    expect(getByTestId('hero-sum').textContent).toBe('4');
    expect(getByRole('region', { name: 'Recent quick rolls feed' })).toBeTruthy();
    expect(queryByRole('group', SESSION_STRIP)).toBeNull();

    await quickRoll(1);
    expect(getByText('2 in session')).toBeTruthy();
    expect(getByTestId('hero-sum').textContent).toBe('6');
    expect(getByRole('group', SESSION_STRIP).textContent).toContain('Session Summary (d6)');
  });

  it('hides the session summary when the selected die has no throws', async () => {
    const { getByRole, queryByRole } = renderPanel([2], [3]);
    await quickRoll(2);
    expect(getByRole('group', SESSION_STRIP)).toBeTruthy();

    rollState.setFaces(20);
    await tick();
    expect(queryByRole('group', SESSION_STRIP)).toBeNull();
    expect(getByRole('region', { name: 'Recent quick rolls feed' })).toBeTruthy();
  });

  it('clears the feed through the store', async () => {
    const { getByRole, getByText } = renderPanel([5]);
    await quickRoll(1);

    await fireEvent.click(getByRole('button', { name: 'Clear quick roll feed' }));

    expect(rollState.quickRolls).toEqual([]);
    expect(getByText('0 in session')).toBeTruthy();
    expect(getByText('Ready to Roll')).toBeTruthy();
  });

  it('collapses and expands its body', async () => {
    const { getByRole } = renderPanel();
    await fireEvent.click(getByRole('button', { name: 'Hide Quick Roll Feed' }));
    expect(
      getByRole('button', { name: 'Show Quick Roll Feed' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });
});
