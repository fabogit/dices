<script lang="ts">
  import type { CoinSeriesAnalytics } from '../../core/types';
  import { formatSigned } from '../../lib/format';
  import DeltaBadge from '../primitives/DeltaBadge.svelte';
  import StatBox from '../primitives/StatBox.svelte';

  interface Props {
    analytics: CoinSeriesAnalytics;
    roundsCount: number;
  }

  let { analytics, roundsCount }: Props = $props();

  const coinStats = $derived(analytics.coinStats);
  // Share deltas and the z-score only mean something once at least one coin has been tossed
  const hasTosses = $derived(analytics.totalDiceRolled > 0);
</script>

<div
  class="analytics-metrics-grid coin-analytics-grid"
  data-testid="analytics-metrics"
  data-variant="coin"
>
  <!-- Heads Share -->
  <StatBox label="Heads Share" value={`${coinStats.headsPercentage.toFixed(1)}%`} valueTone="heads">
    {#if hasTosses}
      <DeltaBadge
        tone={coinStats.headsDeltaPercentage >= 0 ? 'positive' : 'negative'}
        text={`${formatSigned(coinStats.headsDeltaPercentage, 1)}% vs 50%`}
      />
    {/if}
  </StatBox>

  <!-- Tails Share -->
  <StatBox label="Tails Share" value={`${coinStats.tailsPercentage.toFixed(1)}%`} valueTone="tails">
    {#if hasTosses}
      <DeltaBadge
        tone={coinStats.tailsDeltaPercentage >= 0 ? 'positive' : 'negative'}
        text={`${formatSigned(coinStats.tailsDeltaPercentage, 1)}% vs 50%`}
      />
    {/if}
  </StatBox>

  <!-- Balance Deviation (z) -->
  <StatBox
    label="Balance Deviation (z)"
    value={hasTosses ? formatSigned(analytics.zScore, 2) : '0.00'}
    subtext={coinStats.zQualitative}
  />

  <!-- Round Split -->
  <StatBox
    label="Round Split"
    value={`${coinStats.headsRoundsWon}H / ${coinStats.tailsRoundsWon}T${
      coinStats.tieRounds > 0 ? ` / ${coinStats.tieRounds} Tie` : ''
    }`}
    subtext={`across ${roundsCount} rounds`}
  />
</div>

<style>
  .analytics-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
</style>
