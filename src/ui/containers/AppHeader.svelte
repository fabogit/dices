<script lang="ts">
  import AddPlayerDialog from '../header/AddPlayerDialog.svelte';
  import InstantModeToggle from '../header/InstantModeToggle.svelte';
  import ModeSwitch from '../header/ModeSwitch.svelte';
  import PlayerSelector from '../header/PlayerSelector.svelte';
  import type { AddPlayerResult } from '../state/rollState.svelte';
  import { getRollState } from '../state/rollStateContext';

  const rollState = getRollState();

  let showAddPlayerModal = $state(false);
  let newPlayerName = $state('');
  let addPlayerError = $state<string | undefined>();

  const ADD_PLAYER_ERRORS: Record<Extract<AddPlayerResult, { ok: false }>['reason'], string> = {
    empty: 'Enter a name.',
    duplicate: 'A player with this name already exists.',
    locked: "Players can't be added while a roll or series is in progress.",
  };

  // A series belongs to one player: switching mid-series would discard its rounds
  const playerControlsDisabled = $derived(rollState.isRolling || rollState.isSeriesInProgress);

  function closeAddPlayerModal() {
    showAddPlayerModal = false;
    newPlayerName = '';
    addPlayerError = undefined;
  }

  function openAddPlayerModal() {
    addPlayerError = undefined;
    showAddPlayerModal = true;
  }

  function handleNameInput(name: string) {
    newPlayerName = name;
    addPlayerError = undefined;
  }

  function handleAddPlayerSubmit(name: string) {
    const result = rollState.addPlayer(name);
    if (result.ok) {
      closeAddPlayerModal();
    } else {
      addPlayerError = ADD_PLAYER_ERRORS[result.reason];
    }
  }
</script>

<!-- Semantic Header -->
<header class="app-header">
  <div class="header-branding">
    <h1 class="app-title">
      <span class="title-gradient">Dices</span>
      <span class="subtitle">3D CSPRNG Roller</span>
    </h1>
  </div>

  <!-- Mode Switch & Controls -->
  <div class="header-controls">
    <ModeSwitch
      mode={rollState.mode}
      disabled={rollState.isRolling || rollState.isAutoRolling}
      onSelect={(mode) => rollState.setMode(mode)}
    />

    {#if rollState.mode === 'series'}
      <PlayerSelector
        players={rollState.players}
        activePlayerId={rollState.activePlayerId}
        disabled={playerControlsDisabled}
        onSelect={(playerId) => rollState.setActivePlayer(playerId)}
        onAddPlayer={openAddPlayerModal}
      />
    {/if}

    <InstantModeToggle
      active={rollState.instantMode}
      onToggle={() => rollState.toggleInstantMode()}
    />
  </div>
</header>

<AddPlayerDialog
  open={showAddPlayerModal}
  name={newPlayerName}
  error={addPlayerError}
  onNameInput={handleNameInput}
  onSubmit={handleAddPlayerSubmit}
  onClose={closeAddPlayerModal}
/>

<style>
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.85rem 1.5rem;
    background: rgba(17, 24, 39, 0.9);
    border-bottom: 1px solid var(--border-color);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .header-branding {
    display: flex;
    align-items: center;
  }

  .app-title {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.65rem;
  }

  .title-gradient {
    font-size: 1.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-indigo) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 0.825rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  @media (max-width: 920px) {
    .app-header {
      justify-content: center;
    }
    .header-branding {
      justify-content: center;
    }
    .header-controls {
      justify-content: center;
    }
  }
</style>
