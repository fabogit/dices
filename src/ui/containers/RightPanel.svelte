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
  <QuickResultPanel />
{:else}
  <Tabs
    tabs={rightPanelTabs}
    activeTab={rightPanelTab}
    ariaLabel="Series analysis views"
    onSelect={(id) => (rightPanelTab = id)}
  >
    {#snippet panel(id)}
      {#if id === 'scoreboard'}
        <SeriesScoreboard />
      {:else if id === 'analytics'}
        <StatisticalBreakdown />
      {:else}
        <HistoryPanel />
      {/if}
    {/snippet}
  </Tabs>
{/if}
