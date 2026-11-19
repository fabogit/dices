<script lang="ts">
  interface Props {
    active: boolean;
    onToggle: () => void;
  }

  const { active, onToggle }: Props = $props();
</script>

<!-- Instant Fast Roll Toggle -->
<button
  type="button"
  class="instant-toggle-btn"
  class:active
  aria-pressed={active}
  onclick={onToggle}
  title="Toggle instant roll mode without 3D kinematic tumble"
>
  <span class="toggle-icon">⚡</span>
  <span>{active ? 'Fast: ON' : 'Fast: OFF'}</span>
</button>

<style>
  .instant-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    min-block-size: 32px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .instant-toggle-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .instant-toggle-btn.active {
    background: var(--color-violet-600-a30);
    border-color: var(--accent-violet);
    color: var(--color-violet-50);
  }

  .toggle-icon {
    font-size: 0.95rem;
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
