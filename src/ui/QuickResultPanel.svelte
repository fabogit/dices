<script lang="ts">
  import { rollState } from './rollState.svelte';

  let isCollapsed = $state(false);

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
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
      aria-label="{isCollapsed ? 'Expand' : 'Collapse'} Quick Roll Feed"
    >
      <span class="chevron">{isCollapsed ? '▸' : '▾'}</span>
      <span>{isCollapsed ? 'Show' : 'Hide'}</span>
    </button>
  </div>

  <div class="panel-body" class:collapsed={isCollapsed}>
    <!-- Prominent Latest Quick Result Hero Card -->
    {#if rollState.latestQuickRoll}
      {@const latest = rollState.latestQuickRoll}
      <div class="latest-hero-card" role="region" aria-label="Latest Quick Roll Result">
        <div class="hero-top-row">
          <span class="hero-instrument">
            {rollState.faces === 2 ? 'Coin d2' : `d${rollState.faces}`}
            × {latest.values.length}
          </span>
          <span class="hero-time">{formatTime(latest.timestamp)}</span>
        </div>

        {#if rollState.faces === 2}
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

            <div class="coin-counts-row">
              <span>Heads: <strong>{latest.headsCount ?? 0}</strong></span>
              <span>•</span>
              <span>Tails: <strong>{latest.tailsCount ?? 0}</strong></span>
            </div>
          </div>
        {:else}
          <div class="dice-hero-display">
            <div class="sum-display-block">
              <span class="sum-label">TOTAL SUM</span>
              <span class="sum-big-number">{latest.sum}</span>
            </div>

            <div class="dice-chips-row">
              {#each latest.values as val, idx (idx)}
                <span class="die-value-chip">{val}</span>
              {/each}
            </div>

            {#if latest.values.length > 1}
              <div class="dice-sub-stats">
                <span>High: <strong>{latest.max}</strong></span>
                <span>•</span>
                <span>Low: <strong>{latest.min}</strong></span>
                <span>•</span>
                <span>Avg: <strong>{(latest.sum / latest.values.length).toFixed(1)}</strong></span>
              </div>
            {/if}
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
              <li class="feed-item">
                <div class="feed-item-left">
                  <span class="feed-index">#{rollState.quickRolls.length - idx}</span>
                  <div class="feed-values">
                    {#if rollState.faces === 2}
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
                  {#if rollState.faces === 2}
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

  .collapse-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    min-block-size: 28px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.375rem;
    color: #9ca3af;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .collapse-toggle-btn:hover {
    background: #374151;
    color: #f3f4f6;
  }

  .chevron {
    font-size: 0.85rem;
    color: #38bdf8;
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
    gap: 0.75rem;
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

  .dice-sub-stats {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .dice-sub-stats strong {
    color: #e5e7eb;
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

  .coin-counts-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #9ca3af;
  }

  .coin-counts-row strong {
    color: #f3f4f6;
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
    gap: 0.6rem;
  }

  .feed-index {
    font-size: 0.72rem;
    font-weight: 700;
    color: #6b7280;
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
    color: #6b7280;
  }

  button:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
  }
</style>
