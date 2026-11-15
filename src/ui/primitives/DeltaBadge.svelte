<script lang="ts">
  interface Props {
    tone: 'positive' | 'negative' | 'neutral';
    text: string;
    prefix?: string;
    variant?: 'tag' | 'dist' | 'inline' | 'pill';
  }

  let { tone, text, prefix, variant = 'tag' }: Props = $props();
</script>

{#if variant === 'inline'}
  <span class="delta-indicator" class:pos={tone === 'positive'} class:neg={tone === 'negative'}>
    {#if prefix}{prefix}{/if}<strong>{text}</strong>
  </span>
{:else if variant === 'pill'}
  <span
    class="session-pill pill-delta"
    class:pos={tone === 'positive'}
    class:neg={tone === 'negative'}
  >
    {text}
  </span>
{:else if variant === 'dist'}
  <span
    class="delta-pct"
    class:delta-pos={tone === 'positive'}
    class:delta-neg={tone === 'negative'}
  >
    {text}
  </span>
{:else}
  <span class="delta-tag" class:positive={tone === 'positive'} class:negative={tone === 'negative'}>
    {text}
  </span>
{/if}

<style>
  .delta-tag {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
    color: var(--text-secondary);
  }

  .delta-tag.positive {
    background: rgba(16, 185, 129, 0.2);
    color: var(--color-emerald);
  }

  .delta-tag.negative {
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-danger);
  }

  .delta-pct {
    font-size: 0.68rem;
    color: var(--text-secondary);
  }

  .delta-pct.delta-pos {
    color: var(--color-emerald);
  }

  .delta-pct.delta-neg {
    color: var(--color-danger);
  }

  .delta-indicator strong {
    color: var(--text-body);
  }

  .delta-indicator.pos strong {
    color: var(--color-emerald);
  }

  .delta-indicator.neg strong {
    color: var(--color-danger);
  }

  .session-pill.pill-delta {
    padding: 0.15rem 0.45rem;
    border-radius: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }

  .session-pill.pill-delta.pos {
    color: var(--color-emerald);
    border-color: rgba(16, 185, 129, 0.4);
  }

  .session-pill.pill-delta.neg {
    color: var(--color-danger);
    border-color: rgba(239, 68, 68, 0.4);
  }
</style>
