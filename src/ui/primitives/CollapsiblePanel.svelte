<script lang="ts">
  import type { Snippet } from 'svelte';

  export type CollapsibleVariant =
    | 'control'
    | 'arena'
    | 'scoreboard'
    | 'analytics'
    | 'analytics-nested'
    | 'quick'
    | 'history';

  interface Props {
    title: string;
    collapsed: boolean;
    onToggle: () => void;
    variant?: CollapsibleVariant;
    as?: 'section' | 'aside' | 'div';
    headingLevel?: 'h2' | 'h3';
    headingId?: string;
    bodyTestId?: string;
    expandText?: string;
    collapseText?: string;
    expandAriaLabel?: string;
    collapseAriaLabel?: string;
    badge?: Snippet;
    actions?: Snippet;
    children: Snippet;
  }

  let {
    title,
    collapsed,
    onToggle,
    variant = 'control',
    as = 'section',
    headingLevel = 'h2',
    headingId,
    bodyTestId,
    expandText = 'Show',
    collapseText = 'Hide',
    expandAriaLabel,
    collapseAriaLabel,
    badge,
    actions,
    children,
  }: Props = $props();

  const uid = $props.id();
  const resolvedHeadingId = $derived(headingId ?? `${uid}-heading`);
  const bodyId = `${uid}-body`;
  const toggleLabel = $derived(
    collapsed ? (expandAriaLabel ?? `Show ${title}`) : (collapseAriaLabel ?? `Hide ${title}`),
  );
  const toggleText = $derived(collapsed ? expandText : collapseText);
</script>

<svelte:element
  this={as}
  class="cp-root variant-{variant}"
  aria-labelledby={as === 'div' ? undefined : resolvedHeadingId}
>
  <div class="cp-header">
    {#if badge}
      <div class="cp-title-with-badge">
        <svelte:element this={headingLevel} id={resolvedHeadingId} class="cp-heading">
          {title}
        </svelte:element>
        {@render badge()}
      </div>
    {:else}
      <svelte:element this={headingLevel} id={resolvedHeadingId} class="cp-heading">
        {title}
      </svelte:element>
    {/if}

    {#if actions}
      <div class="cp-action-group">
        {@render actions()}
        <button
          type="button"
          class="collapse-toggle-btn"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onclick={onToggle}
          aria-label={toggleLabel}
        >
          <span class="chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
          <span>{toggleText}</span>
        </button>
      </div>
    {:else}
      <button
        type="button"
        class="collapse-toggle-btn"
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onclick={onToggle}
        aria-label={toggleLabel}
      >
        <span class="chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
        <span>{toggleText}</span>
      </button>
    {/if}
  </div>

  <div id={bodyId} class="cp-body" class:collapsed data-testid={bodyTestId}>
    {@render children()}
  </div>
</svelte:element>

<style>
  .cp-root {
    display: flex;
    flex-direction: column;
  }

  /* Card surface shared by control, quick, history */
  .cp-root.variant-control,
  .cp-root.variant-quick,
  .cp-root.variant-history {
    padding: 1.25rem;
    background: var(--surface-panel);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    backdrop-filter: blur(8px);
  }

  .cp-root.variant-control {
    gap: 1rem;
  }

  .cp-root.variant-quick,
  .cp-root.variant-history {
    gap: 0.85rem;
  }

  .cp-root.variant-arena {
    gap: 0.5rem;
    width: 100%;
  }

  .cp-root.variant-scoreboard {
    gap: 1rem;
  }

  .cp-root.variant-analytics {
    gap: 0.75rem;
  }

  .cp-root.variant-analytics-nested {
    gap: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(75, 85, 99, 0.3);
  }

  .cp-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cp-root.variant-history .cp-header {
    gap: 0.5rem;
  }

  .cp-title-with-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cp-root.variant-scoreboard .cp-title-with-badge,
  .cp-root.variant-analytics .cp-title-with-badge,
  .cp-root.variant-analytics-nested .cp-title-with-badge {
    flex-wrap: wrap;
  }

  .cp-heading {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .cp-root.variant-control .cp-heading,
  .cp-root.variant-analytics .cp-heading {
    letter-spacing: -0.01em;
  }

  .cp-root.variant-analytics-nested .cp-heading {
    font-size: 0.95rem;
    color: var(--text-body);
    letter-spacing: -0.01em;
  }

  .cp-action-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .collapse-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    min-block-size: 28px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .collapse-toggle-btn:hover {
    background: var(--surface-hover);
    color: var(--text-heading);
  }

  .collapse-toggle-btn .chevron {
    font-size: 0.85rem;
    color: var(--accent-blue);
  }

  .cp-body {
    display: flex;
    flex-direction: column;
  }

  .cp-root.variant-control .cp-body {
    gap: 1.25rem;
  }

  .cp-root.variant-arena .cp-body {
    width: 100%;
    gap: 0.65rem;
  }

  .cp-root.variant-scoreboard .cp-body,
  .cp-root.variant-quick .cp-body {
    gap: 1rem;
  }

  .cp-root.variant-analytics .cp-body,
  .cp-root.variant-analytics-nested .cp-body {
    gap: 0.75rem;
  }

  .cp-root.variant-history .cp-body {
    gap: 0.85rem;
  }

  .cp-body.collapsed {
    display: none;
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
