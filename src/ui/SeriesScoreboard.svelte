<script lang="ts">
  import { getCoinSplitPercentages } from '../core/engine';
  import { dieLabel, formatSigned } from '../lib/format';
  import CoinPills from './primitives/CoinPills.svelte';
  import CollapsiblePanel from './primitives/CollapsiblePanel.svelte';
  import DeltaBadge from './primitives/DeltaBadge.svelte';
  import StatBox from './primitives/StatBox.svelte';
  import { rollState } from './state/rollState.svelte';

  let { section = 'all' }: { section?: 'all' | 'scoreboard' | 'analytics' } = $props();

  const analytics = $derived(rollState.summary.analytics);
  let isScoreboardCollapsed = $state(false);
  let isAnalyticsCollapsed = $state(false);
</script>

<section
  class="series-scoreboard"
  aria-labelledby={section === 'analytics' ? 'analytics-heading' : 'scoreboard-heading'}
>
  {#if section === 'all' || section === 'scoreboard'}
    <CollapsiblePanel
      as="div"
      variant="scoreboard"
      headingId="scoreboard-heading"
      title="Live Series Scoreboard"
      collapsed={isScoreboardCollapsed}
      onToggle={() => (isScoreboardCollapsed = !isScoreboardCollapsed)}
    >
      {#snippet badge()}
        <span class="series-badge">
          Round {rollState.rounds.length} of {rollState.seriesLength}
        </span>
      {/snippet}
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
        {@const { headsPct, tailsPct } = getCoinSplitPercentages(rollState.summary)}
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
                <span class="sub-stat-pct" data-testid="heads-pct">{headsPct.toFixed(1)}%</span>
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
                <span class="sub-stat-pct" data-testid="tails-pct">{tailsPct.toFixed(1)}%</span>
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
      <div class="table-wrapper" tabindex="0" role="region" aria-labelledby="rounds-table-caption">
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
                        <CoinPills values={r.values} />
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
    </CollapsiblePanel>
  {/if}

  {#if section === 'all' || section === 'analytics'}
    <!-- Advanced Statistical Breakdown (Issue #7 & #12) -->
    <CollapsiblePanel
      as="div"
      variant={section === 'analytics' ? 'analytics' : 'analytics-nested'}
      headingLevel={section === 'analytics' ? 'h2' : 'h3'}
      headingId={section === 'analytics' ? 'analytics-heading' : undefined}
      title="Statistical Breakdown ({dieLabel(rollState.faces)})"
      collapsed={isAnalyticsCollapsed}
      onToggle={() => (isAnalyticsCollapsed = !isAnalyticsCollapsed)}
      expandAriaLabel="Show Statistical Breakdown & Distribution"
      collapseAriaLabel="Hide Statistical Breakdown & Distribution"
      bodyTestId="analytics-body"
    >
      {#snippet badge()}
        <span class="dice-count-tag">
          {`${analytics.totalDiceRolled} ${analytics.totalDiceRolled === 1 ? 'die' : 'dice'} rolled`}
        </span>
      {/snippet}
      <!-- Statistical Insight Banner -->
      <div class="insight-banner">
        <div class="insight-header">
          <div class="insight-title-group">
            <span class="insight-icon" aria-hidden="true">💡</span>
            <h4 class="insight-title">Statistical Verdict</h4>
          </div>
          <span
            class="reliability-chip reliability-{analytics.sampleReliability}"
            data-testid="sample-reliability"
          >
            {analytics.sampleReliabilityLabel}
          </span>
        </div>
        <p class="insight-text" data-testid="insight-text">{analytics.insightSummary}</p>
      </div>

      <!-- Analytics Key Metrics Grid -->
      {#if rollState.faces === 2}
        {@const coinStats = analytics.coinStats}
        {@const headsPct = coinStats?.headsPercentage ?? 0}
        {@const tailsPct = coinStats?.tailsPercentage ?? 0}
        {@const headsDelta = coinStats?.headsDeltaPercentage ?? 0}
        {@const tailsDelta = coinStats?.tailsDeltaPercentage ?? 0}
        {@const zQualitative = coinStats?.zQualitative ?? 'No data'}

        <div
          class="analytics-metrics-grid coin-analytics-grid"
          data-testid="analytics-metrics"
          data-variant="coin"
        >
          <!-- Heads Share -->
          <StatBox label="Heads Share" value="{headsPct.toFixed(1)}%" valueTone="heads">
            {#if analytics.totalDiceRolled > 0}
              <DeltaBadge
                tone={headsDelta >= 0 ? 'positive' : 'negative'}
                text="{formatSigned(headsDelta, 1)}% vs 50%"
              />
            {/if}
          </StatBox>

          <!-- Tails Share -->
          <StatBox label="Tails Share" value="{tailsPct.toFixed(1)}%" valueTone="tails">
            {#if analytics.totalDiceRolled > 0}
              <DeltaBadge
                tone={tailsDelta >= 0 ? 'positive' : 'negative'}
                text="{formatSigned(tailsDelta, 1)}% vs 50%"
              />
            {/if}
          </StatBox>

          <!-- Balance Deviation (z) -->
          <StatBox
            label="Balance Deviation (z)"
            value={analytics.totalDiceRolled > 0 ? formatSigned(analytics.zScore, 2) : '0.00'}
            subtext={zQualitative}
          />

          <!-- Round Split -->
          <StatBox
            label="Round Split"
            value="{coinStats?.headsRoundsWon ?? 0}H / {coinStats?.tailsRoundsWon ??
              0}T{(coinStats?.tieRounds ?? 0) > 0 ? ` / ${coinStats?.tieRounds} Tie` : ''}"
            subtext="across {rollState.rounds.length} rounds"
          />
        </div>
      {:else}
        <!-- Polyhedral d4..d20 Analytics Grid -->
        <div
          class="analytics-metrics-grid"
          data-testid="analytics-metrics"
          data-variant="polyhedral"
        >
          <!-- Expected vs Actual Round Average -->
          <StatBox label="Expected Avg (E[X])" value={analytics.expectedRoundAverage.toFixed(1)}>
            {#if rollState.rounds.length > 0}
              <DeltaBadge
                tone={analytics.averageDelta >= 0 ? 'positive' : 'negative'}
                text="{formatSigned(analytics.averageDelta, 1)} Δ"
              />
              <span class="zscore-tag">
                (z: {formatSigned(analytics.zScore, 2)})
              </span>
            {/if}
          </StatBox>

          <!-- Population Standard Deviation of Round Sums -->
          <StatBox
            label="Std Deviation (σ)"
            value={rollState.rounds.length > 0 ? analytics.standardDeviation.toFixed(2) : '0.00'}
            subtext="across round sums (σ)"
          />

          <!-- Critical Max Rate (= N) -->
          <StatBox
            label="Crit Max (= {rollState.faces})"
            value="{analytics.criticalMaxRate.toFixed(1)}%"
            valueTone="crit-max"
            subtext="({analytics.criticalMaxCount}/{analytics.totalDiceRolled})"
          />

          <!-- Critical Min Rate (= 1) -->
          <StatBox
            label="Crit Min (= 1)"
            value="{analytics.criticalMinRate.toFixed(1)}%"
            valueTone="crit-min"
            subtext="({analytics.criticalMinCount}/{analytics.totalDiceRolled})"
          />
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
            {@const showHot = item.isHot && rollState.faces > 2}
            <div class="dist-row" data-testid="dist-row">
              <span
                class="face-label"
                class:coin-label={rollState.faces === 2}
                class:hot-face-label={showHot}
                data-testid={showHot ? 'hot-face' : undefined}
              >
                {item.label}
                {#if showHot}
                  <span
                    class="hot-badge"
                    data-testid="hot-badge"
                    aria-hidden="true"
                    title="Hot face">🔥</span
                  >
                {/if}
              </span>

              <div class="bar-track">
                <!-- Theoretical Expected Line Marker scaled relative to distributionPeakPercentage -->
                <div
                  class="expected-marker"
                  style:left="{item.expectedMarkerPercentage}%"
                  aria-hidden="true"
                ></div>

                <!-- Actual Measured Bar scaled relative to distributionPeakPercentage -->
                <div
                  class="empirical-bar"
                  class:coin-heads={rollState.faces === 2 && item.face === 1}
                  class:coin-tails={rollState.faces === 2 && item.face === 2}
                  class:hot-bar={showHot}
                  style:width="{item.barWidthPercentage}%"
                  role="img"
                  aria-label="Face {item.label}: {item.count} rolls, {item.percentage.toFixed(
                    1,
                  )}% (expected {item.expectedPercentage.toFixed(1)}%)"
                ></div>
              </div>

              <div class="dist-stats">
                <span class="count-text" data-testid="dist-count">{item.count}</span>
                <span class="pct-text" data-testid="dist-pct">{item.percentage.toFixed(1)}%</span>
                <DeltaBadge
                  tone={item.deltaDirection}
                  text="{formatSigned(item.deltaPercentage, 1)}%"
                  variant="dist"
                />
              </div>
            </div>
          {/each}
        </div>
      </figure>
    </CollapsiblePanel>
  {/if}
</section>

<style>
  .series-scoreboard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--surface-panel);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    backdrop-filter: blur(8px);
  }

  .series-badge {
    padding: 0.25rem 0.6rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .progress-container {
    width: 100%;
    height: 6px;
    background: var(--surface-elevated);
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-sky) 0%, var(--accent-blue) 100%);
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
    color: var(--text-secondary);
  }

  .card-metric {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .card-metric small {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
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
    color: var(--text-heading);
  }

  .sub-stat-sep {
    color: var(--text-secondary);
  }

  .sub-stat {
    color: var(--text-secondary);
  }

  .winner-banner {
    padding: 0.65rem;
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid var(--accent-blue);
    border-radius: 0.5rem;
    text-align: center;
    font-weight: 700;
  }

  .winner-crown {
    color: var(--color-gold-light);
  }
  .winner-tie {
    color: var(--text-muted);
  }

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
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 0.375rem;
  }

  .wide-card {
    grid-column: span 2;
  }

  .metric-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .metric-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-heading);
  }

  .highlight-green {
    color: var(--color-emerald);
  }
  .highlight-red {
    color: var(--color-danger);
  }

  .mode-freq {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .mode-tie-badge {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-gold);
    margin-left: 0.25rem;
  }

  /* Advanced Analytics Section */
  .dice-count-tag {
    font-size: 0.75rem;
    color: var(--text-secondary);
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
    color: var(--accent-blue);
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
    color: var(--color-emerald);
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  .reliability-moderate {
    background: rgba(245, 158, 11, 0.2);
    color: var(--color-amber);
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .reliability-small {
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-danger-light);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .reliability-empty {
    background: rgba(107, 114, 128, 0.2);
    color: var(--text-secondary);
    border: 1px solid rgba(107, 114, 128, 0.4);
  }

  .insight-text {
    margin: 0;
    font-size: 0.825rem;
    line-height: 1.4;
    color: var(--text-body);
  }

  .analytics-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .zscore-tag {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  /* Distribution Chart */
  .distribution-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0.75rem;
    background: var(--surface-dark);
    border: 1px solid var(--border-subtle);
    border-radius: 0.5rem;
  }

  .dist-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .dist-title {
    font-weight: 600;
    color: var(--text-light);
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
    background: var(--color-amber-500);
  }

  .bars-container {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-block-size: 290px;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
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
    color: var(--text-secondary);
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
    color: var(--color-amber);
  }

  .hot-badge {
    font-size: 0.75rem;
  }

  .bar-track {
    position: relative;
    height: 14px;
    background: var(--surface-elevated);
    border-radius: 4px;
    overflow: hidden;
  }

  .empirical-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-sky) 0%, var(--accent-blue) 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .empirical-bar.coin-heads {
    background: linear-gradient(90deg, var(--color-yellow-600) 0%, var(--color-gold) 100%);
  }

  .empirical-bar.coin-tails {
    background: linear-gradient(90deg, var(--border-slate) 0%, var(--text-muted) 100%);
  }

  .empirical-bar.hot-bar {
    background: linear-gradient(90deg, var(--color-amber-600) 0%, var(--color-amber-500) 100%);
  }

  .expected-marker {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--color-amber-500);
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
    color: var(--text-heading);
  }

  .pct-text {
    color: var(--text-secondary);
  }

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
