<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'card' | 'inline';
    icon?: string;
    title?: string;
    message?: string;
    children?: Snippet;
  }

  let { variant = 'card', icon, title, message, children }: Props = $props();
</script>

{#if variant === 'inline'}
  <p class="empty-history">
    {#if children}
      {@render children()}
    {:else}
      {message}
    {/if}
  </p>
{:else}
  <div class="empty-quick-state">
    {#if icon}
      <span class="empty-icon" aria-hidden="true">{icon}</span>
    {/if}
    {#if title}
      <p class="empty-title">{title}</p>
    {/if}
    <p class="empty-desc">
      {#if children}
        {@render children()}
      {:else}
        {message}
      {/if}
    </p>
  </div>
{/if}

<style>
  .empty-quick-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem 1rem;
    background: var(--surface-dark);
    border: 1px dashed var(--border-subtle);
    border-radius: 0.5rem;
  }

  .empty-icon {
    font-size: 2.25rem;
    margin-bottom: 0.5rem;
  }

  .empty-title {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-body);
  }

  .empty-desc {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
    max-width: 260px;
  }

  .empty-desc :global(strong) {
    color: var(--accent-blue);
  }

  .empty-history {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-style: italic;
    padding: 0.75rem 0;
  }
</style>
