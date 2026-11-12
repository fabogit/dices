<script lang="ts">
  import { rollState } from './rollState.svelte';

  function formatCoinValues(values: number[]): string {
    return values.map((v) => (v === 1 ? 'H' : 'T')).join(' ');
  }
</script>

<section class="series-scoreboard" aria-labelledby="scoreboard-heading">
  <div class="scoreboard-header">
    <h2 id="scoreboard-heading" class="scoreboard-title">Live Series Scoreboard</h2>
    <span class="series-badge">
      Round {rollState.rounds.length} of {rollState.seriesLength}
    </span>
  </div>

  <!-- Progress Bar -->
  <div class="progress-container">
    <div
      class="progress-bar"
      role="progressbar"
      aria-valuenow={rollState.rounds.length}
      aria-valuemin="0"
      aria-valuemax={rollState.seriesLength}
      aria-label="Series round completion progress"
      style:width="{rollState.progressPercent}%"
    ></div>
  </div>

  <!-- Coin Mode Summary (d2) -->
  {#if rollState.faces === 2}
    <div class="coin-summary-cards">
      <div class="score-card heads-card">
        <div class="card-icon">👑</div>
        <div class="card-content">
          <span class="card-label">HEADS</span>
          <span class="card-metric">
            {rollState.summary.headsRoundsWon ?? 0}
            <small>rounds</small>
          </span>
          <span class="sub-stat">{rollState.summary.totalHeads ?? 0} total coins</span>
        </div>
      </div>

      <div class="score-card tails-card">
        <div class="card-icon">🛡️</div>
        <div class="card-content">
          <span class="card-label">TAILS</span>
          <span class="card-metric">
            {rollState.summary.tailsRoundsWon ?? 0}
            <small>rounds</small>
          </span>
          <span class="sub-stat">{rollState.summary.totalTails ?? 0} total coins</span>
        </div>
      </div>
    </div>

    {#if rollState.isComplete}
      <div class="winner-banner" role="status">
        {#if rollState.summary.coinSeriesWinner === 'TIE'}
          <span class="winner-tie">⚖️ Coin Series Ended in a Tie!</span>
        {:else}
          <span class="winner-crown">
            🏆 {rollState.summary.coinSeriesWinner} Wins the Series!
          </span>
        {/if}
      </div>
    {/if}
  {:else}
    <!-- Polyhedral Dice Summary Cards (d4..d20) -->
    <div class="dice-metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Total Sum (∑)</span>
        <span class="metric-value">{rollState.summary.totalSum}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Average (μ)</span>
        <span class="metric-value">
          {rollState.rounds.length > 0 ? rollState.summary.average.toFixed(1) : '0.0'}
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Best Round</span>
        <span class="metric-value highlight-green">
          {rollState.summary.bestRoundIndex >= 0
            ? `#${rollState.summary.bestRoundIndex + 1} (${rollState.rounds[rollState.summary.bestRoundIndex]?.sum})`
            : '—'}
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Worst Round</span>
        <span class="metric-value highlight-red">
          {rollState.summary.worstRoundIndex >= 0
            ? `#${rollState.summary.worstRoundIndex + 1} (${rollState.rounds[rollState.summary.worstRoundIndex]?.sum})`
            : '—'}
        </span>
      </div>

      <div class="metric-card wide-card">
        <span class="metric-label">Mode (Most Frequent Face)</span>
        <span class="metric-value">
          {#if rollState.summary.mode.values.length > 0}
            {rollState.summary.mode.values.join(', ')}
            <span class="mode-freq">({rollState.summary.mode.frequency}x)</span>
            {#if rollState.summary.mode.isTie}
              <span class="mode-tie-badge">(Tie)</span>
            {/if}
          {:else}
            —
          {/if}
        </span>
      </div>
    </div>
  {/if}

  <!-- Round-by-Round Responsive Data Table (Modern Web Guidance responsive-table) -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="table-wrapper"
    tabindex="0"
    role="region"
    aria-labelledby="rounds-table-caption"
  >
    <table class="rounds-table">
      <caption id="rounds-table-caption">
        Round results for active series ({rollState.activePlayer.name})
      </caption>
      <thead>
        <tr>
          <th scope="col">Round</th>
          <th scope="col">{rollState.faces === 2 ? 'Coins' : 'Dice Values'}</th>
          <th scope="col">{rollState.faces === 2 ? 'Winner' : 'Sum'}</th>
          <th scope="col">{rollState.faces === 2 ? 'Score' : 'Max / Min'}</th>
        </tr>
      </thead>
      <tbody>
        {#if rollState.rounds.length === 0}
          <tr>
            <td colspan="4" class="empty-table-cell">
              No rounds rolled yet. Press "Roll Round" to begin.
            </td>
          </tr>
        {:else}
          {#each rollState.rounds as r (r.roundIndex)}
            <tr>
              <th scope="row" class="round-index-cell">
                #{r.roundIndex + 1}
              </th>
              <td class="values-cell">
                {#if rollState.faces === 2}
                  <span class="coin-pills">
                    {#each r.values as v, i (i)}
                      <span class="mini-coin" class:heads={v === 1} class:tails={v === 2}>
                        {v === 1 ? 'H' : 'T'}
                      </span>
                    {/each}
                  </span>
                {:else}
                  <span class="dice-values-text">{r.values.join(', ')}</span>
                {/if}
              </td>
              <td class="result-cell">
                {#if rollState.faces === 2}
                  <span class="outcome-pill" class:tie={r.roundWinnerSide === 'TIE'}>
                    {r.roundWinnerSide}
                  </span>
                {:else}
                  <strong class="sum-value">{r.sum}</strong>
                {/if}
              </td>
              <td class="stat-cell">
                {#if rollState.faces === 2}
                  <span class="coin-split">
                    {r.headsCount ?? 0}H / {r.tailsCount ?? 0}T
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
</section>

<style>
  .series-scoreboard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    background: rgba(17, 24, 39, 0.75);
    border: 1px solid rgba(75, 85, 99, 0.4);
    border-radius: 0.75rem;
    backdrop-filter: blur(8px);
  }

  .scoreboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .scoreboard-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f3f4f6;
  }

  .series-badge {
    padding: 0.25rem 0.6rem;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9ca3af;
  }

  .progress-container {
    width: 100%;
    height: 6px;
    background: #1f2937;
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%);
    transition: width 0.3s ease;
  }

  /* Coin Mode Cards */
  .coin-summary-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .score-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }

  .heads-card {
    background: rgba(234, 179, 8, 0.1);
    border-color: rgba(234, 179, 8, 0.3);
  }

  .tails-card {
    background: rgba(148, 163, 184, 0.1);
    border-color: rgba(148, 163, 184, 0.3);
  }

  .card-icon {
    font-size: 1.75rem;
  }

  .card-content {
    display: flex;
    flex-direction: column;
  }

  .card-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #9ca3af;
  }

  .card-metric {
    font-size: 1.25rem;
    font-weight: 800;
    color: #f9fafb;
  }

  .card-metric small {
    font-size: 0.75rem;
    font-weight: 500;
    color: #9ca3af;
  }

  .sub-stat {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .winner-banner {
    padding: 0.65rem;
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid #38bdf8;
    border-radius: 0.5rem;
    text-align: center;
    font-weight: 700;
  }

  .winner-crown { color: #fde047; }
  .winner-tie { color: #94a3b8; }

  /* Dice Metrics Grid */
  .dice-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .metric-card {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.65rem;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.375rem;
  }

  .wide-card {
    grid-column: span 2;
  }

  .metric-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
  }

  .metric-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: #f3f4f6;
  }

  .highlight-green { color: #34d399; }
  .highlight-red { color: #f87171; }

  .mode-freq {
    font-size: 0.8rem;
    font-weight: 500;
    color: #9ca3af;
  }

  .mode-tie-badge {
    font-size: 0.75rem;
    font-weight: 700;
    color: #facc15;
    margin-left: 0.25rem;
  }

  /* Responsive Table - Modern Web Guidance */
  .table-wrapper {
    overflow-x: auto;
    max-inline-size: 100%;
    max-block-size: 260px;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    background: #111827;
  }

  .table-wrapper:focus-visible {
    outline: 2px solid #38bdf8;
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
    background: #1e293b;
  }

  .rounds-table th {
    padding: 0.5rem 0.65rem;
    text-align: left;
    font-weight: 600;
    color: #9ca3af;
    border-bottom: 1px solid #374151;
  }

  .rounds-table td {
    padding: 0.45rem 0.65rem;
    border-bottom: 1px solid rgba(55, 65, 81, 0.4);
    color: #e5e7eb;
  }

  .rounds-table tbody th {
    position: sticky;
    inset-inline-start: 0;
    background: #111827;
    z-index: 1;
    font-weight: 600;
    color: #38bdf8;
    border-bottom: 1px solid rgba(55, 65, 81, 0.4);
  }

  .empty-table-cell {
    text-align: center;
    padding: 1.5rem !important;
    color: #6b7280;
    font-style: italic;
  }

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
    background: #eab308;
    color: #422006;
  }

  .mini-coin.tails {
    background: #94a3b8;
    color: #0f172a;
  }

  .outcome-pill {
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
  }

  .outcome-pill.tie {
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
  }

  .sum-value {
    color: #f3f4f6;
  }

  .minmax-text {
    font-size: 0.75rem;
    color: #9ca3af;
  }
</style>
