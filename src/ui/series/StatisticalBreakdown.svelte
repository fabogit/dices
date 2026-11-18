<script lang="ts">
  import { dieLabel, formatSigned } from '../../lib/format';
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import DeltaBadge from '../primitives/DeltaBadge.svelte';
  import StatBox from '../primitives/StatBox.svelte';
  import { getRollState } from '../state/rollStateContext';
  import DistributionChart from './DistributionChart.svelte';

  const rollState = getRollState();

  const analytics = $derived(rollState.summary.analytics);
  let isCollapsed = $state(false);
</script>

<section class="series-scoreboard" aria-labelledby="analytics-heading">
  <CollapsiblePanel
    as="div"
    variant="analytics"
    headingLevel="h2"
    headingId="analytics-heading"
    title="Statistical Breakdown ({dieLabel(rollState.seriesFaces)})"
    collapsed={isCollapsed}
    onToggle={() => (isCollapsed = !isCollapsed)}
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
      {@const coinStats = analytics.coinStats}

      <div
        class="analytics-metrics-grid coin-analytics-grid"
        data-testid="analytics-metrics"
        data-variant="coin"
      >
        <!-- Heads Share -->
        <StatBox
          label="Heads Share"
          value="{coinStats.headsPercentage.toFixed(1)}%"
          valueTone="heads"
        >
          {#if analytics.totalDiceRolled > 0}
            <DeltaBadge
              tone={coinStats.headsDeltaPercentage >= 0 ? 'positive' : 'negative'}
              text="{formatSigned(coinStats.headsDeltaPercentage, 1)}% vs 50%"
            />
          {/if}
        </StatBox>

        <!-- Tails Share -->
        <StatBox
          label="Tails Share"
          value="{coinStats.tailsPercentage.toFixed(1)}%"
          valueTone="tails"
        >
          {#if analytics.totalDiceRolled > 0}
            <DeltaBadge
              tone={coinStats.tailsDeltaPercentage >= 0 ? 'positive' : 'negative'}
              text="{formatSigned(coinStats.tailsDeltaPercentage, 1)}% vs 50%"
            />
          {/if}
        </StatBox>

        <!-- Balance Deviation (z) -->
        <StatBox
          label="Balance Deviation (z)"
          value={analytics.totalDiceRolled > 0 ? formatSigned(analytics.zScore, 2) : '0.00'}
          subtext={coinStats.zQualitative}
        />

        <!-- Round Split -->
        <StatBox
          label="Round Split"
          value="{coinStats.headsRoundsWon}H / {coinStats.tailsRoundsWon}T{coinStats.tieRounds > 0
            ? ` / ${coinStats.tieRounds} Tie`
            : ''}"
          subtext="across {rollState.rounds.length} rounds"
        />
      </div>
    {:else}
      <!-- Polyhedral d4..d20 Analytics Grid -->
      <div class="analytics-metrics-grid" data-testid="analytics-metrics" data-variant="polyhedral">
        <!-- Expected vs Actual Round Average -->
        <StatBox label="Expected Avg (E[X])" value={analytics.expectedRoundAverage.toFixed(1)}>
          {#if rollState.rounds.length > 0}
            <DeltaBadge
              tone={analytics.averageDelta >= 0 ? 'positive' : 'negative'}
              text="{formatSigned(analytics.averageDelta, 1)} Δ"
            />
            <span class="zscore-tag">
              (z: {formatSigned(analytics.zScore, 2)})
            </span>
          {/if}
        </StatBox>

        <!-- Population Standard Deviation of Round Sums -->
        <StatBox
          label="Std Deviation (σ)"
          value={rollState.rounds.length > 0 ? analytics.standardDeviation.toFixed(2) : '0.00'}
          subtext="across round sums (σ)"
        />

        <!-- Critical Max Rate (= N) -->
        <StatBox
          label="Crit Max (= {rollState.seriesFaces})"
          value="{analytics.criticalMaxRate.toFixed(1)}%"
          valueTone="crit-max"
          subtext="({analytics.criticalMaxCount}/{analytics.totalDiceRolled})"
        />

        <!-- Critical Min Rate (= 1) -->
        <StatBox
          label="Crit Min (= 1)"
          value="{analytics.criticalMinRate.toFixed(1)}%"
          valueTone="crit-min"
          subtext="({analytics.criticalMinCount}/{analytics.totalDiceRolled})"
        />
      </div>
    {/if}

    <DistributionChart distribution={analytics.distribution} faces={rollState.seriesFaces} />
  </CollapsiblePanel>
</section>

<style>
  .series-scoreboard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--surface-panel);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    backdrop-filter: blur(8px);
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

  .analytics-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .zscore-tag {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }
</style>
