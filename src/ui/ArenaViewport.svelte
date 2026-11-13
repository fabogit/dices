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
      if (arena) {
        arena.dispose();
        rollState.setArena(null);
        arena = null;
      }
    };
  });

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (!isCollapsed && arena) {
      setTimeout(() => {
        arena?.render();
      }, 50);
    }
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
      <canvas bind:this={canvasElement} class="three-canvas"></canvas>

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
                {rollState.mode === 'quick' ? 'Quick Roll:' : `Round #${currentRoll.roundIndex + 1}:`}
              </span>

              <div class="hud-values-row">
                {#each currentRoll.values as val, idx (idx)}
                  {#if rollState.faces === 2}
                    <span class="hud-value-badge coin" class:heads={val === 1} class:tails={val === 2}>
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
          {rollState.isAutoRolling ? '⏹ Stop Auto-Roll' : `⚡ Auto-Roll Series (${rollState.seriesLength})`}
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
        <button
          type="button"
          class="action-btn btn-skip"
          onclick={() => rollState.skipAnimation()}
        >
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
    color: #f3f4f6;
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
    background: radial-gradient(circle at center, #111827 0%, #030712 100%);
    border: 1px solid rgba(75, 85, 99, 0.4);
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
    background: #1f2937;
    border: 1px solid #ef4444;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    color: #f3f4f6;
    max-width: 440px;
  }

  .context-loss-card h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    color: #f87171;
  }

  .context-loss-card p {
    margin: 0;
    font-size: 0.825rem;
    color: #9ca3af;
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
    color: #e5e7eb;
    backdrop-filter: blur(4px);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.green { background: #10b981; }
  .status-dot.blue { background: #38bdf8; }
  .status-dot.gray { background: #6b7280; }

  .instant-badge {
    background: rgba(124, 58, 237, 0.25);
    border-color: #a78bfa;
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
    color: #9ca3af;
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
    background: #1e293b;
    border: 1px solid #475569;
    color: #38bdf8;
  }

  .hud-value-badge.coin.heads {
    background: rgba(234, 179, 8, 0.25);
    border: 1px solid #eab308;
    color: #fef08a;
  }

  .hud-value-badge.coin.tails {
    background: rgba(148, 163, 184, 0.25);
    border: 1px solid #94a3b8;
    color: #f1f5f9;
  }

  .hud-sum-badge {
    font-size: 0.825rem;
    color: #d1d5db;
    border-left: 1px solid #4b5563;
    padding-left: 0.75rem;
  }

  .hud-sum-badge strong {
    color: #38bdf8;
  }

  /* Attached Roll Toolbar */
  .arena-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.75rem;
    background: rgba(17, 24, 39, 0.85);
    border: 1px solid rgba(75, 85, 99, 0.4);
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
    background: linear-gradient(135deg, var(--primary-blue, #0369a1) 0%, var(--primary-blue-dark, #075985) 100%);
    border: 1px solid #38bdf8;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(3, 105, 161, 0.35);
  }

  .primary-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #075985 0%, #0c4a6e 100%);
  }

  .secondary-btn {
    flex: 1;
    min-inline-size: 90px;
    background: #1e293b;
    border: 1px solid #475569;
    color: #f1f5f9;
  }

  .secondary-btn:hover:not(:disabled) {
    background: #334155;
  }

  .secondary-btn.auto-active {
    background: #be123c;
    border-color: #f43f5e;
    color: #ffffff;
    animation: pulse 1.5s infinite;
  }

  .btn-skip {
    background: transparent;
    border: 1px solid #ca8a04;
    color: #facc15;
    padding: 0.5rem 0.75rem;
  }

  .btn-skip:hover:not(:disabled) {
    background: rgba(202, 138, 4, 0.15);
  }

  .btn-clear-quick, .btn-reset-series {
    flex: 0 1 auto;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  button:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
