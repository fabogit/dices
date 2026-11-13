<script lang="ts">
  import { rollState } from './rollState.svelte';
  import {
    computeQuickRollSessionStats,
    computeQuickRollStats,
  } from '../core/engine';

  let isCollapsed = $state(false);

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  const sessionStats = $derived(
    computeQuickRollSessionStats(rollState.quickRolls, rollState.faces),
  );
</script>

<section class="quick-result-panel" aria-labelledby="quick-result-heading">
  <div class="panel-header">
    <div class="title-with-badge">
      <h2 id="quick-result-heading" class="panel-title">Quick Roll Feed</h2>
      <span class="count-badge">{rollState.quickRolls.length} in session</span>
    </div>

    <button
      type="button"
      class="collapse-toggle-btn"
      aria-expanded={!isCollapsed}
      onclick={() => (isCollapsed = !isCollapsed)}
      aria-label="{isCollapsed ? 'Show' : 'Hide'} Quick Roll Feed"
    >
      <span class="chevron" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
      <span>{isCollapsed ? 'Show' : 'Hide'}</span>
    </button>
  </div>

  <div class="panel-body" class:collapsed={isCollapsed}>
    <!-- Prominent Latest Quick Result Hero Card -->
    {#if rollState.latestQuickRoll}
      {@const latest = rollState.latestQuickRoll}
      {@const heroFaces = latest.faces ?? rollState.faces}
      {@const stats = computeQuickRollStats(latest, heroFaces)}
      <div class="latest-hero-card" role="region" aria-label="Latest Quick Roll Result">
        <div class="hero-top-row">
          <span class="hero-instrument">
            {heroFaces === 2 ? 'Coin d2' : `d${heroFaces}`}
            × {latest.values.length}
          </span>
          <span class="hero-time">{formatTime(latest.timestamp)}</span>
        </div>

        {#if heroFaces === 2}
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
            <div class="coin-bar-track" role="img" aria-label="Split: {stats.headsPercentage?.toFixed(0)}% Heads, {stats.tailsPercentage?.toFixed(0)}% Tails">
              <div
                class="coin-bar-heads"
                style:width="{stats.headsPercentage ?? 0}%"
              ></div>
              <div
                class="coin-bar-tails"
                style:width="{stats.tailsPercentage ?? 0}%"
              ></div>
            </div>

            <div class="coin-counts-row">
              <span class="coin-count-stat heads-color">
                Heads: <strong>{stats.headsCount ?? 0}</strong> ({stats.headsPercentage?.toFixed(0)}%)
              </span>
              <span class="stat-bullet">•</span>
              <span class="coin-count-stat tails-color">
                Tails: <strong>{stats.tailsCount ?? 0}</strong> ({stats.tailsPercentage?.toFixed(0)}%)
              </span>
            </div>

            <p class="quick-insight-narrative">{stats.insight}</p>
          </div>
        {:else}
          <!-- Polyhedral Dice Hero Display -->
          <div class="dice-hero-display">
            <div class="sum-display-block">
              <span class="sum-label">TOTAL SUM</span>
              <span class="sum-big-number">{latest.sum}</span>
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
              <span
                class="delta-indicator"
                class:pos={(stats.sumDelta ?? 0) >= 0}
                class:neg={(stats.sumDelta ?? 0) < 0}
              >
                Δ: <strong>{(stats.sumDelta ?? 0) >= 0 ? '+' : ''}{stats.sumDelta?.toFixed(1)}</strong>
              </span>
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

            <p class="quick-insight-narrative">{stats.insight}</p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-quick-state">
        <span class="empty-icon" aria-hidden="true">🎲</span>
        <p class="empty-title">Ready to Roll</p>
        <p class="empty-desc">
          Click <strong>Roll</strong> in the 3D Arena below the viewport for continuous instant rolls.
        </p>
      </div>
    {/if}

    <!-- Active Die Session Summary Strip (Issue #12) -->
    {#if sessionStats.matchingThrows >= 2}
      <div class="session-summary-strip" role="group" aria-label="Session summary for active die">
        <div class="session-strip-header">
          <span class="session-strip-title">
            Session Summary ({rollState.faces === 2 ? 'Coin d2' : `d${rollState.faces}`})
          </span>
          <span class="session-strip-count">
            {sessionStats.matchingThrows} throws • {sessionStats.totalDiceCount} {rollState.faces === 2 ? 'coins' : 'dice'}
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
            <span
              class="session-pill pill-delta"
              class:pos={(sessionStats.averageDelta ?? 0) >= 0}
              class:neg={(sessionStats.averageDelta ?? 0) < 0}
            >
              {(sessionStats.averageDelta ?? 0) >= 0 ? '+' : ''}{sessionStats.averageDelta?.toFixed(2)} Δ
            </span>
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
            {#each rollState.quickRolls as item, idx (item.timestamp + '-' + idx)}
              {@const itemFaces = item.faces ?? rollState.faces}
              <li class="feed-item">
                <div class="feed-item-left">
                  <span class="feed-index">#{rollState.quickRolls.length - idx}</span>
                  <span
                    class="feed-die-badge"
                    class:coin-die={itemFaces === 2}
                  >
                    {itemFaces === 2 ? 'Coin' : `d${itemFaces}`}
                  </span>
                  <div class="feed-values">
                    {#if itemFaces === 2}
                      {#each item.values as v, i (i)}
                        <span class="mini-coin" class:heads={v === 1} class:tails={v === 2}>
                          {v === 1 ? 'H' : 'T'}
                        </span>
                      {/each}
                    {:else}
                      <span class="dice-values-string">{item.values.join(', ')}</span>
                    {/if}
                  </div>
                </div>

                <div class="feed-item-right">
                  {#if itemFaces === 2}
                    <span class="feed-outcome" class:tie={item.roundWinnerSide === 'TIE'}>
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
  </div>
</section>

<style>
  .quick-result-panel {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 1.25rem;
    background: rgba(17, 24, 39, 0.75);
    border: 1px solid rgba(75, 85, 99, 0.4);
    border-radius: 0.75rem;
    backdrop-filter: blur(8px);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-with-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f3f4f6;
  }

  .count-badge {
    padding: 0.2rem 0.5rem;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 9999px;
    font-size: 0.72rem;
    color: #9ca3af;
  }

  .panel-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel-body.collapsed {
    display: none;
  }

  /* Latest Hero Card */
  .latest-hero-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    background: radial-gradient(circle at top right, #1e293b 0%, #111827 100%);
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
    color: #38bdf8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hero-time {
    font-size: 0.75rem;
    color: #9ca3af;
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
    color: #9ca3af;
    letter-spacing: 0.1em;
  }

  .sum-big-number {
    font-size: 3rem;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(135deg, #ffffff 0%, #38bdf8 100%);
    -webkit-background-clip: text;
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
    background: #1f2937;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    font-size: 1rem;
    font-weight: 700;
    color: #f3f4f6;
  }

  .die-value-chip.crit-max {
    border-color: #facc15;
    background: rgba(234, 179, 8, 0.2);
    color: #fef08a;
  }

  .die-value-chip.crit-min {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }

  .dice-sub-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .dice-sub-stats strong {
    color: #e5e7eb;
  }

  .delta-indicator.pos strong {
    color: #34d399;
  }

  .delta-indicator.neg strong {
    color: #f87171;
  }

  .stat-bullet {
    color: #4b5563;
  }

  .crit-highlight {
    color: #facc15;
    font-weight: 600;
  }

  .min-highlight {
    color: #f87171;
    font-weight: 600;
  }

  .quick-insight-narrative {
    margin: 0;
    font-size: 0.8rem;
    color: #93c5fd;
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
    color: #fde047;
  }

  .winner-tie {
    color: #94a3b8;
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
    border: 1px solid #eab308;
    color: #fef08a;
  }

  .coin-chip.tails {
    background: rgba(148, 163, 184, 0.25);
    border: 1px solid #94a3b8;
    color: #f1f5f9;
  }

  .coin-bar-track {
    display: flex;
    width: 100%;
    max-width: 240px;
    height: 6px;
    background: #1f2937;
    border-radius: 9999px;
    overflow: hidden;
  }

  .coin-bar-heads {
    height: 100%;
    background: #eab308;
    transition: width 0.3s ease;
  }

  .coin-bar-tails {
    height: 100%;
    background: #94a3b8;
    transition: width 0.3s ease;
  }

  .coin-counts-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .heads-color {
    color: #fde047;
  }

  .tails-color {
    color: #cbd5e1;
  }

  /* Session Summary Strip */
  .session-summary-strip {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.65rem 0.75rem;
    background: #111827;
    border: 1px solid #374151;
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
    color: #38bdf8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .session-strip-count {
    color: #9ca3af;
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
    color: #fde047;
    border: 1px solid rgba(234, 179, 8, 0.3);
  }

  .pill-tails {
    background: rgba(148, 163, 184, 0.15);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .pill-verdict {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .pill-avg {
    background: #1f2937;
    color: #e5e7eb;
    border: 1px solid #374151;
  }

  .pill-delta {
    background: #1f2937;
    border: 1px solid #374151;
  }

  .pill-delta.pos {
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.4);
  }

  .pill-delta.neg {
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.4);
  }

  .pill-crit {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
    border: 1px solid rgba(234, 179, 8, 0.3);
  }

  .pill-min {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .session-strip-insight {
    margin: 0;
    font-size: 0.75rem;
    color: #9ca3af;
    line-height: 1.35;
  }

  /* Empty State */
  .empty-quick-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem 1rem;
    background: #111827;
    border: 1px dashed #374151;
    border-radius: 0.5rem;
  }

  .empty-icon {
    font-size: 2.25rem;
    margin-bottom: 0.5rem;
  }

  .empty-title {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 700;
    color: #e5e7eb;
  }

  .empty-desc {
    margin: 0;
    font-size: 0.8rem;
    color: #9ca3af;
    max-width: 260px;
  }

  .empty-desc strong {
    color: #38bdf8;
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
    color: #d1d5db;
  }

  .clear-feed-btn {
    padding: 0.2rem 0.5rem;
    min-block-size: 24px;
    background: transparent;
    border: 1px solid #4b5563;
    border-radius: 0.25rem;
    font-size: 0.72rem;
    color: #9ca3af;
    cursor: pointer;
  }

  .clear-feed-btn:hover {
    color: #f87171;
    border-color: #ef4444;
  }

  .feed-scroll-wrapper {
    max-block-size: 260px;
    overflow-y: auto;
    border-radius: 0.5rem;
    border: 1px solid #374151;
    background: #111827;
  }

  .feed-scroll-wrapper:focus-visible {
    outline: 2px solid #38bdf8;
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
    color: var(--text-secondary, #9ca3af);
  }

  .feed-die-badge {
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    font-size: 0.68rem;
    font-weight: 700;
    background: #1f2937;
    border: 1px solid #4b5563;
    color: #38bdf8;
  }

  .feed-die-badge.coin-die {
    border-color: #ca8a04;
    color: #facc15;
  }

  .mini-coin {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 0.65rem;
    font-weight: 800;
    margin-right: 2px;
  }

  .mini-coin.heads {
    background: #eab308;
    color: #422006;
  }

  .mini-coin.tails {
    background: #94a3b8;
    color: #0f172a;
  }

  .dice-values-string {
    font-weight: 600;
    color: #f3f4f6;
  }

  .feed-item-right {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .feed-sum {
    font-size: 0.95rem;
    color: #38bdf8;
  }

  .feed-outcome {
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
  }

  .feed-outcome.tie {
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
  }

  .feed-time {
    font-size: 0.7rem;
    color: var(--text-secondary, #9ca3af);
  }

  button:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
  }
</style>
