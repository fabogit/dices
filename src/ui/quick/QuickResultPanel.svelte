<script lang="ts">
  import { computeQuickRollSessionStats, computeQuickRollStats } from '../../core/engine';
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import EmptyState from '../primitives/EmptyState.svelte';
  import { rollState } from '../state/rollState.svelte';
  import LatestRollHero from './LatestRollHero.svelte';
  import QuickRollFeed from './QuickRollFeed.svelte';
  import SessionSummaryStrip from './SessionSummaryStrip.svelte';

  let isCollapsed = $state(false);

  const sessionStats = $derived(
    computeQuickRollSessionStats(rollState.quickRolls, rollState.faces),
  );
  const latestStats = $derived(
    rollState.latestQuickRoll ? computeQuickRollStats(rollState.latestQuickRoll) : null,
  );
</script>

<CollapsiblePanel
  title="Quick Roll Feed"
  collapsed={isCollapsed}
  onToggle={() => (isCollapsed = !isCollapsed)}
  variant="quick"
>
  {#snippet badge()}
    <span class="count-badge">{rollState.quickRollCount} in session</span>
  {/snippet}

  {#if latestStats}
    <LatestRollHero stats={latestStats} />
  {:else}
    <EmptyState variant="card" icon="🎲" title="Ready to Roll">
      Click <strong>Roll</strong> in the 3D Arena below the viewport for continuous instant rolls.
    </EmptyState>
  {/if}

  {#if sessionStats.kind !== 'empty' && sessionStats.matchingThrows >= 2}
    <SessionSummaryStrip {sessionStats} />
  {/if}

  {#if rollState.quickRolls.length > 0}
    <QuickRollFeed
      items={rollState.quickRolls}
      isRolling={rollState.isRolling}
      onClear={() => rollState.clearQuickRolls()}
    />
  {/if}
</CollapsiblePanel>

<style>
  .count-badge {
    padding: 0.2rem 0.5rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    font-size: 0.72rem;
    color: var(--text-secondary);
  }
</style>
