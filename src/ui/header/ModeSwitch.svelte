<script lang="ts">
  import type { AppMode } from '../../core/types';

  interface Props {
    mode: AppMode;
    disabled: boolean;
    onSelect: (mode: AppMode) => void;
  }

  const { mode, disabled, onSelect }: Props = $props();
</script>

<!-- Mode Toggle (Quick Roll vs Series) -->
<div class="mode-switch-group" role="group" aria-label="Application mode">
  <button
    type="button"
    class="mode-btn"
    class:active={mode === 'quick'}
    aria-pressed={mode === 'quick'}
    {disabled}
    onclick={() => onSelect('quick')}
  >
    ⚡ Quick Roll
  </button>
  <button
    type="button"
    class="mode-btn"
    class:active={mode === 'series'}
    aria-pressed={mode === 'series'}
    {disabled}
    onclick={() => onSelect('series')}
  >
    📊 Series
  </button>
</div>

<style>
  .mode-switch-group {
    display: inline-flex;
    background: var(--surface-dark);
    border: 1px solid var(--border-subtle);
    border-radius: 0.5rem;
    padding: 2px;
  }

  .mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.75rem;
    min-block-size: 32px;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mode-btn:hover:not(.active):not(:disabled) {
    color: var(--text-primary);
  }

  .mode-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mode-btn.active {
    background: var(--primary-blue);
    color: var(--text-white);
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
