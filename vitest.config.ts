import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig as defineViteConfig } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
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
          'src/ui/rollState.svelte.ts',
          'src/ui/primitives/**/*.svelte',
        ],
        thresholds: {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
      },
    },
  }),
);
