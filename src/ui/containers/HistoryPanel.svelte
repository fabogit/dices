<script lang="ts">
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import EmptyState from '../primitives/EmptyState.svelte';
  import { getRollState } from '../state/rollStateContext';
  import HistoryList from '../history/HistoryList.svelte';
  import Leaderboard from '../history/Leaderboard.svelte';

  const rollState = getRollState();

  let isCollapsed = $state(false);
</script>

<CollapsiblePanel
  as="aside"
  variant="history"
  headingId="history-heading"
  title="History & Leaderboard"
  collapsed={isCollapsed}
  onToggle={() => (isCollapsed = !isCollapsed)}
>
  {#snippet actions()}
    {#if rollState.history.length > 0}
      <button
        type="button"
        class="clear-btn"
        onclick={() => rollState.clearHistory()}
        aria-label="Clear all completed series history"
      >
        Clear
      </button>
    {/if}
  {/snippet}

  {#if rollState.history.length === 0}
    <EmptyState
      variant="inline"
      message="No completed series yet. Complete a series to save records to local storage."
    />
  {:else}
    <Leaderboard entries={rollState.leaderboard} />
    <HistoryList items={rollState.history} />
  {/if}
</CollapsiblePanel>

<style>
  .clear-btn {
    padding: 0.25rem 0.5rem;
    min-block-size: 28px;
    background: transparent;
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .clear-btn:hover {
    background: var(--surface-elevated);
    color: var(--color-danger);
    border-color: var(--color-danger-bold);
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
