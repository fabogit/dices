<script lang="ts">
  import type { QuickRollStats, RoundResult } from '../../core/types';
  import { dieLabel, formatSigned, formatTime } from '../../lib/format';
  import DeltaBadge from '../primitives/DeltaBadge.svelte';

  interface Props {
    roll: RoundResult;
    stats: QuickRollStats;
  }

  let { roll, stats }: Props = $props();

  const heroFaces = $derived(roll.faces);
  const headsPct = $derived(stats.headsPercentage ?? 0);
  const tailsPct = $derived(stats.tailsPercentage ?? 0);
</script>

<div class="latest-hero-card" role="region" aria-label="Latest Quick Roll Result">
  <div class="hero-top-row">
    <span class="hero-instrument">
      {dieLabel(heroFaces)}
      × {roll.values.length}
    </span>
    <span class="hero-time">{formatTime(roll.timestamp)}</span>
  </div>

  {#if heroFaces === 2}
    <!-- Coin d2 Hero Display -->
    <div class="coin-hero-display">
      <div class="coin-winner-title">
        {#if roll.roundWinnerSide === 'TIE'}
          <span class="winner-tie">⚖️ Tied Result</span>
        {:else}
          <span class="winner-side">🏆 {roll.roundWinnerSide} Wins</span>
        {/if}
      </div>

      <div class="coin-chips-row">
        {#each roll.values as v, idx (idx)}
          <span class="coin-chip" class:heads={v === 1} class:tails={v === 2}>
            {v === 1 ? 'HEADS' : 'TAILS'}
          </span>
        {/each}
      </div>

      <!-- Proportional Coin Split Bar -->
      <div
        class="coin-bar-track"
        role="img"
        aria-label="Split: {headsPct.toFixed(0)}% Heads, {tailsPct.toFixed(0)}% Tails"
      >
        <div class="coin-bar-heads" style:width="{headsPct}%"></div>
        <div class="coin-bar-tails" style:width="{tailsPct}%"></div>
      </div>

      <div class="coin-counts-row">
        <span class="coin-count-stat heads-color">
          Heads: <strong>{stats.headsCount ?? 0}</strong> ({headsPct.toFixed(0)}%)
        </span>
        <span class="stat-bullet">•</span>
        <span class="coin-count-stat tails-color">
          Tails: <strong>{stats.tailsCount ?? 0}</strong> ({tailsPct.toFixed(0)}%)
        </span>
      </div>

      <p class="quick-insight-narrative" data-testid="quick-insight">{stats.insight}</p>
    </div>
  {:else}
    <!-- Polyhedral Dice Hero Display -->
    <div class="dice-hero-display">
      <div class="sum-display-block">
        <span class="sum-label">TOTAL SUM</span>
        <span class="sum-big-number" data-testid="hero-sum">{roll.sum}</span>
      </div>

      <div class="dice-chips-row">
        {#each roll.values as val, idx (idx)}
          <span
            class="die-value-chip"
            class:crit-max={val === heroFaces}
            class:crit-min={val === 1}
          >
            {val}
          </span>
        {/each}
      </div>

      <!-- Descriptive Metric Strip -->
      <div class="dice-sub-stats">
        <span>Expected: <strong>{stats.expectedSum?.toFixed(1)}</strong></span>
        <span class="stat-bullet">•</span>
        <DeltaBadge
          tone={(stats.sumDelta ?? 0) >= 0 ? 'positive' : 'negative'}
          prefix="Δ: "
          text={formatSigned(stats.sumDelta ?? 0)}
          variant="inline"
        />
        {#if roll.values.length > 1}
          <span class="stat-bullet">•</span>
          <span>High: <strong>{roll.max}</strong></span>
          <span class="stat-bullet">•</span>
          <span>Low: <strong>{roll.min}</strong></span>
        {/if}
        {#if (stats.criticalMaxCount ?? 0) > 0}
          <span class="stat-bullet">•</span>
          <span class="crit-highlight">{stats.criticalMaxCount}x crit ({heroFaces})</span>
        {/if}
        {#if (stats.criticalMinCount ?? 0) > 0}
          <span class="stat-bullet">•</span>
          <span class="min-highlight">{stats.criticalMinCount}x nat 1</span>
        {/if}
      </div>

      <p class="quick-insight-narrative" data-testid="quick-insight">{stats.insight}</p>
    </div>
  {/if}
</div>

<style>
  /* Latest Hero Card */
  .latest-hero-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    background: radial-gradient(
      circle at top right,
      var(--surface-slate) 0%,
      var(--surface-dark) 100%
    );
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 0.75rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .hero-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hero-instrument {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--accent-blue);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hero-time {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .dice-hero-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
  }

  .sum-display-block {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sum-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.1em;
  }

  .sum-big-number {
    font-size: 3rem;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(135deg, var(--text-white) 0%, var(--accent-blue) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .dice-chips-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
  }

  .die-value-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 32px;
    min-block-size: 32px;
    padding: 0.2rem 0.5rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .die-value-chip.crit-max {
    border-color: var(--color-gold);
    background: rgba(234, 179, 8, 0.2);
    color: var(--color-gold-pale);
  }

  .die-value-chip.crit-min {
    border-color: var(--color-danger-bold);
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-danger-light);
  }

  .dice-sub-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .dice-sub-stats strong {
    color: var(--text-body);
  }

  .stat-bullet {
    color: var(--border-muted);
  }

  .crit-highlight {
    color: var(--color-gold);
    font-weight: 600;
  }

  .min-highlight {
    color: var(--color-danger);
    font-weight: 600;
  }

  .quick-insight-narrative {
    margin: 0;
    font-size: 0.8rem;
    color: var(--accent-blue-pale);
    text-align: center;
    line-height: 1.4;
  }

  /* Coin Hero Display */
  .coin-hero-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
  }

  .coin-winner-title {
    font-size: 1.25rem;
    font-weight: 800;
  }

  .winner-side {
    color: var(--color-gold-light);
  }

  .winner-tie {
    color: var(--text-muted);
  }

  .coin-chips-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
  }

  .coin-chip {
    padding: 0.3rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .coin-chip.heads {
    background: rgba(234, 179, 8, 0.25);
    border: 1px solid var(--color-yellow-500);
    color: var(--color-gold-pale);
  }

  .coin-chip.tails {
    background: rgba(148, 163, 184, 0.25);
    border: 1px solid var(--text-muted);
    color: var(--text-bright);
  }

  .coin-bar-track {
    display: flex;
    width: 100%;
    max-width: 240px;
    height: 6px;
    background: var(--surface-elevated);
    border-radius: 9999px;
    overflow: hidden;
  }

  .coin-bar-heads {
    height: 100%;
    background: var(--color-yellow-500);
    transition: width 0.3s ease;
  }

  .coin-bar-tails {
    height: 100%;
    background: var(--text-muted);
    transition: width 0.3s ease;
  }

  .coin-counts-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .heads-color {
    color: var(--color-gold-light);
  }

  .tails-color {
    color: var(--text-soft);
  }
</style>
