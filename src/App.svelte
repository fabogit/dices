<script lang="ts">
  import ControlPanel from './ui/ControlPanel.svelte';
  import ArenaViewport from './ui/ArenaViewport.svelte';
  import SeriesScoreboard from './ui/SeriesScoreboard.svelte';
  import HistoryPanel from './ui/HistoryPanel.svelte';
  import QuickResultPanel from './ui/QuickResultPanel.svelte';
  import { rollState } from './ui/rollState.svelte';

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.2';
  const appAuthor = typeof __APP_AUTHOR__ !== 'undefined' ? __APP_AUTHOR__ : 'fabogit';
  const buildYear =
    typeof __BUILD_YEAR__ !== 'undefined' ? __BUILD_YEAR__ : new Date().getFullYear().toString();

  type RightPanelTab = 'scoreboard' | 'analytics' | 'history';
  const RIGHT_TABS: RightPanelTab[] = ['scoreboard', 'analytics', 'history'];

  let showAddPlayerModal = $state(false);
  let newPlayerName = $state('');
  let rightPanelTab = $state<RightPanelTab>('scoreboard');

  function handleTabKeyDown(e: KeyboardEvent) {
    const currentIndex = RIGHT_TABS.indexOf(rightPanelTab);
    let nextIndex = -1;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % RIGHT_TABS.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + RIGHT_TABS.length) % RIGHT_TABS.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = RIGHT_TABS.length - 1;

    if (nextIndex !== -1) {
      e.preventDefault();
      const nextTab = RIGHT_TABS[nextIndex]!;
      rightPanelTab = nextTab;
      document.getElementById(`tab-${nextTab}`)?.focus();
    }
  }

  function handleAddPlayerSubmit(e: Event) {
    e.preventDefault();
    if (newPlayerName.trim()) {
      rollState.addPlayer(newPlayerName.trim());
      newPlayerName = '';
      showAddPlayerModal = false;
    }
  }
</script>

<a href="#main-content" class="skip-link sr-only">Skip to main content</a>

