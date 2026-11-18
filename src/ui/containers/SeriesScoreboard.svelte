<script lang="ts">
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import CoinSummaryCards from '../series/CoinSummaryCards.svelte';
  import DiceSummaryGrid from '../series/DiceSummaryGrid.svelte';
  import RoundsTable from '../series/RoundsTable.svelte';
  import { getRollState } from '../state/rollStateContext';

  const rollState = getRollState();

  const summary = $derived(rollState.summary);
</script>

<section class="series-scoreboard surface-card" aria-labelledby="scoreboard-heading">
  <CollapsiblePanel
    as="div"
    --cp-title-wrap="wrap"
    headingId="scoreboard-heading"
    title="Live Series Scoreboard"
  >
    {#snippet badge()}
      <span class="series-badge">
        Round {rollState.rounds.length} of {rollState.summary.config.seriesLength}
      </span>
    {/snippet}

    <!-- Progress Bar -->
    <div class="progress-container">
      <div
        class="progress-bar"
        role="progressbar"
        aria-valuenow={rollState.rounds.length}
        aria-valuemin="0"
        aria-valuemax={rollState.summary.config.seriesLength}
        aria-label="Series round completion progress"
        style:width="{rollState.progressPercent}%"
      ></div>
    </div>

    {#if summary.kind === 'coin'}
      <CoinSummaryCards {summary} isComplete={rollState.isComplete} />
    {:else}
      <DiceSummaryGrid {summary} rounds={rollState.rounds} />
    {/if}

    <RoundsTable
      rounds={rollState.rounds}
      faces={rollState.seriesFaces}
      playerName={rollState.summary.playerName}
    />
  </CollapsiblePanel>
</section>

<style>
  .series-scoreboard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .series-badge {
    padding: 0.25rem 0.6rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .progress-container {
    width: 100%;
    height: 6px;
    background: var(--surface-elevated);
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-sky) 0%, var(--accent-blue) 100%);
    transition: width 0.3s ease;
  }
</style>
