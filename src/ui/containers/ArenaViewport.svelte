<script lang="ts">
  import { onMount } from 'svelte';
  import type { DiceArena3D } from '../../three/DiceArena3D';
  import CollapsiblePanel from '../primitives/CollapsiblePanel.svelte';
  import { getRollState } from '../state/rollStateContext';
  import ArenaHud from '../arena/ArenaHud.svelte';
  import ArenaToolbar from '../arena/ArenaToolbar.svelte';

  const rollState = getRollState();

  let canvasElement: HTMLCanvasElement;
  let arena: DiceArena3D | null = null;
  let isCollapsed = $state(false);

  const currentRoll = $derived(
    rollState.mode === 'quick' ? rollState.latestQuickRoll : rollState.latestRound,
  );
  // The HUD must label values with the die that produced them: the selected instrument
  // can change while the previous quick roll is still on display.
  const currentRollFaces = $derived(currentRoll ? currentRoll.faces : rollState.faces);

  onMount(() => {
    let destroyed = false;

    void (async () => {
      try {
        const { DiceArena3D: ArenaClass } = await import('../../three/DiceArena3D');
        if (destroyed || !canvasElement) return;
        arena = new ArenaClass(canvasElement, {
          onContextLost: () => {
            rollState.setContextLost(true);
          },
          onContextRestored: () => {
            rollState.setContextLost(false);
          },
        });
        rollState.setArena(arena);
      } catch (err) {
        console.error('Failed to load 3D Dice Arena:', err);
      }
    })();

    return () => {
      destroyed = true;
      if (arena) {
        arena.dispose();
        rollState.setArena(null);
        arena = null;
      }
    };
  });

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }
</script>

<CollapsiblePanel
  title="3D Dice Arena"
  collapsed={isCollapsed}
  onToggle={toggleCollapse}
  variant="arena"
  headingId="arena-heading"
  expandText="Show Arena"
  collapseText="Hide Arena"
  expandAriaLabel="Show Arena for 3D Dice"
  collapseAriaLabel="Hide Arena for 3D Dice"
>
  <div class="arena-viewport" role="region" aria-label="3D Dice Arena Viewport">
    <canvas bind:this={canvasElement} class="three-canvas" data-testid="dice-canvas"></canvas>

    <ArenaHud
      mode={rollState.mode}
      contextLost={rollState.contextLost}
      isRolling={rollState.isRolling}
      isComplete={rollState.isComplete}
      instantMode={rollState.instantMode}
      roundsCount={rollState.rounds.length}
      seriesLength={rollState.summary.config.seriesLength}
      roll={currentRoll}
      rollFaces={currentRollFaces}
    />
  </div>

  <ArenaToolbar
    mode={rollState.mode}
    faces={rollState.faces}
    countPerRoll={rollState.countPerRoll}
    isRolling={rollState.isRolling}
    isAutoRolling={rollState.isAutoRolling}
    isComplete={rollState.isComplete}
    instantMode={rollState.instantMode}
    quickRollsCount={rollState.quickRolls.length}
    roundsCount={rollState.rounds.length}
    seriesLength={rollState.summary.config.seriesLength}
    onQuickRoll={() => rollState.executeQuickRoll()}
    onClearQuickRolls={() => rollState.clearQuickRolls()}
    onRollRound={() => rollState.rollNextRound()}
    onAutoRoll={() => rollState.autoRollSeries()}
    onStopAutoRoll={() => rollState.stopAutoRoll()}
    onResetSeries={() => rollState.resetCurrentSeries()}
    onSkipAnimation={() => rollState.skipAnimation()}
  />
</CollapsiblePanel>

<style>
  .arena-viewport {
    position: relative;
    width: 100%;
    height: 400px;
    max-height: 400px;
    background: radial-gradient(
      circle at center,
      var(--surface-dark) 0%,
      var(--surface-deepest) 100%
    );
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  @media (max-width: 860px) {
    .arena-viewport {
      height: 220px;
      min-height: 220px;
      max-height: 220px;
    }
  }

  .three-canvas {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    display: block;
    outline: none;
  }
</style>
