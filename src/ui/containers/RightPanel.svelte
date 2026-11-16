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

  const rightPanelTabs = $derived([
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
