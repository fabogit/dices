<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    hint?: string;
    disabled?: boolean;
    decreaseAriaLabel: string;
    increaseAriaLabel: string;
    onChange: (next: number) => void;
    beforeSlider?: Snippet;
    afterSlider?: Snippet;
  }

  let {
    id,
    label,
    value,
    min,
    max,
    step = 1,
    hint,
    disabled = false,
    decreaseAriaLabel,
    increaseAriaLabel,
    onChange,
    beforeSlider,
    afterSlider,
  }: Props = $props();
</script>

<div class="field-group">
  <div class="field-label-row">
    <label for={id} class="field-label">
      {label}
      <strong class="count-value">{value}</strong>
    </label>
    {#if hint}
      <span class="field-hint">{hint}</span>
    {/if}
  </div>

  {#if beforeSlider}
    {@render beforeSlider()}
  {/if}

  <div class="slider-controls">
    <button
      type="button"
      class="stepper-btn"
      aria-label={decreaseAriaLabel}
      disabled={value <= min || disabled}
      onclick={() => onChange(Math.max(min, value - step))}
    >
      −
    </button>
    <input
      {id}
      type="range"
      {min}
      {max}
      {step}
      {value}
      {disabled}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      oninput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
      class="range-slider"
    />
    <button
      type="button"
      class="stepper-btn"
      aria-label={increaseAriaLabel}
      disabled={value >= max || disabled}
      onclick={() => onChange(Math.min(max, value + step))}
    >
      +
    </button>
  </div>

  {#if afterSlider}
    {@render afterSlider()}
  {/if}
</div>

<style>
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
    color: var(--text-body);
  }

  .field-hint {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .count-value {
    color: var(--accent-blue);
    margin-left: 0.25rem;
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
    background: var(--surface-hover);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-heading);
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
  }

  .stepper-btn:hover:not(:disabled) {
    background: var(--border-muted);
  }

  .range-slider {
    flex: 1;
    min-block-size: 24px;
    accent-color: var(--accent-blue);
    cursor: pointer;
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
