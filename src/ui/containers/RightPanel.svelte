<script lang="ts">
  import Tabs from '../primitives/Tabs.svelte';
  import { getRollState } from '../state/rollStateContext';
  import HistoryPanel from './HistoryPanel.svelte';
  import QuickResultPanel from './QuickResultPanel.svelte';
  import SeriesScoreboard from './SeriesScoreboard.svelte';
  import StatisticalBreakdown from './StatisticalBreakdown.svelte';

  const rollState = getRollState();

  type RightPanelTab = 'scoreboard' | 'analytics' | 'history';

  let rightPanelTab = $state<RightPanelTab>('scoreboard');

  // UI layout state, not domain state: it stays out of RollState and is never persisted.
  // A mode switch unmounts the panels below while RightPanel stays mounted, so their collapsed
  // flags live here and survive a quick <-> series round trip. Keeping the other mode's panels
  // mounted but hidden instead would leave them subscribed to the store and updating off-screen.
  let collapsed = $state<Record<'quick' | RightPanelTab, boolean>>({
    quick: false,
    scoreboard: false,
    analytics: false,
    history: false,
  });

  const rightPanelTabs = $derived<
    ReadonlyArray<{ id: RightPanelTab; label: string; badge?: string | number }>
  >([
    {
      id: 'scoreboard',
      label: 'Scoreboard',
      badge:
        rollState.rounds.length > 0
          ? `${rollState.rounds.length}/${rollState.summary.config.seriesLength}`
          : undefined,
    },
    { id: 'analytics', label: 'Breakdown' },
    {
      id: 'history',
      label: 'History',
      badge: rollState.history.length > 0 ? rollState.history.length : undefined,
    },
  ]);
</script>

{#if rollState.mode === 'quick'}
  <QuickResultPanel bind:collapsed={collapsed.quick} />
{:else}
  <Tabs
    tabs={rightPanelTabs}
    activeTab={rightPanelTab}
    ariaLabel="Series analysis views"
    onSelect={(id) => (rightPanelTab = id)}
  >
    {#snippet panel(id)}
      {#if id === 'scoreboard'}
        <SeriesScoreboard bind:collapsed={collapsed.scoreboard} />
      {:else if id === 'analytics'}
        <StatisticalBreakdown bind:collapsed={collapsed.analytics} />
      {:else}
        <HistoryPanel bind:collapsed={collapsed.history} />
      {/if}
    {/snippet}
  </Tabs>
{/if}
