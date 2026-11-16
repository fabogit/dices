<script lang="ts">
  import type { AppMode, RoundResult } from '../../core/types';

  interface Props {
    mode: AppMode;
    contextLost: boolean;
    isRolling: boolean;
    isComplete: boolean;
    instantMode: boolean;
    roundsCount: number;
    seriesLength: number;
    roll: RoundResult | null;
    rollFaces: number;
  }

  const {
    mode,
    contextLost,
    isRolling,
    isComplete,
    instantMode,
    roundsCount,
    seriesLength,
    roll,
    rollFaces,
  }: Props = $props();
</script>

<!-- WebGL Context Loss Banner -->
{#if contextLost}
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
      {#if mode === 'quick'}
        <span class="status-dot green"></span>
        <span>Quick Roll (Free)</span>
      {:else if isComplete}
        <span class="status-dot green"></span>
        <span>Series Complete ({roundsCount}/{seriesLength})</span>
      {:else if roundsCount === 0}
        <span class="status-dot gray"></span>
        <span>Ready to Roll</span>
      {:else}
        <span class="status-dot blue"></span>
        <span>Round {roundsCount} of {seriesLength}</span>
      {/if}
    </div>

    {#if instantMode}
      <div class="hud-pill instant-badge">⚡ Fast Roll (No Anim)</div>
    {/if}
  </div>

  <!-- Latest Values Banner at Bottom of Viewport -->
  <!-- Hidden while dice are in the air so the previous result never sits under a new throw -->
  {#if roll && !isRolling}
    <div class="hud-bottom">
      <div class="results-hud-card">
        <span class="results-title">
          {mode === 'quick' ? 'Quick Roll:' : `Round #${roll.roundIndex + 1}:`}
        </span>

        <div class="hud-values-row">
          {#each roll.values as val, idx (idx)}
            {#if rollFaces === 2}
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

        {#if rollFaces !== 2 && roll.values.length > 1}
          <span class="hud-sum-badge">
            Sum: <strong>{roll.sum}</strong>
          </span>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
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
</style>
