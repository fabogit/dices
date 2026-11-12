<script lang="ts">
  import { rollState } from './rollState.svelte';

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  const leaderboard = $derived(rollState.leaderboard);
  let isCollapsed = $state(false);
</script>

<aside class="history-panel" aria-labelledby="history-heading">
  <div class="history-header">
    <h2 id="history-heading" class="history-title">History & Leaderboard</h2>
    <div class="header-action-group">
      {#if rollState.history.length > 0}
        <button
          type="button"
          class="clear-btn"
          onclick={() => rollState.clearHistory()}
          aria-label="Clear all completed series history"
        >
          Clear
        </button>
      {/if}
      <button
        type="button"
        class="collapse-toggle-btn"
        aria-expanded={!isCollapsed}
        onclick={() => (isCollapsed = !isCollapsed)}
        aria-label="{isCollapsed ? 'Expand' : 'Collapse'} History & Leaderboard"
      >
        <span class="chevron">{isCollapsed ? '▸' : '▾'}</span>
        <span>{isCollapsed ? 'Show' : 'Hide'}</span>
      </button>
    </div>
  </div>

  <div class="history-body" class:collapsed={isCollapsed}>
  {#if rollState.history.length === 0}
    <p class="empty-history">
      No completed series yet. Complete a series to save records to local storage.
    </p>
  {:else}
    <!-- Player Leaderboard / Comparison (Issue #7) -->
    <div class="leaderboard-section">
      <div class="leaderboard-header">
        <h3 class="leaderboard-title">Player Leaderboard & Luck Index</h3>
        <span class="leaderboard-sub">Normalized across all dice domains</span>
      </div>

      <div class="leaderboard-grid">
        {#each leaderboard as player (player.playerId)}
          <div class="player-card">
            <div class="player-header-row">
              <div class="player-identity">
                <span class="player-dot" style:background-color={player.color}></span>
                <strong class="player-name">{player.playerName}</strong>
              </div>
              <span
                class="luck-badge"
                class:luck-hot={player.normalizedLuckScore >= 100}
                class:luck-cold={player.normalizedLuckScore < 100}
                title="Ratio of actual round averages to mathematical expectation"
              >
                {player.normalizedLuckScore >= 100 ? '🔥' : '❄️'} {player.normalizedLuckScore.toFixed(1)}%
              </span>
            </div>

            <div class="player-metrics-row">
              <div class="metric-mini">
                <span class="mini-label">Series</span>
                <span class="mini-val">{player.seriesPlayed}</span>
              </div>
              <div class="metric-mini">
                <span class="mini-label">Total Dice</span>
                <span class="mini-val">{player.totalRolls}</span>
              </div>
              <div class="metric-mini">
                <span class="mini-label">Crit Max</span>
                <span class="mini-val highlight-crit">{player.criticalMaxRate.toFixed(1)}%</span>
              </div>
              {#if player.coinSeriesWon > 0}
                <div class="metric-mini">
                  <span class="mini-label">Coins Won</span>
                  <span class="mini-val highlight-gold">{player.coinSeriesWon}</span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Chronological Past Series Log -->
    <div class="series-log-section">
      <h3 class="log-title">Past Completed Series</h3>

      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="history-list-wrapper"
        tabindex="0"
        role="region"
        aria-label="Scrollable list of past series"
      >
        <ul class="history-list" role="list">
          {#each rollState.history as item (item.id)}
            <li class="history-item">
              <div class="history-meta">
                <span class="player-tag">
                  {item.playerName}
                </span>
                <span class="timestamp-tag">{formatTime(item.completedAt)}</span>
              </div>

              <div class="series-config-desc">
                <strong>
                  {item.config.faces === 2 ? 'Coin d2' : `d${item.config.faces}`}
                </strong>
                <span>
                  × {item.config.countPerRoll} {item.config.countPerRoll === 1 ? 'die' : 'dice'}
                </span>
                <span class="rounds-tag">
                  ({item.rounds.length} {item.rounds.length === 1 ? 'round' : 'rounds'})
                </span>
              </div>

              <div class="history-outcome">
                {#if item.config.faces === 2}
                  <span class="coin-outcome">
                    {#if item.coinSeriesWinner === 'TIE'}
                      Outcome: <em>Tie</em> ({item.headsRoundsWon}H / {item.tailsRoundsWon}T)
                    {:else}
                      Winner: <strong class="winner-name">{item.coinSeriesWinner}</strong> ({item.headsRoundsWon}H / {item.tailsRoundsWon}T)
                    {/if}
                  </span>
                {:else}
                  <div class="dice-outcome">
                    <span>Sum: <strong>{item.totalSum}</strong></span>
                    <span>Avg: <strong>{item.average.toFixed(1)}</strong></span>
                    <span>Best: <strong>#{item.bestRoundIndex + 1}</strong></span>
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
  </div>
</aside>

<style>
  .history-panel {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 1.25rem;
    background: rgba(17, 24, 39, 0.75);
    border: 1px solid rgba(75, 85, 99, 0.4);
    border-radius: 0.75rem;
    backdrop-filter: blur(8px);
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .history-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f3f4f6;
  }

  .header-action-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
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

  .history-body {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .history-body.collapsed {
    display: none;
  }

  .clear-btn {
    padding: 0.25rem 0.5rem;
    min-block-size: 28px;
    background: transparent;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: #9ca3af;
    cursor: pointer;
  }

  .clear-btn:hover {
    background: #1f2937;
    color: #f87171;
    border-color: #ef4444;
  }

  .empty-history {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
    font-style: italic;
    padding: 0.75rem 0;
  }

  /* Leaderboard Section */
  .leaderboard-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(75, 85, 99, 0.35);
  }

  .leaderboard-header {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .leaderboard-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #f3f4f6;
  }

  .leaderboard-sub {
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .leaderboard-grid {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .player-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.5rem 0.65rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 0.5rem;
  }

  .player-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .player-identity {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .player-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .player-name {
    font-size: 0.85rem;
    color: #f3f4f6;
  }

  .luck-badge {
    padding: 0.15rem 0.4rem;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .luck-badge.luck-hot {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .luck-badge.luck-cold {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .player-metrics-row {
    display: flex;
    gap: 0.75rem;
    font-size: 0.72rem;
  }

  .metric-mini {
    display: flex;
    flex-direction: column;
  }

  .mini-label {
    color: #6b7280;
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .mini-val {
    font-weight: 700;
    color: #e5e7eb;
  }

  .highlight-crit {
    color: #facc15;
  }

  .highlight-gold {
    color: #fde047;
  }

  /* Series Log Section */
  .series-log-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .log-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #d1d5db;
  }

  .history-list-wrapper {
    max-block-size: 240px;
    overflow-y: auto;
    border-radius: 0.5rem;
  }

  .history-list-wrapper:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 1px;
  }

  .history-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .history-item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.65rem 0.75rem;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    font-size: 0.825rem;
  }

  .history-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .player-tag {
    font-weight: 700;
    color: #38bdf8;
  }

  .timestamp-tag {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .series-config-desc {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    color: #d1d5db;
  }

  .rounds-tag {
    color: #9ca3af;
    font-size: 0.75rem;
  }

  .history-outcome {
    font-size: 0.8rem;
    color: #9ca3af;
    border-top: 1px solid rgba(75, 85, 99, 0.4);
    padding-top: 0.35rem;
  }

  .coin-outcome {
    color: #e5e7eb;
  }

  .winner-name {
    color: #fde047;
  }

  .dice-outcome {
    display: flex;
    gap: 0.75rem;
  }

  .dice-outcome strong {
    color: #f3f4f6;
  }

  button:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
  }
</style>
