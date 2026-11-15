<script lang="ts">
  import { getCoinSplitPercentages } from '../core/engine';
  import { dieLabel, formatTime } from '../lib/format';
  import CollapsiblePanel from './primitives/CollapsiblePanel.svelte';
  import EmptyState from './primitives/EmptyState.svelte';
  import { rollState } from './rollState.svelte';

  const leaderboard = $derived(rollState.leaderboard);
  let isCollapsed = $state(false);
</script>

<CollapsiblePanel
  as="aside"
  variant="history"
  headingId="history-heading"
  title="History & Leaderboard"
  collapsed={isCollapsed}
  onToggle={() => (isCollapsed = !isCollapsed)}
>
  {#snippet actions()}
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
  {/snippet}

  {#if rollState.history.length === 0}
    <EmptyState
      variant="inline"
      message="No completed series yet. Complete a series to save records to local storage."
    />
  {:else}
    <!-- Player Leaderboard / Comparison (Issue #7 & #12) -->
    <div class="leaderboard-section">
      <div class="leaderboard-header">
        <h3 class="leaderboard-title">Player Leaderboard & Luck Index</h3>
        <span class="leaderboard-sub"
          >Normalized across all dice domains (100% = fair baseline)</span
        >
      </div>

      <ul class="leaderboard-grid" role="list" aria-label="Player leaderboard">
        {#each leaderboard as player (player.playerId)}
          <li class="player-card">
            <div class="player-header-row">
              <div class="player-identity">
                <span class="player-dot" style:background-color={player.color}></span>
                <strong class="player-name" data-testid="player-name">{player.playerName}</strong>
              </div>
              <span
                class="luck-badge"
                class:luck-hot={player.normalizedLuckScore >= 100}
                class:luck-cold={player.normalizedLuckScore < 100}
                role="img"
                aria-label="Luck Index: {player.normalizedLuckScore.toFixed(
                  1,
                )}% (100% is fair baseline; for coins, 50% Heads is 100%)"
                title="Normalized Luck Index: {player.normalizedLuckScore.toFixed(
                  1,
                )}% (100% is fair baseline; for coins, 50% Heads = 100%)"
              >
                {player.normalizedLuckScore >= 100 ? '🔥' : '❄️'}
                {player.normalizedLuckScore.toFixed(1)}%
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
                  <span class="mini-val highlight-gold" data-testid="coin-series-won"
                    >{player.coinSeriesWon}</span
                  >
                </div>
              {/if}
              {#if player.coinHeadsRate !== undefined}
                <div class="metric-mini">
                  <span class="mini-label">Heads Rate</span>
                  <span class="mini-val highlight-gold">{player.coinHeadsRate.toFixed(1)}%</span>
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
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
                  {dieLabel(item.config.faces)}
                </strong>
                <span>
                  × {item.config.countPerRoll}
                  {item.config.countPerRoll === 1 ? 'die' : 'dice'}
                </span>
                <span class="rounds-tag">
                  ({item.rounds.length}
                  {item.rounds.length === 1 ? 'round' : 'rounds'})
                </span>
              </div>

              <div class="history-outcome">
                {#if item.config.faces === 2}
                  {@const coinSplit = getCoinSplitPercentages(item)}
                  <div class="coin-outcome-block">
                    <span class="coin-outcome">
                      {#if item.coinSeriesWinner === 'TIE'}
                        Outcome: <em>Tie</em> ({item.headsRoundsWon}H / {item.tailsRoundsWon}T
                        rounds)
                      {:else}
                        Winner: <strong class="winner-name">{item.coinSeriesWinner}</strong>
                        ({item.headsRoundsWon}H / {item.tailsRoundsWon}T rounds)
                      {/if}
                    </span>
                    <span class="coin-history-pct" data-testid="history-coin-pct">
                      {coinSplit.headsPct.toFixed(1)}% Heads / {coinSplit.tailsPct.toFixed(1)}%
                      Tails ({coinSplit.headsCount}H / {coinSplit.tailsCount}T coins)
                    </span>
                  </div>
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
</CollapsiblePanel>

<style>
  .clear-btn {
    padding: 0.25rem 0.5rem;
    min-block-size: 28px;
    background: transparent;
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .clear-btn:hover {
    background: var(--surface-elevated);
    color: var(--color-danger);
    border-color: var(--color-danger-bold);
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
    color: var(--text-heading);
  }

  .leaderboard-sub {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .leaderboard-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .player-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.5rem 0.65rem;
    background: var(--surface-dark);
    border: 1px solid var(--border-subtle);
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
    color: var(--text-heading);
  }

  .luck-badge {
    padding: 0.15rem 0.4rem;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .luck-badge.luck-hot {
    background: rgba(245, 158, 11, 0.2);
    color: var(--color-amber);
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .luck-badge.luck-cold {
    background: rgba(56, 189, 248, 0.15);
    color: var(--accent-blue);
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .player-metrics-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.72rem;
  }

  .metric-mini {
    display: flex;
    flex-direction: column;
  }

  .mini-label {
    color: var(--text-secondary);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .mini-val {
    font-weight: 700;
    color: var(--text-body);
  }

  .highlight-crit {
    color: var(--color-gold);
  }

  .highlight-gold {
    color: var(--color-gold-light);
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
    color: var(--text-light);
  }

  .history-list-wrapper {
    max-block-size: 240px;
    overflow-y: auto;
    border-radius: 0.5rem;
  }

  .history-list-wrapper:focus-visible {
    outline: 2px solid var(--accent-blue);
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
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
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
    color: var(--accent-blue);
  }

  .timestamp-tag {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .series-config-desc {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    color: var(--text-light);
  }

  .rounds-tag {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .history-outcome {
    font-size: 0.8rem;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-color);
    padding-top: 0.35rem;
  }

  .coin-outcome-block {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .coin-outcome {
    color: var(--text-body);
  }

  .coin-history-pct {
    font-size: 0.72rem;
    color: var(--text-soft);
  }

  .winner-name {
    color: var(--color-gold-light);
  }

  .dice-outcome {
    display: flex;
    gap: 0.75rem;
  }

  .dice-outcome strong {
    color: var(--text-heading);
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
