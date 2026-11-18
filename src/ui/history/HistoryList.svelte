<script lang="ts">
  import { getCoinSplitPercentages } from '../../core/series-analytics';
  import type { SeriesSummary } from '../../core/types';
  import { dieLabel, formatTime } from '../../lib/format';

  interface Props {
    items: ReadonlyArray<SeriesSummary>;
  }

  const { items }: Props = $props();
</script>

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
      {#each items as item (item.id)}
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
            {#if item.kind === 'coin'}
              {@const coinSplit = getCoinSplitPercentages(item)}
              <div class="coin-outcome-block">
                <span class="coin-outcome">
                  {#if item.coinSeriesWinner === 'TIE'}
                    Outcome: <em>Tie</em> ({item.headsRoundsWon}H / {item.tailsRoundsWon}T rounds)
                  {:else}
                    Winner: <strong class="winner-name">{item.coinSeriesWinner}</strong>
                    ({item.headsRoundsWon}H / {item.tailsRoundsWon}T rounds)
                  {/if}
                </span>
                <span class="coin-history-pct" data-testid="history-coin-pct">
                  {coinSplit.headsPct.toFixed(1)}% Heads / {coinSplit.tailsPct.toFixed(1)}% Tails ({coinSplit.headsCount}H
                  / {coinSplit.tailsCount}T coins)
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

<style>
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
</style>
