<script lang="ts">
  import { rollState } from './rollState.svelte';

  const analytics = $derived(rollState.summary.analytics);
  let isScoreboardCollapsed = $state(false);
  let isAnalyticsCollapsed = $state(false);
</script>

<section class="series-scoreboard" aria-labelledby="scoreboard-heading">
  <div class="scoreboard-header">
    <div class="title-with-badge">
      <h2 id="scoreboard-heading" class="scoreboard-title">Live Series Scoreboard</h2>
      <span class="series-badge">
        Round {rollState.rounds.length} of {rollState.seriesLength}
      </span>
    </div>
    <button
      type="button"
      class="collapse-toggle-btn"
      aria-expanded={!isScoreboardCollapsed}
      onclick={() => (isScoreboardCollapsed = !isScoreboardCollapsed)}
      aria-label="{isScoreboardCollapsed ? 'Show' : 'Hide'} Live Series Scoreboard"
    >
      <span class="chevron" aria-hidden="true">{isScoreboardCollapsed ? '▸' : '▾'}</span>
      <span>{isScoreboardCollapsed ? 'Show' : 'Hide'}</span>
    </button>
  </div>

  <div class="scoreboard-body" class:collapsed={isScoreboardCollapsed}>
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
      {@const totalCoins = analytics.totalDiceRolled || 1}
      {@const headsPct = analytics.coinStats
        ? analytics.coinStats.headsPercentage
        : (((rollState.summary.totalHeads ?? 0) / totalCoins) * 100)}
      {@const tailsPct = analytics.coinStats
        ? analytics.coinStats.tailsPercentage
        : (((rollState.summary.totalTails ?? 0) / totalCoins) * 100)}
      <div class="coin-summary-cards">
        <div class="score-card heads-card">
          <div class="card-icon" aria-hidden="true">👑</div>
          <div class="card-content">
            <span class="card-label">HEADS</span>
            <span class="card-metric">
              {rollState.summary.headsRoundsWon ?? 0}
              <small>rounds won</small>
            </span>
            <div class="card-sub-row">
              <span class="sub-stat-pct">{headsPct.toFixed(1)}%</span>
              <span class="sub-stat-sep">•</span>
              <span class="sub-stat">{rollState.summary.totalHeads ?? 0} coins</span>
            </div>
          </div>
        </div>

        <div class="score-card tails-card">
          <div class="card-icon" aria-hidden="true">🛡️</div>
          <div class="card-content">
            <span class="card-label">TAILS</span>
            <span class="card-metric">
              {rollState.summary.tailsRoundsWon ?? 0}
              <small>rounds won</small>
            </span>
            <div class="card-sub-row">
              <span class="sub-stat-pct">{tailsPct.toFixed(1)}%</span>
              <span class="sub-stat-sep">•</span>
              <span class="sub-stat">{rollState.summary.totalTails ?? 0} coins</span>
            </div>
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
  </div>

  <!-- Advanced Statistical Breakdown (Issue #7 & #12) -->
  <div class="analytics-section">
    <div class="section-title-row">
      <div class="title-with-badge">
        <h3 class="section-subtitle">
          Statistical Breakdown ({rollState.faces === 2 ? 'Coin d2' : `d${rollState.faces}`})
        </h3>
        <span class="dice-count-tag">
          {analytics.totalDiceRolled} {analytics.totalDiceRolled === 1 ? 'die rolled' : 'dice rolled'}
        </span>
      </div>
      <button
        type="button"
        class="collapse-toggle-btn"
        aria-expanded={!isAnalyticsCollapsed}
        onclick={() => (isAnalyticsCollapsed = !isAnalyticsCollapsed)}
        aria-label="{isAnalyticsCollapsed ? 'Show' : 'Hide'} Statistical Breakdown & Distribution"
      >
        <span class="chevron" aria-hidden="true">{isAnalyticsCollapsed ? '▸' : '▾'}</span>
        <span>{isAnalyticsCollapsed ? 'Show' : 'Hide'}</span>
      </button>
    </div>

    <div class="analytics-body" class:collapsed={isAnalyticsCollapsed}>
      <!-- Statistical Insight Banner -->
      <div class="insight-banner">
        <div class="insight-header">
          <div class="insight-title-group">
            <span class="insight-icon" aria-hidden="true">💡</span>
            <h4 class="insight-title">Statistical Verdict</h4>
          </div>
          <span class="reliability-chip reliability-{analytics.sampleReliability}">
            {#if analytics.sampleReliability === 'empty'}
              No Rolls
            {:else if analytics.sampleReliability === 'small'}
              Small sample (&lt;10)
            {:else if analytics.sampleReliability === 'moderate'}
              Moderate sample (10–29)
            {:else}
              Solid sample (30+)
            {/if}
          </span>
        </div>
        <p class="insight-text">{analytics.insightSummary}</p>
      </div>

      <!-- Analytics Key Metrics Grid -->
      {#if rollState.faces === 2}
        {@const coinStats = analytics.coinStats}
        {@const headsPct = coinStats?.headsPercentage ?? 0}
        {@const tailsPct = coinStats?.tailsPercentage ?? 0}
        {@const headsDelta = coinStats?.headsDeltaPercentage ?? 0}
        {@const tailsDelta = coinStats?.tailsDeltaPercentage ?? 0}
        {@const zQualitative =
          analytics.sampleReliability === 'empty'
            ? 'No data'
            : Math.abs(analytics.zScore) < 1.0
              ? 'Within normal variance'
              : analytics.zScore > 0
                ? 'Heads-leaning'
                : 'Tails-leaning'}

        <div class="analytics-metrics-grid coin-analytics-grid">
          <!-- Heads Share -->
          <div class="stat-box">
            <span class="stat-box-label">Heads Share</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num highlight-heads">{headsPct.toFixed(1)}%</span>
              {#if analytics.totalDiceRolled > 0}
                <span
                  class="delta-tag"
                  class:positive={headsDelta >= 0}
                  class:negative={headsDelta < 0}
                >
                  {headsDelta >= 0 ? '+' : ''}{headsDelta.toFixed(1)}% vs 50%
                </span>
              {/if}
            </div>
          </div>

          <!-- Tails Share -->
          <div class="stat-box">
            <span class="stat-box-label">Tails Share</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num highlight-tails">{tailsPct.toFixed(1)}%</span>
              {#if analytics.totalDiceRolled > 0}
                <span
                  class="delta-tag"
                  class:positive={tailsDelta >= 0}
                  class:negative={tailsDelta < 0}
                >
                  {tailsDelta >= 0 ? '+' : ''}{tailsDelta.toFixed(1)}% vs 50%
                </span>
              {/if}
            </div>
          </div>

          <!-- Balance Deviation (z) -->
          <div class="stat-box">
            <span class="stat-box-label">Balance Deviation (z)</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num">
                {analytics.totalDiceRolled > 0
                  ? `${analytics.zScore >= 0 ? '+' : ''}${analytics.zScore.toFixed(2)}`
                  : '0.00'}
              </span>
              <span class="sub-label">{zQualitative}</span>
            </div>
          </div>

          <!-- Round Split -->
          <div class="stat-box">
            <span class="stat-box-label">Round Split</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num">
                {coinStats?.headsRoundsWon ?? 0}H / {coinStats?.tailsRoundsWon ?? 0}T
                {#if (coinStats?.tieRounds ?? 0) > 0}
                  / {coinStats?.tieRounds} Tie
                {/if}
              </span>
              <span class="sub-label">across {rollState.rounds.length} rounds</span>
            </div>
          </div>
        </div>
      {:else}
        <!-- Polyhedral d4..d20 Analytics Grid -->
        <div class="analytics-metrics-grid">
          <!-- Expected vs Actual Round Average -->
          <div class="stat-box">
            <span class="stat-box-label">Expected Avg (E[X])</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num">{analytics.expectedRoundAverage.toFixed(1)}</span>
              {#if rollState.rounds.length > 0}
                <span
                  class="delta-tag"
                  class:positive={analytics.averageDelta >= 0}
                  class:negative={analytics.averageDelta < 0}
                >
                  {analytics.averageDelta >= 0 ? '+' : ''}{analytics.averageDelta.toFixed(1)} Δ
                </span>
                <span class="zscore-tag">
                  (z: {analytics.zScore >= 0 ? '+' : ''}{analytics.zScore.toFixed(2)})
                </span>
              {/if}
            </div>
          </div>

          <!-- Population Standard Deviation of Round Sums -->
          <div class="stat-box">
            <span class="stat-box-label">Std Deviation (σ)</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num">
                {rollState.rounds.length > 0 ? analytics.standardDeviation.toFixed(2) : '0.00'}
              </span>
              <span class="sub-label">across round sums (σ)</span>
            </div>
          </div>

          <!-- Critical Max Rate (= N) -->
          <div class="stat-box">
            <span class="stat-box-label">Crit Max (= {rollState.faces})</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num highlight-crit">{analytics.criticalMaxRate.toFixed(1)}%</span>
              <span class="sub-label">({analytics.criticalMaxCount}/{analytics.totalDiceRolled})</span>
            </div>
          </div>

          <!-- Critical Min Rate (= 1) -->
          <div class="stat-box">
            <span class="stat-box-label">Crit Min (= 1)</span>
            <div class="stat-box-value-row">
              <span class="stat-main-num highlight-min">{analytics.criticalMinRate.toFixed(1)}%</span>
              <span class="sub-label">({analytics.criticalMinCount}/{analytics.totalDiceRolled})</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Face Frequency Distribution (Bar Chart vs Theoretical Line) wrapped in semantic figure -->
      <figure class="distribution-card">
        <figcaption class="dist-header">
          <span class="dist-title">Empirical vs Expected Distribution</span>
          <span class="expected-legend">
            <span class="legend-line" aria-hidden="true"></span>
            <span>Expected: {analytics.distribution[0]?.expectedPercentage.toFixed(1)}%</span>
          </span>
        </figcaption>

        <div class="bars-container" role="group" aria-label="Face frequency distribution bars">
          {#each analytics.distribution as item (item.face)}
            {@const barWidthPct = Math.min(
              100,
              (item.percentage / analytics.distributionPeakPercentage) * 100,
            )}
            {@const expectedLeftPct = Math.min(
              100,
              (item.expectedPercentage / analytics.distributionPeakPercentage) * 100,
            )}
            {@const isHot = analytics.hottestFaces.includes(item.face)}
            <div class="dist-row">
              <span
                class="face-label"
                class:coin-label={rollState.faces === 2}
                class:hot-face-label={isHot && rollState.faces > 2}
              >
                {item.label}
                {#if isHot && rollState.faces > 2}
                  <span class="hot-badge" aria-hidden="true" title="Hot face">🔥</span>
                {/if}
              </span>

              <div class="bar-track">
                <!-- Theoretical Expected Line Marker scaled relative to distributionPeakPercentage -->
                <div
                  class="expected-marker"
                  style:left="{expectedLeftPct}%"
                  aria-hidden="true"
                ></div>

                <!-- Actual Measured Bar scaled relative to distributionPeakPercentage -->
                <div
                  class="empirical-bar"
                  class:coin-heads={rollState.faces === 2 && item.face === 1}
                  class:coin-tails={rollState.faces === 2 && item.face === 2}
                  class:hot-bar={isHot && rollState.faces > 2}
                  style:width="{barWidthPct}%"
                  role="img"
                  aria-label="Face {item.label}: {item.count} rolls, {item.percentage.toFixed(1)}% (expected {item.expectedPercentage.toFixed(1)}%)"
                ></div>
              </div>

              <div class="dist-stats">
                <span class="count-text">{item.count}</span>
                <span class="pct-text">{item.percentage.toFixed(1)}%</span>
                <span
                  class="delta-pct"
                  class:delta-pos={item.deltaPercentage > 0.05}
                  class:delta-neg={item.deltaPercentage < -0.05}
                >
                  {item.deltaPercentage >= 0 ? '+' : ''}{item.deltaPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          {/each}
        </div>
      </figure>
    </div>
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

  .title-with-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .scoreboard-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f3f4f6;
  }

  .scoreboard-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .scoreboard-body.collapsed {
    display: none;
  }

  .analytics-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .analytics-body.collapsed {
    display: none;
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
    gap: 0.1rem;
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
    margin-left: 0.25rem;
  }

  .card-sub-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
  }

  .sub-stat-pct {
    font-weight: 700;
    color: #f3f4f6;
  }

  .sub-stat-sep {
    color: var(--text-secondary, #9ca3af);
  }

  .sub-stat {
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

  /* Advanced Analytics Section */
  .analytics-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(75, 85, 99, 0.3);
  }

  .section-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-subtitle {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #e5e7eb;
    letter-spacing: -0.01em;
  }

  .dice-count-tag {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  /* Insight Banner */
  .insight-banner {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.75rem 0.85rem;
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(17, 24, 39, 0.95) 100%);
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 0.5rem;
  }

  .insight-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .insight-title-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .insight-icon {
    font-size: 1rem;
  }

  .insight-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: #38bdf8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reliability-chip {
    padding: 0.15rem 0.45rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .reliability-solid {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  .reliability-moderate {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .reliability-small {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .reliability-empty {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
    border: 1px solid rgba(107, 114, 128, 0.4);
  }

  .insight-text {
    margin: 0;
    font-size: 0.825rem;
    line-height: 1.4;
    color: #e5e7eb;
  }

  .analytics-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.5rem 0.65rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 0.375rem;
  }

  .stat-box-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #9ca3af;
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
    color: #f3f4f6;
  }

  .highlight-heads {
    color: #facc15;
  }

  .highlight-tails {
    color: #94a3b8;
  }

  .highlight-crit {
    color: #facc15;
  }

  .highlight-min {
    color: #f87171;
  }

  .delta-tag {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
  }

  .delta-tag.positive {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  .delta-tag.negative {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }

  .zscore-tag {
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .sub-label {
    font-size: 0.72rem;
    color: var(--text-secondary, #9ca3af);
  }

  /* Distribution Chart */
  .distribution-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0.75rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 0.5rem;
  }

  .dist-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .dist-title {
    font-weight: 600;
    color: #d1d5db;
  }

  .expected-legend {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .legend-line {
    display: inline-block;
    width: 12px;
    height: 2px;
    background: #f59e0b;
  }

  .bars-container {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .dist-row {
    display: grid;
    grid-template-columns: 56px 1fr 100px;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.75rem;
  }

  .face-label {
    font-weight: 700;
    color: #9ca3af;
    text-align: right;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.2rem;
  }

  .face-label.coin-label {
    font-size: 0.7rem;
  }

  .hot-face-label {
    color: #fbbf24;
  }

  .hot-badge {
    font-size: 0.75rem;
  }

  .bar-track {
    position: relative;
    height: 14px;
    background: #1f2937;
    border-radius: 4px;
    overflow: hidden;
  }

  .empirical-bar {
    height: 100%;
    background: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .empirical-bar.coin-heads {
    background: linear-gradient(90deg, #ca8a04 0%, #facc15 100%);
  }

  .empirical-bar.coin-tails {
    background: linear-gradient(90deg, #475569 0%, #94a3b8 100%);
  }

  .empirical-bar.hot-bar {
    background: linear-gradient(90deg, #d97706 0%, #f59e0b 100%);
  }

  .expected-marker {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #f59e0b;
    z-index: 2;
    transform: translateX(-50%);
    box-shadow: 0 0 4px rgba(245, 158, 11, 0.8);
  }

  .dist-stats {
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: 0.35rem;
    font-size: 0.72rem;
  }

  .count-text {
    font-weight: 700;
    color: #f3f4f6;
  }

  .pct-text {
    color: #9ca3af;
  }

  .delta-pct {
    font-size: 0.68rem;
    color: var(--text-secondary, #9ca3af);
  }

  .delta-pct.delta-pos {
    color: #34d399;
  }

  .delta-pct.delta-neg {
    color: #f87171;
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
    color: var(--text-secondary, #9ca3af);
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
