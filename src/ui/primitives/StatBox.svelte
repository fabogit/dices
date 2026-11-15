<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    value: string | number;
    valueTone?: 'default' | 'heads' | 'tails' | 'crit-max' | 'crit-min';
    subtext?: string;
    children?: Snippet;
  }

  let { label, value, valueTone = 'default', subtext, children }: Props = $props();
</script>

<div class="stat-box">
  <span class="stat-box-label">{label}</span>
  <div class="stat-box-value-row">
    <span
      class="stat-main-num"
      class:highlight-heads={valueTone === 'heads'}
      class:highlight-tails={valueTone === 'tails'}
      class:highlight-crit={valueTone === 'crit-max'}
      class:highlight-min={valueTone === 'crit-min'}
    >
      {value}
    </span>
    {#if subtext}
      <span class="sub-label">{subtext}</span>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  .stat-box {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.5rem 0.65rem;
    background: var(--surface-dark);
    border: 1px solid var(--border-subtle);
    border-radius: 0.375rem;
  }

  .stat-box-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .stat-box-value-row {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .stat-main-num {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .highlight-heads {
    color: var(--color-gold);
  }

  .highlight-tails {
    color: var(--text-muted);
  }

  .highlight-crit {
    color: var(--color-gold);
  }

  .highlight-min {
    color: var(--color-danger);
  }

  .sub-label {
    font-size: 0.72rem;
    color: var(--text-secondary);
  }
</style>
