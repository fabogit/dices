<script lang="ts">
  import { rollState } from './rollState.svelte';
  import { computeQuickRollSessionStats, computeQuickRollStats } from '../core/engine';
  import { dieLabel, formatSigned, formatTime } from '../lib/format';
  import CoinPills from './primitives/CoinPills.svelte';
  import CollapsiblePanel from './primitives/CollapsiblePanel.svelte';
  import DeltaBadge from './primitives/DeltaBadge.svelte';
  import EmptyState from './primitives/EmptyState.svelte';

  let isCollapsed = $state(false);

  const sessionStats = $derived(
    computeQuickRollSessionStats(rollState.quickRolls, rollState.faces),
  );
</script>

<CollapsiblePanel
  title="Quick Roll Feed"
  collapsed={isCollapsed}
  onToggle={() => (isCollapsed = !isCollapsed)}
  variant="quick"
>
  {#snippet badge()}
    <span class="count-badge">{rollState.quickRollCount} in session</span>
  {/snippet}

  <!-- Prominent Latest Quick Result Hero Card -->
  {#if rollState.latestQuickRoll}
    {@const latest = rollState.latestQuickRoll}
    {@const heroFaces = latest.faces}
    {@const stats = computeQuickRollStats(latest)}
    <div class="latest-hero-card" role="region" aria-label="Latest Quick Roll Result">
      <div class="hero-top-row">
        <span class="hero-instrument">
          {dieLabel(heroFaces)}
          × {latest.values.length}
        </span>
        <span class="hero-time">{formatTime(latest.timestamp)}</span>
      </div>

      {#if heroFaces === 2}
        {@const headsPct = stats.headsPercentage ?? 0}
        {@const tailsPct = stats.tailsPercentage ?? 0}
        <!-- Coin d2 Hero Display -->
        <div class="coin-hero-display">
          <div class="coin-winner-title">
            {#if latest.roundWinnerSide === 'TIE'}
              <span class="winner-tie">⚖️ Tied Result</span>
            {:else}
              <span class="winner-side">🏆 {latest.roundWinnerSide} Wins</span>
            {/if}
          </div>

          <div class="coin-chips-row">
            {#each latest.values as v, idx (idx)}
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
            <span class="sum-big-number" data-testid="hero-sum">{latest.sum}</span>
          </div>

          <div class="dice-chips-row">
            {#each latest.values as val, idx (idx)}
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
            {#if latest.values.length > 1}
              <span class="stat-bullet">•</span>
              <span>High: <strong>{latest.max}</strong></span>
              <span class="stat-bullet">•</span>
              <span>Low: <strong>{latest.min}</strong></span>
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
  {:else}
    <EmptyState variant="card" icon="🎲" title="Ready to Roll">
      Click <strong>Roll</strong> in the 3D Arena below the viewport for continuous instant rolls.
    </EmptyState>
  {/if}

  <!-- Active Die Session Summary Strip (Issue #12) -->
  {#if sessionStats.matchingThrows >= 2}
    <div class="session-summary-strip" role="group" aria-label="Session summary for active die">
      <div class="session-strip-header">
        <span class="session-strip-title">
          Session Summary ({dieLabel(rollState.faces)})
        </span>
        <span class="session-strip-count">
          {sessionStats.matchingThrows} throws • {sessionStats.totalDiceCount}
          {rollState.faces === 2 ? 'coins' : 'dice'}
        </span>
      </div>

      <div class="session-strip-metrics">
        {#if rollState.faces === 2}
          <span class="session-pill pill-heads">
            {sessionStats.headsPercentage?.toFixed(1)}% Heads ({sessionStats.totalHeads})
          </span>
          <span class="session-pill pill-tails">
            {sessionStats.tailsPercentage?.toFixed(1)}% Tails ({sessionStats.totalTails})
          </span>
          <span class="session-pill pill-verdict">
            {sessionStats.balanceVerdict}
          </span>
        {:else}
          <span class="session-pill pill-avg">
            Die Avg: {sessionStats.actualAverage?.toFixed(2)}
          </span>
          <DeltaBadge
            tone={(sessionStats.averageDelta ?? 0) >= 0 ? 'positive' : 'negative'}
            text="{formatSigned(sessionStats.averageDelta ?? 0, 2)} Δ"
            variant="pill"
          />
          {#if (sessionStats.criticalMaxCount ?? 0) > 0}
            <span class="session-pill pill-crit">
              {sessionStats.criticalMaxCount}x crit ({rollState.faces})
            </span>
          {/if}
          {#if (sessionStats.criticalMinCount ?? 0) > 0}
            <span class="session-pill pill-min">
              {sessionStats.criticalMinCount}x nat 1
            </span>
          {/if}
        {/if}
      </div>

      <p class="session-strip-insight">{sessionStats.insight}</p>
    </div>
  {/if}

  <!-- Session Feed History -->
  {#if rollState.quickRolls.length > 0}
    <div class="session-feed-section">
      <div class="feed-header">
        <span class="feed-title">Recent Throws</span>
        <button
          type="button"
          class="clear-feed-btn"
          onclick={() => rollState.clearQuickRolls()}
          aria-label="Clear quick roll feed"
        >
          Clear
        </button>
      </div>

      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="feed-scroll-wrapper"
        tabindex="0"
        role="region"
        aria-label="Recent quick rolls feed"
      >
        <ul class="feed-list" role="list">
          {#each rollState.quickRolls as item (item.id)}
            {@const itemFaces = item.faces}
            <li class="feed-item">
              <div class="feed-item-left">
                <span class="feed-index">#{item.roundIndex + 1}</span>
                <span
                  class="feed-die-badge"
                  data-testid="feed-die-badge"
                  class:coin-die={itemFaces === 2}
                >
                  {dieLabel(itemFaces, 'short')}
                </span>
                <div class="feed-values">
                  {#if itemFaces === 2}
                    <CoinPills values={item.values} itemTestId="mini-coin" />
                  {:else}
                    <span class="dice-values-string" data-testid="dice-values"
                      >{item.values.join(', ')}</span
                    >
                  {/if}
                </div>
              </div>

              <div class="feed-item-right">
                {#if itemFaces === 2}
                  <span
                    class="feed-outcome"
                    data-testid="feed-outcome"
                    class:tie={item.roundWinnerSide === 'TIE'}
                  >
                    {item.roundWinnerSide}
                  </span>
                {:else}
                  <strong class="feed-sum">{item.sum}</strong>
                {/if}
                <span class="feed-time">{formatTime(item.timestamp)}</span>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</CollapsiblePanel>

<style>
  .count-badge {
    padding: 0.2rem 0.5rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    font-size: 0.72rem;
    color: var(--text-secondary);
  }

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
    background: rgba(234, 179, 8, 0.15);
    color: var(--color-gold-light);
    border: 1px solid rgba(234, 179, 8, 0.3);
  }

  .pill-tails {
    background: rgba(148, 163, 184, 0.15);
    color: var(--text-soft);
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .pill-verdict {
    background: rgba(56, 189, 248, 0.15);
    color: var(--accent-blue);
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .pill-avg {
    background: var(--surface-elevated);
    color: var(--text-body);
    border: 1px solid var(--border-subtle);
  }

  .pill-crit {
    background: rgba(234, 179, 8, 0.15);
    color: var(--color-gold);
    border: 1px solid rgba(234, 179, 8, 0.3);
  }

  .pill-min {
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-danger);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .session-strip-insight {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.35;
  }

  /* Session Feed List */
  .session-feed-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .feed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .feed-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-light);
  }

  .clear-feed-btn {
    padding: 0.2rem 0.5rem;
    min-block-size: 24px;
    background: transparent;
    border: 1px solid var(--border-muted);
    border-radius: 0.25rem;
    font-size: 0.72rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .clear-feed-btn:hover {
    color: var(--color-danger);
    border-color: var(--color-danger-bold);
  }

  .feed-scroll-wrapper {
    max-block-size: 260px;
    overflow-y: auto;
    border-radius: 0.5rem;
    border: 1px solid var(--border-subtle);
    background: var(--surface-dark);
  }

  .feed-scroll-wrapper:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 1px;
  }

  .feed-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .feed-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(55, 65, 81, 0.4);
    font-size: 0.825rem;
  }

  .feed-item:last-child {
    border-bottom: none;
  }

  .feed-item-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .feed-index {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .feed-die-badge {
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    font-size: 0.68rem;
    font-weight: 700;
    background: var(--surface-elevated);
    border: 1px solid var(--border-muted);
    color: var(--accent-blue);
  }

  .feed-die-badge.coin-die {
    border-color: var(--color-yellow-600);
    color: var(--color-gold);
  }

  .dice-values-string {
    font-weight: 600;
    color: var(--text-heading);
  }

  .feed-item-right {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .feed-sum {
    font-size: 0.95rem;
    color: var(--accent-blue);
  }

  .feed-outcome {
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(56, 189, 248, 0.2);
    color: var(--accent-blue);
  }

  .feed-outcome.tie {
    background: rgba(156, 163, 175, 0.2);
    color: var(--text-secondary);
  }

  .feed-time {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
