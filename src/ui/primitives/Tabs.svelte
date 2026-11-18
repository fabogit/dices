<script lang="ts" generics="T extends string">
  import type { Snippet } from 'svelte';

  interface Props {
    tabs: ReadonlyArray<{ id: T; label: string; badge?: string | number }>;
    activeTab: T;
    ariaLabel: string;
    onSelect: (id: T) => void;
    /** Renders the content of one tab; Tabs owns the tabpanel wrapper and its ARIA wiring. */
    panel: Snippet<[T]>;
  }

  let { tabs, activeTab, ariaLabel, onSelect, panel }: Props = $props();

  const uid = $props.id();
  const tabDomId = (id: T) => `${uid}-tab-${id}`;
  const panelDomId = (id: T) => `${uid}-panel-${id}`;

  let tablistEl: HTMLDivElement | undefined = $state();

  function handleKeyDown(e: KeyboardEvent) {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    const startIndex = Math.max(currentIndex, 0);
    let nextIndex = -1;

    if (e.key === 'ArrowRight') {
      nextIndex = (startIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (startIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const nextTab = tabs[nextIndex]!;
      onSelect(nextTab.id);
      const nextBtn = tablistEl?.querySelector<HTMLButtonElement>(
        `#${CSS.escape(tabDomId(nextTab.id))}`,
      );
      nextBtn?.focus();
    }
  }
</script>

<div bind:this={tablistEl} class="tabs-list" role="tablist" aria-label={ariaLabel}>
  {#each tabs as tab (tab.id)}
    {@const isActive = activeTab === tab.id}
    <button
      id={tabDomId(tab.id)}
      type="button"
      role="tab"
      class="panel-tab-btn"
      class:active={isActive}
      aria-selected={isActive}
      aria-controls={panelDomId(tab.id)}
      tabindex={isActive ? 0 : -1}
      onkeydown={handleKeyDown}
      onclick={() => onSelect(tab.id)}
    >
      <span>{tab.label}</span>
      {#if tab.badge !== undefined && tab.badge !== ''}
        <span class="tab-badge">{tab.badge}</span>
      {/if}
    </button>
  {/each}
</div>

{#each tabs as tab (tab.id)}
  <div
    id={panelDomId(tab.id)}
    role="tabpanel"
    aria-labelledby={tabDomId(tab.id)}
    hidden={activeTab !== tab.id}
  >
    {@render panel(tab.id)}
  </div>
{/each}

<style>
  .tabs-list {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--surface-dark);
    border: 1px solid var(--border-color);
    border-radius: 0.65rem;
  }

  .panel-tab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-block-size: 34px;
    padding: 0.35rem 0.5rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.45rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .panel-tab-btn:hover {
    color: var(--text-primary);
    background: rgba(31, 41, 55, 0.7);
  }

  .panel-tab-btn.active {
    background: var(--primary-blue);
    border-color: var(--accent-blue);
    color: var(--text-white);
  }

  .tab-badge {
    padding: 0.05rem 0.35rem;
    border-radius: 9999px;
    font-size: 0.68rem;
    font-weight: 700;
    background: var(--surface-elevated);
    color: var(--accent-blue);
  }

  .panel-tab-btn.active .tab-badge {
    background: rgba(255, 255, 255, 0.2);
    color: var(--text-white);
  }

  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
