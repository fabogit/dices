import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig as defineViteConfig } from 'vite';
import { coverageConfigDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  mergeConfig(viteConfig, defineViteConfig({ plugins: [svelteTesting()] })),
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.{test,spec}.{js,ts}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: [
          'src/core/**/*.ts',
          'src/lib/**/*.ts',
          'src/three/geometries.ts',
          'src/three/DiceArena3D.ts',
          'src/ui/state/rollState.svelte.ts',
          'src/ui/primitives/**/*.svelte',
          'src/ui/{layout,controls,arena,history,quick,series}/*.svelte',
        ],
        // Keep this container opt-out list aligned with the `"no-restricted-imports": "off"` overrides in `.oxlintrc.json`.
        exclude: [
          ...coverageConfigDefaults.exclude,
          'src/ui/layout/AppHeader.svelte',
          'src/ui/layout/RightPanel.svelte',
          'src/ui/controls/ControlPanel.svelte',
          'src/ui/arena/ArenaViewport.svelte',
          'src/ui/history/HistoryPanel.svelte',
          'src/ui/quick/QuickResultPanel.svelte',
          'src/ui/series/SeriesScoreboard.svelte',
          'src/ui/series/StatisticalBreakdown.svelte',
        ],
        thresholds: {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
          'src/core/**/*.ts': {
            statements: 90,
            branches: 85,
            functions: 90,
            lines: 90,
          },
          'src/ui/state/**/*.ts': {
            statements: 90,
            branches: 85,
            functions: 90,
            lines: 90,
          },
          'src/ui/**/*.svelte': {
            statements: 90,
            branches: 75,
            functions: 90,
            lines: 90,
          },
        },
      },
    },
  }),
);
