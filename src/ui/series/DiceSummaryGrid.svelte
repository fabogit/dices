<script lang="ts">
  import type { RoundResult, SeriesSummary } from '../../core/types';

  interface Props {
    summary: SeriesSummary;
    rounds: ReadonlyArray<RoundResult>;
  }

  let { summary, rounds }: Props = $props();
</script>

<div class="dice-metrics-grid">
  <div class="metric-card">
    <span class="metric-label">Total Sum (∑)</span>
    <span class="metric-value">{summary.totalSum}</span>
  </div>

  <div class="metric-card">
    <span class="metric-label">Average (μ)</span>
    <span class="metric-value">
      {rounds.length > 0 ? summary.average.toFixed(1) : '0.0'}
    </span>
  </div>

  <div class="metric-card">
    <span class="metric-label">Best Round</span>
    <span class="metric-value highlight-green">
      {summary.bestRoundIndex >= 0
        ? `#${summary.bestRoundIndex + 1} (${rounds[summary.bestRoundIndex]?.sum})`
        : '—'}
    </span>
  </div>

  <div class="metric-card">
    <span class="metric-label">Worst Round</span>
    <span class="metric-value highlight-red">
      {summary.worstRoundIndex >= 0
        ? `#${summary.worstRoundIndex + 1} (${rounds[summary.worstRoundIndex]?.sum})`
        : '—'}
    </span>
  </div>

  <div class="metric-card wide-card">
    <span class="metric-label">Mode (Most Frequent Face)</span>
    <span class="metric-value">
      {#if summary.mode.values.length > 0}
        {summary.mode.values.join(', ')}
        <span class="mode-freq">({summary.mode.frequency}x)</span>
        {#if summary.mode.isTie}
          <span class="mode-tie-badge">(Tie)</span>
        {/if}
      {:else}
        —
      {/if}
    </span>
  </div>
</div>

<style>
  .dice-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .metric-card {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.65rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 0.375rem;
  }

  .wide-card {
    grid-column: span 2;
  }

  .metric-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .metric-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .highlight-green {
    color: var(--color-emerald);
  }

  .highlight-red {
    color: var(--color-danger);
  }

  .mode-freq {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .mode-tie-badge {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-gold);
    margin-left: 0.25rem;
  }
</style>
