import { describe, it, expect, afterEach } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { RollState } from '../../state/rollState.svelte';
import {
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import RightPanel from '../RightPanel.svelte';

let rollState: RollState;

function renderPanel(...rounds: number[][]) {
  rollState = createTestRollState({ provider: createScriptedProvider(...rounds) });
  return renderWithRollState(RightPanel, rollState);
}

describe('RightPanel container', () => {
  afterEach(() => {
    rollState.dispose();
  });

  it('shows the quick roll feed instead of the series tabs in Quick mode', async () => {
    const { getByRole, queryByRole } = renderPanel();
    rollState.setMode('quick');
    await tick();

    expect(getByRole('heading', { name: 'Quick Roll Feed' })).toBeTruthy();
    expect(queryByRole('tablist')).toBeNull();
    expect(queryByRole('heading', { name: 'Live Series Scoreboard' })).toBeNull();
  });

  it('shows the series tabs with the scoreboard selected and no badges at first', () => {
    const { getByRole, getAllByRole } = renderPanel();

    expect(getByRole('tablist', { name: 'Series analysis views' })).toBeTruthy();
    expect(getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
      'Scoreboard',
      'Breakdown',
      'History',
    ]);
    expect(getByRole('tab', { name: 'Scoreboard' }).getAttribute('aria-selected')).toBe('true');
    // Only the selected panel is exposed; the others stay mounted but hidden
    expect(getAllByRole('tabpanel')).toHaveLength(1);
    expect(getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
      getByRole('tab', { name: 'Scoreboard' }).id,
    );
  });

  it('switches panels from the tabs, keeping the others mounted but hidden', async () => {
    const { getByRole, container } = renderPanel();

    await fireEvent.click(getByRole('tab', { name: 'Breakdown' }));
    expect(getByRole('tab', { name: 'Breakdown' }).getAttribute('aria-selected')).toBe('true');
    expect(getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
      getByRole('tab', { name: 'Breakdown' }).id,
    );
    const scoreboardPanel = container.querySelector<HTMLElement>(
      `[aria-labelledby="${getByRole('tab', { name: 'Scoreboard' }).id}"]`,
    );
    expect(scoreboardPanel?.hidden).toBe(true);

    await fireEvent.keyDown(getByRole('tab', { name: 'Breakdown' }), { key: 'ArrowRight' });
    expect(getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
      getByRole('tab', { name: 'History' }).id,
    );
  });

  it('badges the scoreboard with the series progress and the history with its size', async () => {
    const { getByRole } = renderPanel([3], [4]);
    rollState.setSeriesLength(2);

    await rollState.rollNextRound();
    await tick();
    expect(getByRole('tab', { name: 'Scoreboard 1/2' })).toBeTruthy();
    expect(getByRole('tab', { name: 'History' })).toBeTruthy();

    await rollState.rollNextRound();
    await tick();
    expect(getByRole('tab', { name: 'Scoreboard 2/2' })).toBeTruthy();
    expect(getByRole('tab', { name: 'History 1' })).toBeTruthy();
  });

  it('reads the series length from the same source as the scoreboard', async () => {
    const { getByRole, getByText } = renderPanel([6]);
    rollState.setSeriesLength(5);
    await rollState.rollNextRound();
    await tick();

    expect(getByRole('tab', { name: 'Scoreboard 1/5' })).toBeTruthy();
    expect(getByText('Round 1 of 5')).toBeTruthy();
  });
});
