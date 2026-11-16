<script lang="ts">
  import ControlPanel from './ui/ControlPanel.svelte';
  import ArenaViewport from './ui/ArenaViewport.svelte';
  import SeriesScoreboard from './ui/series/SeriesScoreboard.svelte';
  import StatisticalBreakdown from './ui/series/StatisticalBreakdown.svelte';
  import HistoryPanel from './ui/HistoryPanel.svelte';
  import QuickResultPanel from './ui/quick/QuickResultPanel.svelte';
  import Dialog from './ui/primitives/Dialog.svelte';
  import Tabs from './ui/primitives/Tabs.svelte';
  import { rollState } from './ui/state/rollState.svelte';

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.2';
  const appAuthor = typeof __APP_AUTHOR__ !== 'undefined' ? __APP_AUTHOR__ : 'fabogit';
  const buildYear =
    typeof __BUILD_YEAR__ !== 'undefined' ? __BUILD_YEAR__ : new Date().getFullYear().toString();

  type RightPanelTab = 'scoreboard' | 'analytics' | 'history';

  let showAddPlayerModal = $state(false);
  let newPlayerName = $state('');
  let rightPanelTab = $state<RightPanelTab>('scoreboard');

  // A series belongs to one player: switching mid-series would discard its rounds
  const playerControlsDisabled = $derived(rollState.isRolling || rollState.isSeriesInProgress);

  const rightPanelTabs = $derived([
    {
      id: 'scoreboard',
      label: 'Scoreboard',
      badge:
        rollState.rounds.length > 0
          ? `${rollState.rounds.length}/${rollState.seriesLength}`
          : undefined,
    },
    { id: 'analytics', label: 'Breakdown' },
    {
      id: 'history',
      label: 'History',
      badge: rollState.history.length > 0 ? rollState.history.length : undefined,
    },
  ]);

  function closeAddPlayerModal() {
    showAddPlayerModal = false;
    newPlayerName = '';
  }

  function handleAddPlayerSubmit(e: Event) {
    e.preventDefault();
    if (newPlayerName.trim()) {
      rollState.addPlayer(newPlayerName.trim());
      closeAddPlayerModal();
    }
  }
</script>

<a href="#main-content" class="skip-link sr-only">Skip to main content</a>

<!-- Centralized Screen Reader Live Region (Accessibility Guidance) -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
  {rollState.announcerMessage}
</div>

<div class="app-layout">
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
            onclick={() => (showAddPlayerModal = true)}
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
        maxlength="24"
        bind:value={newPlayerName}
        placeholder="e.g. Robin"
        required
        autofocus
        class="modal-input"
      />
      <div class="modal-actions">
        <button type="button" class="modal-btn cancel" onclick={closeAddPlayerModal}>
          Cancel
        </button>
        <button type="submit" class="modal-btn confirm"> Add Player </button>
      </div>
    </form>
  </Dialog>

  <!-- Main Landmark -->
  <main id="main-content" class="app-main">
    <div class="layout-grid">
      <!-- Left Column: Controls -->
      <div class="column-left">
        <ControlPanel />
      </div>

      <!-- Center Column: 3D Viewport & Toolbar -->
      <div class="column-center">
        <ArenaViewport />
      </div>

      <!-- Right Column: Tabbed Scoreboard/Breakdown/History OR Quick Feed -->
      <div class="column-right">
        {#if rollState.mode === 'quick'}
          <QuickResultPanel />
        {:else}
          <Tabs
            tabs={rightPanelTabs}
            activeTab={rightPanelTab}
            ariaLabel="Series analysis views"
            onSelect={(id) => {
              if (id === 'scoreboard' || id === 'analytics' || id === 'history') {
                rightPanelTab = id;
              }
            }}
          />

          <div
            id="tabpanel-scoreboard"
            role="tabpanel"
            aria-labelledby="tab-scoreboard"
            hidden={rightPanelTab !== 'scoreboard'}
          >
            <SeriesScoreboard />
          </div>
          <div
            id="tabpanel-analytics"
            role="tabpanel"
            aria-labelledby="tab-analytics"
            hidden={rightPanelTab !== 'analytics'}
          >
            <StatisticalBreakdown />
          </div>
          <div
            id="tabpanel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            hidden={rightPanelTab !== 'history'}
          >
            <HistoryPanel />
          </div>
        {/if}
      </div>
    </div>
  </main>

  <!-- Semantic Footer -->
  <footer class="app-footer">
    <div class="footer-group">
      <a
        href="https://github.com/fabogit/dices"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link footer-version"
      >
        Dices v{appVersion}
      </a>
      <span class="footer-sep" aria-hidden="true">·</span>
      <span>© {buildYear}</span>
      <a
        href="https://github.com/fabogit/dices/blob/main/LICENSE"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link"
      >
        MIT License
      </a>
    </div>

    <div class="footer-group">
      <span>
        Made with <span aria-hidden="true">❤️</span><span class="sr-only">love</span> &amp;
        <span aria-hidden="true">🤖</span><span class="sr-only">AI</span> by
        <a
          href="https://github.com/fabogit"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >
          {appAuthor}
        </a>
      </span>
    </div>
  </footer>
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

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

  /* Main Grid Layout */
  .app-main {
    flex: 1;
    padding: 1.25rem;
    max-width: 1680px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .layout-grid {
    display: grid;
    grid-template-columns: 310px 1fr 380px;
    gap: 1.25rem;
    align-items: start;
  }

  .column-left {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .column-center {
    display: flex;
    flex-direction: column;
  }

  .column-right {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Semantic Footer */
  .app-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
    padding: 0.85rem 1.5rem;
    background: var(--surface-footer);
    border-top: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .footer-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .footer-sep {
    color: var(--border-muted);
  }

  .footer-link {
    display: inline-flex;
    align-items: center;
    min-block-size: 24px;
    padding: 0.1rem 0.25rem;
    color: var(--accent-blue);
    font-weight: 600;
    text-decoration: none;
    border-radius: 0.25rem;
    transition:
      color 0.15s ease,
      text-decoration-color 0.15s ease;
  }

  .footer-link:hover {
    color: var(--accent-blue-light);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .footer-version {
    color: var(--text-primary);
  }

  .footer-version:hover {
    color: var(--accent-blue);
  }

  /* Responsive Breakpoints */
  @media (max-width: 1200px) {
    .layout-grid {
      grid-template-columns: 300px 1fr;
    }
    .column-right {
      grid-column: span 2;
      display: flex;
      flex-direction: column;
    }
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
    .app-footer {
      justify-content: center;
      text-align: center;
    }
    .footer-group {
      justify-content: center;
    }
  }

  @media (max-width: 860px) {
    .layout-grid {
      grid-template-columns: 1fr;
    }
    .column-right {
      grid-column: span 1;
      display: flex;
      flex-direction: column;
    }
  }

  a:focus-visible,
  button:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
