<script lang="ts">
  import type { PopulatedQuickRollSessionStats } from '../../core/types';
  import { dieLabel, formatSigned } from '../../lib/format';
  import DeltaBadge from '../primitives/DeltaBadge.svelte';

  interface Props {
    sessionStats: PopulatedQuickRollSessionStats;
  }

  let { sessionStats }: Props = $props();
</script>

<!-- Active Die Session Summary Strip (Issue #12) -->
<div class="session-summary-strip" role="group" aria-label="Session summary for active die">
  <div class="session-strip-header">
    <span class="session-strip-title">
      Session Summary ({dieLabel(sessionStats.faces)})
    </span>
    <span class="session-strip-count">
      {sessionStats.matchingThrows} throws • {sessionStats.totalDiceCount}
      {sessionStats.kind === 'coin' ? 'coins' : 'dice'}
    </span>
  </div>

  <div class="session-strip-metrics">
    {#if sessionStats.kind === 'coin'}
      <span class="session-pill pill-heads">
        {sessionStats.headsPercentage.toFixed(1)}% Heads ({sessionStats.totalHeads})
      </span>
      <span class="session-pill pill-tails">
        {sessionStats.tailsPercentage.toFixed(1)}% Tails ({sessionStats.totalTails})
      </span>
      <span class="session-pill pill-verdict">
        {sessionStats.balanceVerdict}
      </span>
    {:else}
      <span class="session-pill pill-avg">
        Die Avg: {sessionStats.actualAverage.toFixed(2)}
      </span>
      <DeltaBadge
        tone={sessionStats.averageDelta >= 0 ? 'positive' : 'negative'}
        text="{formatSigned(sessionStats.averageDelta, 2)} Δ"
        variant="pill"
      />
      {#if sessionStats.criticalMaxCount > 0}
        <span class="session-pill pill-crit">
          {sessionStats.criticalMaxCount}x crit ({sessionStats.faces})
        </span>
      {/if}
      {#if sessionStats.criticalMinCount > 0}
        <span class="session-pill pill-min">
          {sessionStats.criticalMinCount}x nat 1
        </span>
      {/if}
    {/if}
  </div>

  <p class="session-strip-insight">{sessionStats.insight}</p>
</div>

<style>
  /* Session Summary Strip */
  .session-summary-strip {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.65rem 0.75rem;
    background: var(--surface-dark);
    border: 1px solid var(--border-subtle);
    border-radius: 0.5rem;
  }

  .session-strip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  .session-strip-title {
    font-weight: 700;
    color: var(--accent-blue);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .session-strip-count {
    color: var(--text-secondary);
  }

  .session-strip-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .session-pill {
    padding: 0.15rem 0.45rem;
    border-radius: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .pill-heads {
    background: var(--color-yellow-500-a15);
    color: var(--color-gold-light);
    border: 1px solid var(--color-yellow-500-a30);
  }

  .pill-tails {
    background: var(--color-slate-400-a15);
    color: var(--text-soft);
    border: 1px solid var(--color-slate-400-a30);
  }

  .pill-verdict {
    background: var(--color-sky-400-a15);
    color: var(--accent-blue);
    border: 1px solid var(--color-sky-400-a30);
  }

  .pill-avg {
    background: var(--surface-elevated);
    color: var(--text-body);
    border: 1px solid var(--border-subtle);
  }

  .pill-crit {
    background: var(--color-yellow-500-a15);
    color: var(--color-gold);
    border: 1px solid var(--color-yellow-500-a30);
  }

  .pill-min {
    background: var(--color-red-500-a15);
    color: var(--color-danger);
    border: 1px solid var(--color-red-500-a30);
  }

  .session-strip-insight {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.35;
  }
</style>
