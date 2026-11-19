<script lang="ts">
  import { getCoinSplitPercentages } from '../../core/series-analytics';
  import type { CoinSeriesSummary } from '../../core/types';

  interface Props {
    summary: CoinSeriesSummary;
    isComplete: boolean;
  }

  let { summary, isComplete }: Props = $props();

  const { headsPct, tailsPct } = $derived(getCoinSplitPercentages(summary));
</script>

<div class="coin-summary-cards">
  <div class="score-card heads-card">
    <div class="card-icon" aria-hidden="true">👑</div>
    <div class="card-content">
      <span class="card-label">HEADS</span>
      <span class="card-metric">
        {summary.headsRoundsWon}
        <small>rounds won</small>
      </span>
      <div class="card-sub-row">
        <span class="sub-stat-pct" data-testid="heads-pct">{headsPct.toFixed(1)}%</span>
        <span class="sub-stat-sep">•</span>
        <span class="sub-stat">{summary.totalHeads} coins</span>
      </div>
    </div>
  </div>

  <div class="score-card tails-card">
    <div class="card-icon" aria-hidden="true">🛡️</div>
    <div class="card-content">
      <span class="card-label">TAILS</span>
      <span class="card-metric">
        {summary.tailsRoundsWon}
        <small>rounds won</small>
      </span>
      <div class="card-sub-row">
        <span class="sub-stat-pct" data-testid="tails-pct">{tailsPct.toFixed(1)}%</span>
        <span class="sub-stat-sep">•</span>
        <span class="sub-stat">{summary.totalTails} coins</span>
      </div>
    </div>
  </div>
</div>

{#if isComplete}
  <div class="winner-banner" role="status">
    {#if summary.coinSeriesWinner === 'TIE'}
      <span class="winner-tie">⚖️ Coin Series Ended in a Tie!</span>
    {:else}
      <span class="winner-crown">
        🏆 {summary.coinSeriesWinner} Wins the Series!
      </span>
    {/if}
  </div>
{/if}

<style>
  .coin-summary-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .score-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }

  .heads-card {
    background: var(--color-yellow-500-a10);
    border-color: var(--color-yellow-500-a30);
  }

  .tails-card {
    background: var(--color-slate-400-a10);
    border-color: var(--color-slate-400-a30);
  }

  .card-icon {
    font-size: 1.75rem;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .card-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .card-metric {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .card-metric small {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-left: 0.25rem;
  }

  .card-sub-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
  }

  .sub-stat-pct {
    font-weight: 700;
    color: var(--text-heading);
  }

  .sub-stat-sep {
    color: var(--text-secondary);
  }

  .sub-stat {
    color: var(--text-secondary);
  }

  .winner-banner {
    padding: 0.65rem;
    background: var(--color-slate-800-a90);
    border: 1px solid var(--accent-blue);
    border-radius: 0.5rem;
    text-align: center;
    font-weight: 700;
  }

  .winner-crown {
    color: var(--color-gold-light);
  }

  .winner-tie {
    color: var(--text-muted);
  }
</style>
