<script lang="ts">
  import { tick } from 'svelte';
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import Dialog from '../primitives/Dialog.svelte';
  import EmptyState from '../primitives/EmptyState.svelte';
  import { getRollState } from '../state/rollStateContext';
  import HistoryList from '../history/HistoryList.svelte';
  import Leaderboard from '../history/Leaderboard.svelte';

  const rollState = getRollState();

  interface Props {
    /** Bindable so RightPanel can keep it while this panel is unmounted by a mode switch. */
    collapsed?: boolean;
  }

  let { collapsed = $bindable(false) }: Props = $props();

  let confirmOpen = $state(false);
  let clearTrigger: HTMLButtonElement | undefined = $state();

  const seriesCount = $derived(rollState.history.length);

  function closeConfirm() {
    confirmOpen = false;
    clearTrigger?.focus();
  }

  const HEADING_ID = 'history-heading';

  async function confirmClear() {
    rollState.clearHistory();
    confirmOpen = false;
    // The Clear trigger unmounts with the last series, so focus moves to the panel heading
    // (which stays mounted) instead of being dropped on <body> (WCAG 2.4.3).
    await tick();
    const heading = document.querySelector<HTMLElement>(`#${HEADING_ID}`);
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }
</script>

<CollapsiblePanel
  bind:collapsed
  as="aside"
  class="surface-card"
  --cp-gap="0.85rem"
  --cp-body-gap="0.85rem"
  --cp-header-gap="0.5rem"
  headingId={HEADING_ID}
  title="History & Leaderboard"
>
  {#snippet actions()}
    {#if rollState.history.length > 0}
      <button
        type="button"
        class="clear-btn"
        bind:this={clearTrigger}
        onclick={() => (confirmOpen = true)}
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

<Dialog open={confirmOpen} title="Clear history?" onClose={closeConfirm}>
  <p class="confirm-text">
    This permanently deletes {seriesCount} completed series from History and the Leaderboard. This cannot
    be undone.
  </p>
  <div class="confirm-actions">
    <!-- svelte-ignore a11y_autofocus -->
    <button type="button" class="confirm-btn cancel" autofocus onclick={closeConfirm}>
      Cancel
    </button>
    <button type="button" class="confirm-btn danger" onclick={confirmClear}>
      Delete history
    </button>
  </div>
</Dialog>

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

  .confirm-text {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .confirm-btn {
    padding: 0.5rem 1rem;
    min-block-size: 36px;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .confirm-btn.cancel {
    background: transparent;
    border: 1px solid var(--border-muted);
    color: var(--text-secondary);
  }

  .confirm-btn.danger {
    background: transparent;
    border: 1px solid var(--color-danger-bold);
    color: var(--color-danger-light);
  }

  .confirm-btn.danger:hover {
    background: var(--color-danger-bold);
    color: var(--text-white);
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
