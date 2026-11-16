<script lang="ts">
  import ArenaViewport from './ui/arena/ArenaViewport.svelte';
  import ControlPanel from './ui/controls/ControlPanel.svelte';
  import AppFooter from './ui/layout/AppFooter.svelte';
  import AppHeader from './ui/layout/AppHeader.svelte';
  import RightPanel from './ui/layout/RightPanel.svelte';
  import { rollState } from './ui/state/rollState.svelte';

  const appVersion = __APP_VERSION__;
  const appAuthor = __APP_AUTHOR__;
  const buildYear = __BUILD_YEAR__;
</script>

<a href="#main-content" class="skip-link sr-only">Skip to main content</a>

<!-- Centralized Screen Reader Live Region (Accessibility Guidance) -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
  {rollState.announcerMessage}
</div>

<div class="app-layout">
  <AppHeader />

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
        <RightPanel />
      </div>
    </div>
  </main>

  <AppFooter version={appVersion} author={appAuthor} {buildYear} />
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
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
</style>
