<script lang="ts">
  import { onMount } from 'svelte';
  import type { DiceArena3D } from '../three/DiceArena3D';
  import { rollState } from './rollState.svelte';

  let canvasElement: HTMLCanvasElement;
  let arena: DiceArena3D | null = null;
  let isCollapsed = $state(false);

  const currentRoll = $derived(
    rollState.mode === 'quick' ? rollState.latestQuickRoll : rollState.latestRound,
  );

  onMount(() => {
    let destroyed = false;
    let resizeObserver: ResizeObserver | null = null;
    const resizeTarget = canvasElement.parentElement ?? canvasElement;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const hasVisibleSize = entries.some(
          (entry) => entry.contentRect.width > 0 && entry.contentRect.height > 0,
        );
        if (hasVisibleSize) {
          arena?.render();
        }
      });
      resizeObserver.observe(resizeTarget);
    }

    void (async () => {
      try {
        const { DiceArena3D: ArenaClass } = await import('../three/DiceArena3D');
        if (destroyed || !canvasElement) return;
        arena = new ArenaClass(canvasElement, {
          onContextLost: () => {
            rollState.setContextLost(true);
          },
          onContextRestored: () => {
            rollState.setContextLost(false);
          },
        });
        rollState.setArena(arena);
      } catch (err) {
        console.error('Failed to load 3D Dice Arena:', err);
      }
    })();

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (arena) {
        arena.dispose();
        rollState.setArena(null);
        arena = null;
      }
    };
  });

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }
</script>

