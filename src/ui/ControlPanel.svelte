<script lang="ts">
  import { ALLOWED_FACES } from '../core/types';
  import { DIE_THEMES } from '../lib/dieThemes';
  import { dieLabel } from '../lib/format';
  import { rollState } from './state/rollState.svelte';
  import CollapsiblePanel from './primitives/CollapsiblePanel.svelte';
  import RangeStepper from './primitives/RangeStepper.svelte';

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
          disabled={controlsDisabled}
        >
          <span class="badge-dot" style:background-color={theme.accentColor}></span>
          <span class="badge-text">{dieLabel(f, 'parens')}</span>
        </button>
      {/each}
    </div>
  </fieldset>

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

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: none;
    padding: 0;
    margin: 0;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-body);
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
    background: var(--surface-elevated);
    border: 1px solid rgba(156, 163, 175, 0.25);
    border-radius: 0.5rem;
    color: var(--text-light);
    font-size: 0.825rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .face-badge-button:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: var(--badge-accent, var(--accent-blue-soft));
    color: var(--text-white);
  }

  .face-badge-button.selected {
    background: rgba(30, 41, 59, 0.9);
    border-color: var(--badge-accent, var(--accent-blue));
    box-shadow: 0 0 0 1px var(--badge-accent, var(--accent-blue));
    color: var(--text-white);
  }

  .badge-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
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
