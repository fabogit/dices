<script lang="ts">
  import { ALLOWED_FACES, type DieFaces } from '../core/types';
  import { DIE_THEMES } from '../three/geometries';
  import { rollState } from './rollState.svelte';

  const PRESETS: Array<{ label: string; length: number }> = [
    { label: 'Single (1)', length: 1 },
    { label: 'Bo3 (3)', length: 3 },
    { label: 'Bo5 (5)', length: 5 },
    { label: 'Bo7 (7)', length: 7 },
  ];

  function getFaceLabel(f: DieFaces): string {
    return f === 2 ? 'Coin (d2)' : `d${f}`;
  }

  function handleRollClick() {
    rollState.rollNextRound();
  }

  function handleAutoRollClick() {
    if (rollState.isAutoRolling) {
      rollState.stopAutoRoll();
    } else {
      rollState.autoRollSeries();
    }
  }
</script>

<section class="control-panel" aria-labelledby="control-panel-heading">
  <h2 id="control-panel-heading" class="panel-heading">Dice & Series Setup</h2>

  <!-- Instrument Selector -->
  <fieldset class="field-group">
    <legend class="field-label">Choose Instrument</legend>
    <div class="faces-grid" role="radiogroup" aria-label="Die face selector">
      {#each ALLOWED_FACES as f (f)}
        {@const theme = DIE_THEMES[f]}
        {@const isSelected = rollState.faces === f}
        <button
          type="button"
          role="radio"
          aria-checked={isSelected}
          class="face-badge-button"
          class:selected={isSelected}
          style:--badge-accent={theme.accentColor}
          style:--badge-primary={theme.primaryColor}
          onclick={() => rollState.setFaces(f)}
          disabled={rollState.isRolling}
        >
          <span class="badge-dot" style:background-color={theme.accentColor}></span>
          <span class="badge-text">{getFaceLabel(f)}</span>
        </button>
      {/each}
    </div>
  </fieldset>

  <!-- Quantity Per Throw (M) -->
  <div class="field-group">
    <div class="field-label-row">
      <label for="count-slider" class="field-label">
        Quantity Per Roll (M):
        <strong class="count-value">{rollState.countPerRoll}</strong>
      </label>
      <span class="field-hint">1 to 10 {rollState.faces === 2 ? 'coins' : 'dice'}</span>
    </div>
    <div class="slider-controls">
      <button
        type="button"
        class="stepper-btn"
        aria-label="Decrease quantity"
        disabled={rollState.countPerRoll <= 1 || rollState.isRolling}
        onclick={() => rollState.setCountPerRoll(rollState.countPerRoll - 1)}
      >
        −
      </button>
      <input
        id="count-slider"
        type="range"
        min="1"
        max="10"
        step="1"
        value={rollState.countPerRoll}
        disabled={rollState.isRolling}
        aria-valuemin="1"
        aria-valuemax="10"
        aria-valuenow={rollState.countPerRoll}
        oninput={(e) => rollState.setCountPerRoll(Number((e.target as HTMLInputElement).value))}
        class="range-slider"
      />
      <button
        type="button"
        class="stepper-btn"
        aria-label="Increase quantity"
        disabled={rollState.countPerRoll >= 10 || rollState.isRolling}
        onclick={() => rollState.setCountPerRoll(rollState.countPerRoll + 1)}
      >
        +
      </button>
    </div>
  </div>

  <!-- Series Length (K) -->
  <div class="field-group">
    <div class="field-label-row">
      <label for="series-length-input" class="field-label">
        Series Rounds (K):
        <strong class="count-value">{rollState.seriesLength}</strong>
      </label>
      <span class="field-hint">1 to 21 rounds</span>
    </div>

    <!-- Presets -->
    <div class="preset-buttons" role="group" aria-label="Series length presets">
      {#each PRESETS as preset (preset.length)}
        <button
          type="button"
          class="preset-btn"
          class:active={rollState.seriesLength === preset.length}
          disabled={rollState.isRolling}
          onclick={() => rollState.setSeriesLength(preset.length)}
        >
          {preset.label}
        </button>
      {/each}
    </div>

    <div class="stepper-row">
      <label for="series-length-input" class="sr-only">Custom series length (1 to 21)</label>
      <input
        id="series-length-input"
        type="number"
        min="1"
        max="21"
        value={rollState.seriesLength}
        disabled={rollState.isRolling}
        onchange={(e) => rollState.setSeriesLength(Number((e.target as HTMLInputElement).value))}
        class="numeric-input"
      />
      <span class="unit-text">rounds</span>
    </div>
  </div>

  <!-- Primary Actions -->
  <div class="actions-group">
    <button
      type="button"
      class="action-btn primary-btn"
      disabled={rollState.isRolling || rollState.isComplete}
      onclick={handleRollClick}
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
      onclick={handleAutoRollClick}
    >
      {rollState.isAutoRolling ? '⏹ Stop Auto-Roll' : `⚡ Auto-Roll Series (${rollState.seriesLength})`}
    </button>

    <div class="secondary-actions-row">
      {#if rollState.isRolling && !rollState.instantMode}
        <button
          type="button"
          class="btn-skip"
          onclick={() => rollState.skipAnimation()}
        >
          ⏩ Skip Animation
        </button>
      {/if}

      <button
        type="button"
        class="btn-reset"
        disabled={rollState.isRolling}
        onclick={() => rollState.resetCurrentSeries()}
      >
        ↺ Reset Series
      </button>
    </div>
  </div>
</section>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem;
    background: rgba(17, 24, 39, 0.75);
    border: 1px solid rgba(75, 85, 99, 0.4);
    border-radius: 0.75rem;
    backdrop-filter: blur(8px);
  }

  .panel-heading {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f3f4f6;
    letter-spacing: -0.01em;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: none;
    padding: 0;
    margin: 0;
  }

  .field-label-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #e5e7eb;
  }

  .field-hint {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .count-value {
    color: #38bdf8;
    margin-left: 0.25rem;
  }

  .faces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 0.5rem;
  }

  .face-badge-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.65rem;
    min-block-size: 38px;
    background: #1f2937;
    border: 1px solid rgba(156, 163, 175, 0.25);
    border-radius: 0.5rem;
    color: #d1d5db;
    font-size: 0.825rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .face-badge-button:hover:not(:disabled) {
    background: #374151;
    border-color: var(--badge-accent, #60a5fa);
    color: #ffffff;
  }

  .face-badge-button.selected {
    background: rgba(30, 41, 59, 0.9);
    border-color: var(--badge-accent, #38bdf8);
    box-shadow: 0 0 0 1px var(--badge-accent, #38bdf8);
    color: #ffffff;
  }

  .badge-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .slider-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stepper-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 32px;
    min-block-size: 32px;
    background: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    color: #f3f4f6;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
  }

  .stepper-btn:hover:not(:disabled) {
    background: #4b5563;
  }

  .range-slider {
    flex: 1;
    min-block-size: 24px;
    accent-color: #38bdf8;
    cursor: pointer;
  }

  .preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .preset-btn {
    flex: 1;
    min-inline-size: 68px;
    min-block-size: 32px;
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.375rem;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .preset-btn:hover:not(:disabled) {
    background: #374151;
    color: #e5e7eb;
  }

  .preset-btn.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
  }

  .stepper-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .numeric-input {
    width: 70px;
    min-block-size: 34px;
    padding: 0.35rem 0.5rem;
    background: #111827;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    color: #f9fafb;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .unit-text {
    font-size: 0.8rem;
    color: #9ca3af;
  }

  .actions-group {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: 0.5rem;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 44px;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    font-weight: 700;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .primary-btn {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    border: 1px solid #38bdf8;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
  }

  .primary-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
  }

  .secondary-btn {
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

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .secondary-actions-row {
    display: flex;
    gap: 0.5rem;
  }

  .btn-skip, .btn-reset {
    flex: 1;
    min-block-size: 34px;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    font-weight: 600;
    background: transparent;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    color: #9ca3af;
    cursor: pointer;
  }

  .btn-skip {
    color: #facc15;
    border-color: #ca8a04;
  }

  .btn-skip:hover:not(:disabled) {
    background: rgba(202, 138, 4, 0.15);
  }

  .btn-reset:hover:not(:disabled) {
    background: #1f2937;
    color: #f3f4f6;
  }

  button:focus-visible, input:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
  }

  button:disabled, input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
