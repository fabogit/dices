<script lang="ts">
  import { ALLOWED_FACES, type DieFaces } from '../../core/types';
  import { DIE_THEMES } from '../../lib/dieThemes';
  import { dieLabel } from '../../lib/format';

  interface Props {
    selectedFaces: DieFaces;
    disabled: boolean;
    onSelect: (faces: DieFaces) => void;
  }

  const { selectedFaces, disabled, onSelect }: Props = $props();

  let buttons = $state<Array<HTMLButtonElement | undefined>>([]);

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;

    const currentIndex = ALLOWED_FACES.indexOf(selectedFaces);
    const startIndex = Math.max(currentIndex, 0);
    let nextIndex = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (startIndex + 1) % ALLOWED_FACES.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (startIndex - 1 + ALLOWED_FACES.length) % ALLOWED_FACES.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = ALLOWED_FACES.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const nextFace = ALLOWED_FACES[nextIndex];
      if (nextFace !== undefined) {
        onSelect(nextFace);
        buttons[nextIndex]?.focus();
      }
    }
  }
</script>

<!-- Instrument Selector -->
<fieldset class="field-group">
  <legend class="field-label">Choose Instrument</legend>
  <div class="faces-grid" role="radiogroup" aria-label="Die face selector">
    {#each ALLOWED_FACES as f, i (f)}
      {@const theme = DIE_THEMES[f]}
      {@const isSelected = selectedFaces === f}
      <button
        bind:this={buttons[i]}
        type="button"
        role="radio"
        aria-checked={isSelected}
        tabindex={isSelected ? 0 : -1}
        class="face-badge-button"
        class:selected={isSelected}
        style:--badge-accent={theme.accentColor}
        style:--badge-primary={theme.primaryColor}
        onkeydown={handleKeyDown}
        onclick={() => onSelect(f)}
        {disabled}
      >
        <span class="badge-dot" style:background-color={theme.accentColor}></span>
        <span class="badge-text">{dieLabel(f, 'parens')}</span>
      </button>
    {/each}
  </div>
</fieldset>

<style>
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

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
