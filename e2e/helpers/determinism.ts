import type { Locator, Page } from '@playwright/test';

const DEFAULT_FIXED_TIMESTAMP = '2026-01-15T12:00:00.000Z';
const DEFAULT_PRNG_SEED = 0x5f3759df;

/**
 * Installs a deterministic RNG in the browser page before any application code
 * executes, keeping production bundles completely free of test hooks.
 *
 * - When `sequence` is provided, each `Uint32Array` slot requested via
 *   `crypto.getRandomValues` cycles through the supplied uint32 values
 *   (matching `rollCryptoFair`, which maps `(rand % faces) + 1`).
 * - When `sequence` is omitted, a seeded Mulberry32 PRNG supplies both
 *   `crypto.getRandomValues` and `Math.random()` deterministically.
 */
export async function installDeterministicRng(
  page: Page,
  sequence?: readonly number[],
): Promise<void> {
  if (sequence !== undefined && sequence.length === 0) {
    throw new Error('Deterministic RNG sequence must not be empty.');
  }

  const normalizedSequence = sequence?.map((value) => value >>> 0) ?? null;

  await page.addInitScript(
    ({ seq, seed }) => {
      let state = seed >>> 0;
      let cursor = 0;

      const nextUint32 = (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return (t ^ (t >>> 14)) >>> 0;
      };

      const deterministicGetRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
        if (array === null) {
          return array;
        }

        if (array instanceof Uint32Array) {
          for (let i = 0; i < array.length; i++) {
            array[i] = seq === null ? nextUint32() : seq[cursor++ % seq.length];
          }
          return array;
        }

        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = nextUint32() & 0xff;
        }
        return array;
      };

      try {
        window.crypto.getRandomValues = deterministicGetRandomValues;
      } catch {
        Object.defineProperty(window.crypto, 'getRandomValues', {
          value: deterministicGetRandomValues,
          configurable: true,
          writable: true,
        });
      }

      Math.random = (): number => nextUint32() / 0x100000000;
    },
    { seq: normalizedSequence, seed: DEFAULT_PRNG_SEED },
  );
}

/**
 * Fixes `Date.now()` and `new Date()` to a deterministic timestamp while leaving
 * `requestAnimationFrame`, `performance.now()`, and timers running normally so
 * Three.js / Svelte animations never stall.
 */
export async function installFixedClock(
  page: Page,
  time: number | string | Date = DEFAULT_FIXED_TIMESTAMP,
): Promise<void> {
  await page.clock.setFixedTime(time);
}

/**
 * Returns the default locator mask covering the 3D WebGL arena canvas so
 * layout/UI visual regression snapshots do not flake on GPU/SwiftShader pixel jitter.
 */
export function defaultCanvasMask(page: Page): Locator[] {
  return [page.getByRole('region', { name: '3D Dice Arena Viewport' }).locator('canvas')];
}
