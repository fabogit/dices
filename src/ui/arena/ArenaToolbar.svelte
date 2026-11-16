<script lang="ts">
  import type { AppMode } from '../../core/types';

  interface Props {
    mode: AppMode;
    faces: number;
    countPerRoll: number;
    isRolling: boolean;
    isAutoRolling: boolean;
    isComplete: boolean;
    instantMode: boolean;
    quickRollsCount: number;
    roundsCount: number;
    seriesLength: number;
    onQuickRoll: () => void;
    onClearQuickRolls: () => void;
    onRollRound: () => void;
    onAutoRoll: () => void;
    onStopAutoRoll: () => void;
    onResetSeries: () => void;
    onSkipAnimation: () => void;
  }

  const {
    mode,
    faces,
    countPerRoll,
    isRolling,
    isAutoRolling,
    isComplete,
    instantMode,
    quickRollsCount,
    roundsCount,
    seriesLength,
    onQuickRoll,
    onClearQuickRolls,
    onRollRound,
    onAutoRoll,
    onStopAutoRoll,
    onResetSeries,
    onSkipAnimation,
  }: Props = $props();
</script>

<!-- Attached Roll Control Toolbar (Issue #9) -->
<div class="arena-toolbar" role="toolbar" aria-label="Roll controls">
  {#if mode === 'quick'}
    <button type="button" class="action-btn primary-btn" disabled={isRolling} onclick={onQuickRoll}>
      {#if faces === 2}
        🪙 Flip {countPerRoll === 1 ? 'Coin' : `${countPerRoll} Coins`}
      {:else}
        🎲 Roll {countPerRoll}d{faces}
      {/if}
    </button>

    <button
      type="button"
      class="action-btn secondary-btn btn-clear-quick"
      disabled={isRolling || quickRollsCount === 0}
      onclick={onClearQuickRolls}
      aria-label="Clear quick roll feed"
    >
      ↺ Clear Feed
    </button>
  {:else}
    <button
      type="button"
      class="action-btn primary-btn"
      disabled={isRolling || isComplete}
      onclick={onRollRound}
    >
      {#if isComplete}
        Series Complete ({roundsCount}/{seriesLength})
      {:else}
        Roll Round ({roundsCount + 1}/{seriesLength})
      {/if}
    </button>

    <button
      type="button"
      class="action-btn secondary-btn"
      class:auto-active={isAutoRolling}
      disabled={(isRolling && !isAutoRolling) || isComplete}
      onclick={() => {
        if (isAutoRolling) {
          onStopAutoRoll();
        } else {
          onAutoRoll();
        }
      }}
    >
      {isAutoRolling ? '⏹ Stop Auto-Roll' : `⚡ Auto-Roll Series (${seriesLength})`}
    </button>

    <button
      type="button"
      class="action-btn secondary-btn btn-reset-series"
      disabled={isRolling}
      onclick={onResetSeries}
    >
      ↺ Reset
    </button>
  {/if}

  {#if isRolling && !instantMode}
    <button type="button" class="action-btn btn-skip" onclick={onSkipAnimation}>
      ⏩ Skip Animation
    </button>
  {/if}
</div>

<style>
  /* Attached Roll Toolbar */
  .arena-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.75rem;
    background: rgba(17, 24, 39, 0.85);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 40px;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    font-weight: 700;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .primary-btn {
    flex: 2;
    min-inline-size: 130px;
    background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-blue-dark) 100%);
    border: 1px solid var(--accent-blue);
    color: var(--text-white);
    box-shadow: 0 4px 12px rgba(3, 105, 161, 0.35);
  }

  .primary-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary-blue-dark) 0%, #0c4a6e 100%);
  }

  .secondary-btn {
    flex: 1;
    min-inline-size: 90px;
    background: var(--surface-slate);
    border: 1px solid var(--border-slate);
    color: var(--text-bright);
  }

  .secondary-btn:hover:not(:disabled) {
    background: #334155;
  }

  .secondary-btn.auto-active {
    background: #be123c;
    border-color: #f43f5e;
    color: var(--text-white);
    animation: pulse 1.5s infinite;
  }

  .btn-skip {
    background: transparent;
    border: 1px solid var(--color-yellow-600);
    color: var(--color-gold);
    padding: 0.5rem 0.75rem;
  }

  .btn-skip:hover:not(:disabled) {
    background: rgba(202, 138, 4, 0.15);
  }

  .btn-clear-quick,
  .btn-reset-series {
    flex: 0 1 auto;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