<!-- Centralized Screen Reader Live Region (Accessibility Guidance) -->
<div class="sr-only" aria-live="polite" aria-atomic="true">
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
          onclick={() => rollState.setMode('quick')}
        >
          ⚡ Quick Roll
        </button>
        <button
          type="button"
          class="mode-btn"
          class:active={rollState.mode === 'series'}
          aria-pressed={rollState.mode === 'series'}
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
            onchange={(e) => rollState.setActivePlayer((e.target as HTMLSelectElement).value)}
          >
            {#each rollState.players as p (p.id)}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>

          <button
            type="button"
            class="btn-add-player"
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
  {#if showAddPlayerModal}
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-player-title">
      <div class="modal-content">
        <h2 id="add-player-title" class="modal-title">Add Local Player</h2>
        <form onsubmit={handleAddPlayerSubmit} class="modal-form">
          <label for="new-player-input" class="modal-label">Player Name:</label>
          <input
            id="new-player-input"
            type="text"
            maxlength="24"
            bind:value={newPlayerName}
            placeholder="e.g. Robin"
            required
            class="modal-input"
          />
          <div class="modal-actions">
            <button
              type="button"
              class="modal-btn cancel"
              onclick={() => {
                showAddPlayerModal = false;
                newPlayerName = '';
              }}
            >
              Cancel
            </button>
            <button type="submit" class="modal-btn confirm">
              Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

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
          <div
            class="right-panel-tabs"
            role="tablist"
            aria-label="Series analysis views"
          >
            <button
              id="tab-scoreboard"
              type="button"
              role="tab"
              class="panel-tab-btn"
              class:active={rightPanelTab === 'scoreboard'}
              aria-selected={rightPanelTab === 'scoreboard'}
              aria-controls="tabpanel-scoreboard"
              tabindex={rightPanelTab === 'scoreboard' ? 0 : -1}
              onkeydown={handleTabKeyDown}
              onclick={() => (rightPanelTab = 'scoreboard')}
            >
              <span>Scoreboard</span>
              {#if rollState.rounds.length > 0}
                <span class="tab-badge">{rollState.rounds.length}/{rollState.seriesLength}</span>
              {/if}
            </button>
            <button
              id="tab-analytics"
              type="button"
              role="tab"
              class="panel-tab-btn"
              class:active={rightPanelTab === 'analytics'}
              aria-selected={rightPanelTab === 'analytics'}
              aria-controls="tabpanel-analytics"
              tabindex={rightPanelTab === 'analytics' ? 0 : -1}
              onkeydown={handleTabKeyDown}
              onclick={() => (rightPanelTab = 'analytics')}
            >
              <span>Breakdown</span>
            </button>
            <button
              id="tab-history"
              type="button"
              role="tab"
              class="panel-tab-btn"
              class:active={rightPanelTab === 'history'}
              aria-selected={rightPanelTab === 'history'}
              aria-controls="tabpanel-history"
              tabindex={rightPanelTab === 'history' ? 0 : -1}
              onkeydown={handleTabKeyDown}
              onclick={() => (rightPanelTab = 'history')}
            >
              <span>History</span>
              {#if rollState.history.length > 0}
                <span class="tab-badge">{rollState.history.length}</span>
              {/if}
            </button>
          </div>

          <div
            id="tabpanel-scoreboard"
            role="tabpanel"
            aria-labelledby="tab-scoreboard"
            hidden={rightPanelTab !== 'scoreboard'}
          >
            <SeriesScoreboard section="scoreboard" />
          </div>
          <div
            id="tabpanel-analytics"
            role="tabpanel"
            aria-labelledby="tab-analytics"
            hidden={rightPanelTab !== 'analytics'}
          >
            <SeriesScoreboard section="analytics" />
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
  :global(:root) {
    color-scheme: dark;
    --bg-dark: #090d16;
    --surface-dark: #111827;
    --border-color: rgba(75, 85, 99, 0.4);
    --primary-blue: #0369a1;
    --primary-blue-dark: #075985;
    --accent-blue: #38bdf8;
    --text-primary: #f9fafb;
    --text-secondary: #9ca3af;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background-color: var(--bg-dark);
    color: var(--text-primary);
    min-height: 100vh;
  }

  /* Visually Hidden Utility - Modern Web Guidance */
  :global(.sr-only:where(:not(:focus-within, :active))) {
    position: absolute !important;
    clip-path: inset(50%) !important;
    overflow: hidden !important;
    width: 1px !important;
    height: 1px !important;
    margin: -1px !important;
    padding: 0 !important;
    border: 0 !important;
    white-space: nowrap !important;
  }

  :global(.collapse-toggle-btn) {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    min-block-size: 28px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  :global(.collapse-toggle-btn:hover) {
    background: #374151;
    color: #f3f4f6;
  }

  :global(.collapse-toggle-btn .chevron) {
    font-size: 0.85rem;
    color: var(--accent-blue);
  }

  .skip-link:focus-visible {
    position: fixed !important;
    top: 1rem !important;
    left: 1rem !important;
    z-index: 1000 !important;
    background: var(--primary-blue) !important;
    color: #ffffff !important;
    padding: 0.6rem 1.2rem !important;
    border-radius: 0.375rem !important;
    outline: 3px solid #38bdf8 !important;
    clip-path: none !important;
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
    text-decoration: none !important;
    font-weight: 700 !important;
  }

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
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text;
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
    background: #111827;
    border: 1px solid #374151;
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

  .mode-btn:hover {
    color: var(--text-primary);
  }

  .mode-btn.active {
    background: var(--primary-blue);
    color: #ffffff;
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
    background: #1f2937;
    border: 1px solid #4b5563;
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
    border: 1px dashed #6b7280;
    border-radius: 0.375rem;
    color: var(--accent-blue);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-add-player:hover {
    border-color: var(--accent-blue);
    background: rgba(56, 189, 248, 0.1);
  }

  .instant-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    min-block-size: 32px;
    background: #1f2937;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .instant-toggle-btn:hover {
    background: #374151;
    color: var(--text-primary);
  }

  .instant-toggle-btn.active {
    background: rgba(124, 58, 237, 0.3);
    border-color: #a78bfa;
    color: #f5f3ff;
  }

  .toggle-icon {
    font-size: 0.95rem;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 7, 18, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .modal-content {
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.75rem;
    padding: 1.5rem;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  }

  .modal-title {
    margin: 0 0 1rem 0;
    font-size: 1.15rem;
    color: var(--text-primary);
  }

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
    background: #111827;
    border: 1px solid #4b5563;
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
    border: 1px solid #4b5563;
    color: var(--text-secondary);
  }

  .modal-btn.confirm {
    background: var(--primary-blue);
    border: 1px solid var(--accent-blue);
    color: #ffffff;
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

  .right-panel-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--surface-dark);
    border: 1px solid var(--border-color);
    border-radius: 0.65rem;
  }

  .panel-tab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-block-size: 34px;
    padding: 0.35rem 0.5rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.45rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .panel-tab-btn:hover {
    color: var(--text-primary);
    background: rgba(31, 41, 55, 0.7);
  }

  .panel-tab-btn.active {
    background: var(--primary-blue);
    border-color: var(--accent-blue);
    color: #ffffff;
  }

  .tab-badge {
    padding: 0.05rem 0.35rem;
    border-radius: 9999px;
    font-size: 0.68rem;
    font-weight: 700;
    background: #1f2937;
    color: var(--accent-blue);
  }

  .panel-tab-btn.active .tab-badge {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  /* Semantic Footer */
  .app-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
    padding: 0.85rem 1.5rem;
    background: #0f1523;
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
    color: #4b5563;
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
    transition: color 0.15s ease, text-decoration-color 0.15s ease;
  }

  .footer-link:hover {
    color: #7dd3fc;
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

  a:focus-visible, button:focus-visible, select:focus-visible, input:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
