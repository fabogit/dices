<script lang="ts">
  import type { DieFaces, RoundResult } from '../../core/types';
  import CoinPills from '../primitives/CoinPills.svelte';

  interface Props {
    rounds: ReadonlyArray<RoundResult>;
    faces: DieFaces;
    playerName: string;
  }

  let { rounds, faces, playerName }: Props = $props();
</script>

<!-- Round-by-Round Responsive Data Table (Modern Web Guidance responsive-table) -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="table-wrapper" tabindex="0" role="region" aria-labelledby="rounds-table-caption">
  <table class="rounds-table">
    <caption id="rounds-table-caption">
      Round results for active series ({playerName})
    </caption>
    <thead>
      <tr>
        <th scope="col">Round</th>
        <th scope="col">{faces === 2 ? 'Coins' : 'Dice Values'}</th>
        <th scope="col">{faces === 2 ? 'Winner' : 'Sum'}</th>
        <th scope="col">{faces === 2 ? 'Score' : 'Max / Min'}</th>
      </tr>
    </thead>
    <tbody>
      {#if rounds.length === 0}
        <tr>
          <td colspan="4" class="empty-table-cell">
            No rounds rolled yet. Press "Roll Round" to begin.
          </td>
        </tr>
      {:else}
        {#each rounds as r (r.roundIndex)}
          <tr>
            <th scope="row" class="round-index-cell">
              #{r.roundIndex + 1}
            </th>
            <td class="values-cell">
              {#if r.kind === 'coin'}
                <span class="coin-pills">
                  <CoinPills values={r.values} />
                </span>
              {:else}
                <span class="dice-values-text">{r.values.join(', ')}</span>
              {/if}
            </td>
            <td class="result-cell">
              {#if r.kind === 'coin'}
                <span class="outcome-pill" class:tie={r.roundWinnerSide === 'TIE'}>
                  {r.roundWinnerSide}
                </span>
              {:else}
                <strong class="sum-value">{r.sum}</strong>
              {/if}
            </td>
            <td class="stat-cell">
              {#if r.kind === 'coin'}
                <span class="coin-split">
                  {r.headsCount}H / {r.tailsCount}T
                </span>
              {:else}
                <span class="minmax-text">
                  ▲{r.max} ▼{r.min}
                </span>
              {/if}
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
  /* Responsive Table - Modern Web Guidance */
  .table-wrapper {
    overflow-x: auto;
    max-inline-size: 100%;
    max-block-size: 260px;
    border: 1px solid var(--border-subtle);
    border-radius: 0.5rem;
    background: var(--surface-dark);
  }

  .table-wrapper:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 1px;
  }

  .rounds-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.825rem;
  }

  .rounds-table caption {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .rounds-table thead {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    background: var(--surface-slate);
  }

  .rounds-table th {
    padding: 0.5rem 0.65rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-subtle);
  }

  .rounds-table td {
    padding: 0.45rem 0.65rem;
    border-bottom: 1px solid rgba(55, 65, 81, 0.4);
    color: var(--text-body);
  }

  .rounds-table tbody th {
    position: sticky;
    inset-inline-start: 0;
    background: var(--surface-dark);
    z-index: 1;
    font-weight: 600;
    color: var(--accent-blue);
    border-bottom: 1px solid rgba(55, 65, 81, 0.4);
  }

  .empty-table-cell {
    text-align: center;
    padding: 1.5rem !important;
    color: var(--text-secondary);
    font-style: italic;
  }

  .outcome-pill {
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    background: rgba(56, 189, 248, 0.2);
    color: var(--accent-blue);
  }

  .outcome-pill.tie {
    background: rgba(156, 163, 175, 0.2);
    color: var(--text-secondary);
  }

  .sum-value {
    color: var(--text-heading);
  }

  .minmax-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
</style>
