<script lang="ts">
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import RangeStepper from '../primitives/RangeStepper.svelte';
  import { COUNT_PER_ROLL_LIMITS, SERIES_LENGTH_LIMITS } from '../../core/limits';
  import { getRollState } from '../state/rollStateContext';
  import FaceSelector from './FaceSelector.svelte';

  const rollState = getRollState();

  const PRESETS: Array<{ label: string; length: number }> = [
    { label: 'Single (1)', length: 1 },
    { label: 'Bo3 (3)', length: 3 },
    { label: 'Bo5 (5)', length: 5 },
  ];

  let isCollapsed = $state(false);

  // Setup is frozen while dice are in the air and while a series is under way
  const controlsDisabled = $derived(rollState.isRolling || rollState.isConfigLocked);

  // The numeric input is one-way (value={...}): when the setter clamps to the value already in
  // state, Svelte sees no change and never rewrites the DOM, so we re-sync explicitly after every
  // change. Empty input is ignored (field snaps back to the current value, not silently set to 1).
  function commitCustomLength(e: Event & { currentTarget: HTMLInputElement }): void {
    const input = e.currentTarget;
    const raw = input.value.trim();
    if (raw !== '') rollState.setSeriesLength(Number(raw));
    input.value = String(rollState.seriesLength);
  }
</script>

<CollapsiblePanel
  title="Dice & Series Setup"
  collapsed={isCollapsed}
  onToggle={() => (isCollapsed = !isCollapsed)}
  variant="control"
>
  {#if rollState.isConfigLocked}
    <p class="lock-hint" role="note">Series in progress. Reset the series to change the setup.</p>
  {/if}

  <FaceSelector
    selectedFaces={rollState.faces}
    disabled={controlsDisabled}
    onSelect={(faces) => rollState.setFaces(faces)}
  />

  <!-- Quantity Per Throw (M) -->
  <RangeStepper
    id="count-slider"
    label="Quantity Per Roll (M):"
    value={rollState.countPerRoll}
    min={COUNT_PER_ROLL_LIMITS.min}
    max={COUNT_PER_ROLL_LIMITS.max}
    hint="{COUNT_PER_ROLL_LIMITS.min} to {COUNT_PER_ROLL_LIMITS.max} {rollState.faces === 2
      ? 'coins'
      : 'dice'}"
    disabled={controlsDisabled}
    decreaseAriaLabel="Decrease quantity"
    increaseAriaLabel="Increase quantity"
    onChange={(val) => rollState.setCountPerRoll(val)}
  />

  <!-- Series Length (K) - Shown only in Series mode -->
  {#if rollState.mode === 'series'}
    <RangeStepper
      id="series-length-slider"
      label="Series Rounds (K):"
      value={rollState.seriesLength}
      min={SERIES_LENGTH_LIMITS.min}
      max={SERIES_LENGTH_LIMITS.max}
      hint="{SERIES_LENGTH_LIMITS.min} to {SERIES_LENGTH_LIMITS.max} rounds"
      disabled={controlsDisabled}
      decreaseAriaLabel="Decrease series rounds"
      increaseAriaLabel="Increase series rounds"
      onChange={(val) => rollState.setSeriesLength(val)}
    >
      {#snippet beforeSlider()}
        <!-- Presets -->
        <div class="preset-buttons" role="group" aria-label="Series length presets">
          {#each PRESETS as preset (preset.length)}
            <button
              type="button"
              class="preset-btn"
              class:active={rollState.seriesLength === preset.length}
              disabled={controlsDisabled}
              onclick={() => rollState.setSeriesLength(preset.length)}
            >
              {preset.label}
            </button>
          {/each}
        </div>
      {/snippet}

      {#snippet afterSlider()}
        <div class="stepper-row">
          <label for="series-length-input" class="sr-only"
            >Custom series length ({SERIES_LENGTH_LIMITS.min} to {SERIES_LENGTH_LIMITS.max})</label
          >
          <input
            id="series-length-input"
            type="number"
            min={SERIES_LENGTH_LIMITS.min}
            max={SERIES_LENGTH_LIMITS.max}
            value={rollState.seriesLength}
            disabled={controlsDisabled}
            onchange={commitCustomLength}
            class="numeric-input"
          />
          <span class="unit-text"
            >rounds (custom {SERIES_LENGTH_LIMITS.min}..{SERIES_LENGTH_LIMITS.max})</span
          >
        </div>
      {/snippet}
    </RangeStepper>
  {/if}
</CollapsiblePanel>

<style>
  .lock-hint {
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-subtle);
    border-radius: 0.5rem;
    background: var(--surface-elevated);
    color: var(--text-light);
    font-size: 0.8rem;
    line-height: 1.4;
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
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .preset-btn:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text-body);
  }

  .preset-btn.active {
    background: var(--primary-blue);
    border-color: var(--accent-blue);
    color: var(--text-white);
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
    background: var(--surface-dark);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .unit-text {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }

  button:disabled,
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
