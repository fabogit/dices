<script lang="ts">
  import type { DieFaces, FaceDistributionEntry } from '../../core/types';
  import { formatSigned } from '../../lib/format';
  import DeltaBadge from '../primitives/DeltaBadge.svelte';

  interface Props {
    distribution: ReadonlyArray<FaceDistributionEntry>;
    faces: DieFaces;
  }

  let { distribution, faces }: Props = $props();
</script>

<!-- Face Frequency Distribution (Bar Chart vs Theoretical Line) wrapped in semantic figure -->
<figure class="distribution-card">
  <figcaption class="dist-header">
    <span class="dist-title">Empirical vs Expected Distribution</span>
    <span class="expected-legend">
      <span class="legend-line" aria-hidden="true"></span>
      <span>Expected: {distribution[0]?.expectedPercentage.toFixed(1)}%</span>
    </span>
  </figcaption>

  <div class="bars-container" role="group" aria-label="Face frequency distribution bars">
    {#each distribution as item (item.face)}
      {@const showHot = item.isHot && faces > 2}
      <div class="dist-row" data-testid="dist-row">
        <span
          class="face-label"
          class:coin-label={faces === 2}
          class:hot-face-label={showHot}
          data-testid={showHot ? 'hot-face' : undefined}
        >
          {item.label}
          {#if showHot}
            <span class="hot-badge" data-testid="hot-badge" aria-hidden="true" title="Hot face"
              >🔥</span
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
            class:coin-heads={faces === 2 && item.face === 1}
            class:coin-tails={faces === 2 && item.face === 2}
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

<style>
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
    box-shadow: 0 0 4px var(--color-amber-500-a80);
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
</style>
