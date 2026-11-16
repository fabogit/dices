<script lang="ts">
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import RangeStepper from '../primitives/RangeStepper.svelte';
  import { rollState } from '../state/rollState.svelte';
  import FaceSelector from './FaceSelector.svelte';

  const PRESETS: Array<{ label: string; length: number }> = [
    { label: 'Single (1)', length: 1 },
    { label: 'Bo3 (3)', length: 3 },
    { label: 'Bo5 (5)', length: 5 },
  ];

  let isCollapsed = $state(false);

  // Setup is frozen while dice are in the air and while a series is under way
  const controlsDisabled = $derived(rollState.isRolling || rollState.isConfigLocked);
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
    min={1}
    max={10}
    hint="1 to 10 {rollState.faces === 2 ? 'coins' : 'dice'}"
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
      min={1}
      max={21}
      hint="1 to 21 rounds"
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
          <label for="series-length-input" class="sr-only">Custom series length (1 to 21)</label>
          <input
            id="series-length-input"
            type="number"
            min="1"
            max="21"
            value={rollState.seriesLength}
            disabled={controlsDisabled}
            onchange={(e) =>
              rollState.setSeriesLength(Number((e.target as HTMLInputElement).value))}
            class="numeric-input"
          />
          <span class="unit-text">rounds (custom 1..21)</span>
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
