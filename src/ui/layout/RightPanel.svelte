<script lang="ts">
  import HistoryPanel from '../HistoryPanel.svelte';
  import Tabs from '../primitives/Tabs.svelte';
  import QuickResultPanel from '../quick/QuickResultPanel.svelte';
  import SeriesScoreboard from '../series/SeriesScoreboard.svelte';
  import StatisticalBreakdown from '../series/StatisticalBreakdown.svelte';
  import { rollState } from '../state/rollState.svelte';

  type RightPanelTab = 'scoreboard' | 'analytics' | 'history';

  let rightPanelTab = $state<RightPanelTab>('scoreboard');

  const rightPanelTabs = $derived([
    {
      id: 'scoreboard',
      label: 'Scoreboard',
      badge:
        rollState.rounds.length > 0
          ? `${rollState.rounds.length}/${rollState.seriesLength}`
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
    onSelect={(id) => {
      if (id === 'scoreboard' || id === 'analytics' || id === 'history') {
        rightPanelTab = id;
      }
    }}
  />

  <div
    id="tabpanel-scoreboard"
    role="tabpanel"
    aria-labelledby="tab-scoreboard"
    hidden={rightPanelTab !== 'scoreboard'}
  >
    <SeriesScoreboard />
  </div>
  <div
    id="tabpanel-analytics"
    role="tabpanel"
    aria-labelledby="tab-analytics"
    hidden={rightPanelTab !== 'analytics'}
  >
    <StatisticalBreakdown />
  </div>
  <div
    id="tabpanel-history"
    role="tabpanel"
    aria-labelledby="tab-history"
    hidden={rightPanelTab !== 'history'}
  >
    <HistoryPanel />
  </div>
{/if}
