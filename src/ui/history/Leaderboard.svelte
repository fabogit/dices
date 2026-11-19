<script lang="ts">
  import type { PlayerLeaderboardEntry } from '../../core/types';

  interface Props {
    entries: ReadonlyArray<PlayerLeaderboardEntry>;
  }

  const { entries }: Props = $props();
</script>

<!-- Player Leaderboard / Comparison (Issue #7 & #12) -->
<div class="leaderboard-section">
  <div class="leaderboard-header">
    <h3 class="leaderboard-title">Player Leaderboard & Luck Index</h3>
    <span class="leaderboard-sub">Normalized across all dice domains (100% = fair baseline)</span>
  </div>

  <ul class="leaderboard-grid" role="list" aria-label="Player leaderboard">
    {#each entries as player (player.playerId)}
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

<style>
  /* Leaderboard Section */
  .leaderboard-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-gray-600-a35);
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
    background: var(--color-amber-500-a20);
    color: var(--color-amber);
    border: 1px solid var(--color-amber-500-a40);
  }

  .luck-badge.luck-cold {
    background: var(--color-sky-400-a15);
    color: var(--accent-blue);
    border: 1px solid var(--color-sky-400-a30);
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
</style>
