<script lang="ts">
  interface Props {
    values: ReadonlyArray<number>;
    itemTestId?: string;
  }

  let { values, itemTestId }: Props = $props();
</script>

{#each values as v, i (i)}
  <span class="mini-coin" data-testid={itemTestId} class:heads={v === 1} class:tails={v === 2}>
    {v === 1 ? 'H' : 'T'}
  </span>
{/each}

<style>
  .mini-coin {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 0.65rem;
    font-weight: 800;
    margin-right: 2px;
  }

  .mini-coin.heads {
    background: var(--color-yellow-500);
    color: var(--color-brown-deep);
  }

  .mini-coin.tails {
    background: var(--text-muted);
    color: var(--surface-deep);
  }
</style>
