<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  /**
   * Styling hooks (the primitive knows nothing about its consumers):
   * - `class` is applied to the root element, for shared global utilities such as `surface-card`.
   * - CSS custom properties tune the internal layout; pass them as component props
   *   (`--cp-gap="0.5rem"`) or set them on any ancestor:
   *   `--cp-gap` (root, default 1rem), `--cp-body-gap` (body, default 1rem),
   *   `--cp-header-gap` (header, default normal), `--cp-heading-letter-spacing` (default normal),
   *   `--cp-title-wrap` (heading + badge row, default nowrap).
   */
  interface Props {
    title: string;
    collapsed: boolean;
    onToggle: () => void;
    class?: ClassValue;
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
    class: className,
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
  class={['cp-root', className]}
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
    gap: var(--cp-gap, 1rem);
  }

  .cp-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--cp-header-gap, normal);
  }

  .cp-title-with-badge {
    display: flex;
    flex-wrap: var(--cp-title-wrap, nowrap);
    align-items: center;
    gap: 0.5rem;
  }

  .cp-heading {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-heading);
    letter-spacing: var(--cp-heading-letter-spacing, normal);
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
    gap: var(--cp-body-gap, 1rem);
  }

  .cp-body.collapsed {
    display: none;
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
