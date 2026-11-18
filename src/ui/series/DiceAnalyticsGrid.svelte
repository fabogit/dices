<script lang="ts">
  import type { DiceSeriesAnalytics, DieFaces } from '../../core/types';
  import { formatSigned } from '../../lib/format';
  import DeltaBadge from '../primitives/DeltaBadge.svelte';
  import StatBox from '../primitives/StatBox.svelte';

  interface Props {
    analytics: DiceSeriesAnalytics;
    faces: DieFaces;
    roundsCount: number;
  }

  let { analytics, faces, roundsCount }: Props = $props();

  // The average delta and σ only mean something once at least one round has been rolled
  const hasRounds = $derived(roundsCount > 0);
</script>

<!-- Polyhedral d4..d20 Analytics Grid -->
<div class="analytics-metrics-grid" data-testid="analytics-metrics" data-variant="polyhedral">
  <!-- Expected vs Actual Round Average -->
  <StatBox label="Expected Avg (E[X])" value={analytics.expectedRoundAverage.toFixed(1)}>
    {#if hasRounds}
      <DeltaBadge
        tone={analytics.averageDelta >= 0 ? 'positive' : 'negative'}
        text={`${formatSigned(analytics.averageDelta, 1)} Δ`}
      />
      <span class="zscore-tag">
        {`(z: ${formatSigned(analytics.zScore, 2)})`}
      </span>
    {/if}
  </StatBox>

  <!-- Population Standard Deviation of Round Sums -->
  <StatBox
    label="Std Deviation (σ)"
    value={hasRounds ? analytics.standardDeviation.toFixed(2) : '0.00'}
    subtext="across round sums (σ)"
  />

  <!-- Critical Max Rate (= N) -->
  <StatBox
    label={`Crit Max (= ${faces})`}
    value={`${analytics.criticalMaxRate.toFixed(1)}%`}
    valueTone="crit-max"
    subtext={`(${analytics.criticalMaxCount}/${analytics.totalDiceRolled})`}
  />

  <!-- Critical Min Rate (= 1) -->
  <StatBox
    label="Crit Min (= 1)"
    value={`${analytics.criticalMinRate.toFixed(1)}%`}
    valueTone="crit-min"
    subtext={`(${analytics.criticalMinCount}/${analytics.totalDiceRolled})`}
  />
</div>

<style>
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
