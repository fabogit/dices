<script lang="ts">
  import { dieLabel } from '../../lib/format';
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import { getRollState } from '../state/rollStateContext';
  import CoinAnalyticsGrid from '../series/CoinAnalyticsGrid.svelte';
  import DiceAnalyticsGrid from '../series/DiceAnalyticsGrid.svelte';
  import DistributionChart from '../series/DistributionChart.svelte';

  const rollState = getRollState();

  interface Props {
    /** Bindable so RightPanel can keep it while this panel is unmounted by a mode switch. */
    collapsed?: boolean;
  }

  let { collapsed = $bindable(false) }: Props = $props();

  const analytics = $derived(rollState.summary.analytics);
</script>

<section class="statistical-breakdown surface-card" aria-labelledby="analytics-heading">
  <CollapsiblePanel
    bind:collapsed
    as="div"
    --cp-gap="0.75rem"
    --cp-body-gap="0.75rem"
    --cp-heading-letter-spacing="-0.01em"
    --cp-title-wrap="wrap"
    headingLevel="h2"
    headingId="analytics-heading"
    title="Statistical Breakdown ({dieLabel(rollState.seriesFaces)})"
    expandAriaLabel="Show Statistical Breakdown & Distribution"
    collapseAriaLabel="Hide Statistical Breakdown & Distribution"
    bodyTestId="analytics-body"
  >
    {#snippet badge()}
      <span class="dice-count-tag">
        {`${analytics.totalDiceRolled} ${analytics.totalDiceRolled === 1 ? 'die' : 'dice'} rolled`}
      </span>
    {/snippet}

    <!-- Statistical Insight Banner -->
    <div class="insight-banner">
      <div class="insight-header">
        <div class="insight-title-group">
          <span class="insight-icon" aria-hidden="true">💡</span>
          <h4 class="insight-title">Statistical Verdict</h4>
        </div>
        <span
          class="reliability-chip reliability-{analytics.sampleReliability}"
          data-testid="sample-reliability"
        >
          {analytics.sampleReliabilityLabel}
        </span>
      </div>
      <p class="insight-text" data-testid="insight-text">{analytics.insightSummary}</p>
    </div>

    <!-- Analytics Key Metrics Grid -->
    {#if analytics.kind === 'coin'}
      <CoinAnalyticsGrid {analytics} roundsCount={rollState.rounds.length} />
    {:else}
      <DiceAnalyticsGrid
        {analytics}
        faces={rollState.seriesFaces}
        roundsCount={rollState.rounds.length}
      />
    {/if}

    <DistributionChart distribution={analytics.distribution} faces={rollState.seriesFaces} />
  </CollapsiblePanel>
</section>

<style>
  .statistical-breakdown {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .dice-count-tag {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  /* Insight Banner */
  .insight-banner {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.75rem 0.85rem;
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(17, 24, 39, 0.95) 100%);
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 0.5rem;
  }

  .insight-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .insight-title-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .insight-icon {
    font-size: 1rem;
  }

  .insight-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent-blue);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reliability-chip {
    padding: 0.15rem 0.45rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .reliability-solid {
    background: rgba(16, 185, 129, 0.2);
    color: var(--color-emerald);
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  .reliability-moderate {
    background: rgba(245, 158, 11, 0.2);
    color: var(--color-amber);
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .reliability-small {
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-danger-light);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .reliability-empty {
    background: rgba(107, 114, 128, 0.2);
    color: var(--text-secondary);
    border: 1px solid rgba(107, 114, 128, 0.4);
  }

  .insight-text {
    margin: 0;
    font-size: 0.825rem;
    line-height: 1.4;
    color: var(--text-body);
  }
</style>
