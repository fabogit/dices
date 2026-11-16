<script lang="ts">
  import { MAX_PLAYER_NAME_LENGTH } from '../../core/persistence';
  import Dialog from '../primitives/Dialog.svelte';
  import type { AddPlayerResult } from '../state/rollState.svelte';
  import { rollState } from '../state/rollState.svelte';

  let showAddPlayerModal = $state(false);
  let newPlayerName = $state('');
  let addPlayerError = $state('');

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
    addPlayerError = '';
  }

  function openAddPlayerModal() {
    addPlayerError = '';
    showAddPlayerModal = true;
  }

  function handleAddPlayerSubmit(e: Event) {
    e.preventDefault();
    const result = rollState.addPlayer(newPlayerName);
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
    <!-- Mode Toggle (Quick Roll vs Series) -->
    <div class="mode-switch-group" role="group" aria-label="Application mode">
      <button
        type="button"
        class="mode-btn"
        class:active={rollState.mode === 'quick'}
        aria-pressed={rollState.mode === 'quick'}
        disabled={rollState.isRolling || rollState.isAutoRolling}
        onclick={() => rollState.setMode('quick')}
      >
        ⚡ Quick Roll
      </button>
      <button
        type="button"
        class="mode-btn"
        class:active={rollState.mode === 'series'}
        aria-pressed={rollState.mode === 'series'}
        disabled={rollState.isRolling || rollState.isAutoRolling}
        onclick={() => rollState.setMode('series')}
      >
        📊 Series
      </button>
    </div>

    <!-- Player Selector & Actions (Series Mode Only) -->
    {#if rollState.mode === 'series'}
      <div class="player-selector-group">
        <label for="player-select" class="player-label">Player:</label>
        <select
          id="player-select"
          class="player-select"
          value={rollState.activePlayerId}
          disabled={playerControlsDisabled}
          onchange={(e) => rollState.setActivePlayer((e.target as HTMLSelectElement).value)}
        >
          {#each rollState.players as p (p.id)}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>

        <button
          type="button"
          class="btn-add-player"
          disabled={playerControlsDisabled}
          onclick={openAddPlayerModal}
          aria-label="Add new local player"
        >
          + Player
        </button>
      </div>
    {/if}

    <!-- Instant Fast Roll Toggle -->
    <button
      type="button"
      class="instant-toggle-btn"
      class:active={rollState.instantMode}
      aria-pressed={rollState.instantMode}
      onclick={() => rollState.toggleInstantMode()}
      title="Toggle instant roll mode without 3D kinematic tumble"
    >
      <span class="toggle-icon">⚡</span>
      <span>{rollState.instantMode ? 'Fast: ON' : 'Fast: OFF'}</span>
    </button>
  </div>
</header>

<!-- Add Player Dialog / Modal -->
<Dialog open={showAddPlayerModal} title="Add Local Player" onClose={closeAddPlayerModal}>
  <form onsubmit={handleAddPlayerSubmit} class="modal-form">
    <label for="new-player-input" class="modal-label">Player Name:</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      id="new-player-input"
      type="text"
      maxlength={MAX_PLAYER_NAME_LENGTH}
      bind:value={newPlayerName}
      oninput={() => (addPlayerError = '')}
      placeholder="e.g. Robin"
      aria-invalid={addPlayerError ? 'true' : undefined}
      aria-describedby={addPlayerError ? 'new-player-error' : undefined}
      autofocus
      class="modal-input"
    />
    {#if addPlayerError}
      <p id="new-player-error" class="modal-error" role="alert">{addPlayerError}</p>
    {/if}
    <div class="modal-actions">
      <button type="button" class="modal-btn cancel" onclick={closeAddPlayerModal}> Cancel </button>
      <button type="submit" class="modal-btn confirm"> Add Player </button>
    </div>
  </form>
</Dialog>

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

  .mode-switch-group {
    display: inline-flex;
    background: var(--surface-dark);
    border: 1px solid var(--border-subtle);
    border-radius: 0.5rem;
    padding: 2px;
  }

  .mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.75rem;
    min-block-size: 32px;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mode-btn:hover:not(.active):not(:disabled) {
    color: var(--text-primary);
  }

  .mode-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mode-btn.active {
    background: var(--primary-blue);
    color: var(--text-white);
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
  }

  .player-selector-group {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .player-label {
    font-size: 0.825rem;
    color: var(--text-secondary);
  }

  .player-select {
    padding: 0.35rem 0.65rem;
    min-block-size: 32px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-add-player {
    padding: 0.35rem 0.65rem;
    min-block-size: 32px;
    background: transparent;
    border: 1px dashed var(--border-dashed);
    border-radius: 0.375rem;
    color: var(--accent-blue);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-add-player:hover:not(:disabled) {
    border-color: var(--accent-blue);
    background: rgba(56, 189, 248, 0.1);
  }

  .player-select:disabled,
  .btn-add-player:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .instant-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    min-block-size: 32px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .instant-toggle-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .instant-toggle-btn.active {
    background: rgba(124, 58, 237, 0.3);
    border-color: var(--accent-violet);
    color: #f5f3ff;
  }

  .toggle-icon {
    font-size: 0.95rem;
  }

  /* Modal Form */
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .modal-input {
    padding: 0.5rem 0.75rem;
    min-block-size: 38px;
    background: var(--surface-dark);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .modal-input[aria-invalid='true'] {
    border-color: var(--color-danger);
  }

  .modal-error {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-danger-light);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .modal-btn {
    padding: 0.5rem 1rem;
    min-block-size: 36px;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .modal-btn.cancel {
    background: transparent;
    border: 1px solid var(--border-muted);
    color: var(--text-secondary);
  }

  .modal-btn.confirm {
    background: var(--primary-blue);
    border: 1px solid var(--accent-blue);
    color: var(--text-white);
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

  button:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
