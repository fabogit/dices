<script lang="ts">
  import type { RoundResult } from '../../core/types';
  import { dieLabel, formatTime } from '../../lib/format';
  import CoinPills from '../primitives/CoinPills.svelte';

  interface Props {
    items: ReadonlyArray<RoundResult>;
    isRolling: boolean;
    onClear: () => void;
  }

  let { items, isRolling, onClear }: Props = $props();
</script>

<!-- Session Feed History -->
<div class="session-feed-section">
  <div class="feed-header">
    <span class="feed-title">Recent Throws</span>
    <button
      type="button"
      class="clear-feed-btn"
      disabled={isRolling}
      onclick={onClear}
      aria-label="Clear quick roll feed"
    >
      Clear
    </button>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="feed-scroll-wrapper" tabindex="0" role="region" aria-label="Recent quick rolls feed">
    <ul class="feed-list" role="list">
      {#each items as item (item.id)}
        <li class="feed-item">
          <div class="feed-item-left">
            <span class="feed-index">#{item.roundIndex + 1}</span>
            <span
              class="feed-die-badge"
              data-testid="feed-die-badge"
              class:coin-die={item.kind === 'coin'}
            >
              {dieLabel(item.faces, 'short')}
            </span>
            <div class="feed-values">
              {#if item.kind === 'coin'}
                <CoinPills values={item.values} itemTestId="mini-coin" />
              {:else}
                <span class="dice-values-string" data-testid="dice-values"
                  >{item.values.join(', ')}</span
                >
              {/if}
            </div>
          </div>

          <div class="feed-item-right">
            {#if item.kind === 'coin'}
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

<style>
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

  .clear-feed-btn:hover:not(:disabled) {
    color: var(--color-danger);
    border-color: var(--color-danger-bold);
  }

  .clear-feed-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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
