<script lang="ts">
  import { rollState } from './rollState.svelte';

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
</script>

<aside class="history-panel" aria-labelledby="history-heading">
  <div class="history-header">
    <h2 id="history-heading" class="history-title">Completed Series History</h2>
    {#if rollState.history.length > 0}
      <button
        type="button"
        class="clear-btn"
        onclick={() => rollState.clearHistory()}
        aria-label="Clear all completed series history"
      >
        Clear History
      </button>
    {/if}
  </div>

  {#if rollState.history.length === 0}
    <p class="empty-history">
      No completed series yet. Complete a series to save records to local storage.
    </p>
  {:else}
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
  {/if}
</aside>

<style>
  .history-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
  }

  .history-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f3f4f6;
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

  .history-list-wrapper {
    max-block-size: 280px;
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