<section class="arena-section" aria-labelledby="arena-heading">
  <div class="section-header">
    <h2 id="arena-heading" class="section-title">3D Dice Arena</h2>
    <button
      type="button"
      class="collapse-toggle-btn"
      aria-expanded={!isCollapsed}
      onclick={toggleCollapse}
      aria-label="{isCollapsed ? 'Show Arena' : 'Hide Arena'} for 3D Dice"
    >
      <span class="chevron" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
      <span>{isCollapsed ? 'Show Arena' : 'Hide Arena'}</span>
    </button>
  </div>

  <div class="arena-body" class:collapsed={isCollapsed}>
    <div class="arena-viewport" role="region" aria-label="3D Dice Arena Viewport">
      <canvas bind:this={canvasElement} class="three-canvas" data-testid="dice-canvas"></canvas>

      <!-- WebGL Context Loss Banner -->
      {#if rollState.contextLost}
        <div class="context-loss-overlay" role="alert">
          <div class="context-loss-card">
            <span class="warning-icon" aria-hidden="true">⚠️</span>
            <div>
              <h3>WebGL Context Suspended</h3>
              <p>Graphics context was lost. The browser will automatically restore it shortly.</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Overlay HUD -->
      <div class="hud-overlay" aria-hidden="true">
        <div class="hud-top">
          <div class="hud-pill round-badge">
            {#if rollState.mode === 'quick'}
              <span class="status-dot green"></span>
              <span>Quick Roll (Free)</span>
            {:else if rollState.isComplete}
              <span class="status-dot green"></span>
              <span>Series Complete ({rollState.rounds.length}/{rollState.seriesLength})</span>
            {:else if rollState.rounds.length === 0}
              <span class="status-dot gray"></span>
              <span>Ready to Roll</span>
            {:else}
              <span class="status-dot blue"></span>
              <span>Round {rollState.rounds.length} of {rollState.seriesLength}</span>
            {/if}
          </div>

          {#if rollState.instantMode}
            <div class="hud-pill instant-badge">⚡ Fast Roll (No Anim)</div>
          {/if}
        </div>

        <!-- Latest Values Banner at Bottom of Viewport -->
        {#if currentRoll}
          <div class="hud-bottom">
            <div class="results-hud-card">
              <span class="results-title">
                {rollState.mode === 'quick'
                  ? 'Quick Roll:'
                  : `Round #${currentRoll.roundIndex + 1}:`}
              </span>

              <div class="hud-values-row">
                {#each currentRoll.values as val, idx (idx)}
                  {#if rollState.faces === 2}
                    <span
                      class="hud-value-badge coin"
                      class:heads={val === 1}
                      class:tails={val === 2}
                    >
                      {val === 1 ? 'HEADS' : 'TAILS'}
                    </span>
                  {:else}
                    <span class="hud-value-badge die">
                      {val}
                    </span>
                  {/if}
                {/each}
              </div>

              {#if rollState.faces !== 2 && currentRoll.values.length > 1}
                <span class="hud-sum-badge">
                  Sum: <strong>{currentRoll.sum}</strong>
                </span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Attached Roll Control Toolbar (Issue #9) -->
    <div class="arena-toolbar" role="toolbar" aria-label="Roll controls">
      {#if rollState.mode === 'quick'}
        <button
          type="button"
          class="action-btn primary-btn"
          disabled={rollState.isRolling}
          onclick={() => rollState.executeQuickRoll()}
        >
          {#if rollState.faces === 2}
            🪙 Flip {rollState.countPerRoll === 1 ? 'Coin' : `${rollState.countPerRoll} Coins`}
          {:else}
            🎲 Roll {rollState.countPerRoll}d{rollState.faces}
          {/if}
        </button>

        <button
          type="button"
          class="action-btn secondary-btn btn-clear-quick"
          disabled={rollState.isRolling || rollState.quickRolls.length === 0}
          onclick={() => rollState.clearQuickRolls()}
          aria-label="Clear quick roll feed"
        >
          ↺ Clear Feed
        </button>
      {:else}
        <button
          type="button"
          class="action-btn primary-btn"
          disabled={rollState.isRolling || rollState.isComplete}
          onclick={() => rollState.rollNextRound()}
        >
          {#if rollState.isComplete}
            Series Complete ({rollState.rounds.length}/{rollState.seriesLength})
          {:else}
            Roll Round ({rollState.rounds.length + 1}/{rollState.seriesLength})
          {/if}
        </button>

        <button
          type="button"
          class="action-btn secondary-btn"
          class:auto-active={rollState.isAutoRolling}
          disabled={(rollState.isRolling && !rollState.isAutoRolling) || rollState.isComplete}
          onclick={() => {
            if (rollState.isAutoRolling) {
              rollState.stopAutoRoll();
            } else {
              rollState.autoRollSeries();
            }
          }}
        >
          {rollState.isAutoRolling
            ? '⏹ Stop Auto-Roll'
            : `⚡ Auto-Roll Series (${rollState.seriesLength})`}
        </button>

        <button
          type="button"
          class="action-btn secondary-btn btn-reset-series"
          disabled={rollState.isRolling}
          onclick={() => rollState.resetCurrentSeries()}
        >
          ↺ Reset
        </button>
      {/if}

      {#if rollState.isRolling && !rollState.instantMode}
        <button type="button" class="action-btn btn-skip" onclick={() => rollState.skipAnimation()}>
          ⏩ Skip Animation
        </button>
      {/if}
    </div>
  </div>
</section>

<style>
  .arena-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .arena-body {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .arena-body.collapsed {
    display: none;
  }

  .arena-viewport {
    position: relative;
    width: 100%;
    height: 400px;
    max-height: 400px;
    background: radial-gradient(
      circle at center,
      var(--surface-dark) 0%,
      var(--surface-deepest) 100%
    );
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  @media (max-width: 860px) {
    .arena-viewport {
      height: 220px;
      min-height: 220px;
      max-height: 220px;
    }
  }

  .three-canvas {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    display: block;
    outline: none;
  }

  .context-loss-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(3, 7, 18, 0.85);
    backdrop-filter: blur(4px);
    z-index: 20;
    padding: 1.5rem;
  }

  .context-loss-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--surface-elevated);
    border: 1px solid var(--color-danger-bold);
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    color: var(--text-heading);
    max-width: 440px;
  }

  .context-loss-card h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    color: var(--color-danger);
  }

  .context-loss-card p {
    margin: 0;
    font-size: 0.825rem;
    color: var(--text-secondary);
  }

  .warning-icon {
    font-size: 1.75rem;
  }

  .hud-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1rem;
  }

  .hud-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hud-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    background: rgba(17, 24, 39, 0.8);
    border: 1px solid rgba(156, 163, 175, 0.25);
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-body);
    backdrop-filter: blur(4px);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.green {
    background: var(--color-emerald-500);
  }
  .status-dot.blue {
    background: var(--accent-blue);
  }
  .status-dot.gray {
    background: var(--border-dashed);
  }

  .instant-badge {
    background: rgba(124, 58, 237, 0.25);
    border-color: var(--accent-violet);
    color: #c4b5fd;
  }

  .hud-bottom {
    display: flex;
    justify-content: center;
  }

  .results-hud-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: rgba(17, 24, 39, 0.85);
    border: 1px solid rgba(156, 163, 175, 0.3);
    border-radius: 0.5rem;
    backdrop-filter: blur(6px);
  }

  .results-title {
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .hud-values-row {
    display: flex;
    gap: 0.4rem;
  }

  .hud-value-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .hud-value-badge.die {
    background: var(--surface-slate);
    border: 1px solid var(--border-slate);
    color: var(--accent-blue);
  }

  .hud-value-badge.coin.heads {
    background: rgba(234, 179, 8, 0.25);
    border: 1px solid var(--color-yellow-500);
    color: var(--color-gold-pale);
  }

  .hud-value-badge.coin.tails {
    background: rgba(148, 163, 184, 0.25);
    border: 1px solid var(--text-muted);
    color: var(--text-bright);
  }

  .hud-sum-badge {
    font-size: 0.825rem;
    color: var(--text-light);
    border-left: 1px solid var(--border-muted);
    padding-left: 0.75rem;
  }

  .hud-sum-badge strong {
    color: var(--accent-blue);
  }

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
