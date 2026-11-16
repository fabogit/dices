import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import * as THREE from 'three';
import { DiceArena3D } from '../DiceArena3D';
import { computeTargetQuaternion } from '../geometries';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class FakeWebGLRenderer {
    shadowMap = { enabled: false, type: 0 };
    setSize = vi.fn<() => void>();
    setPixelRatio = vi.fn<() => void>();
    render = vi.fn<() => void>();
    dispose = vi.fn<() => void>();
  }
  return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

type CanvasListener = (event: Event) => void;

function createFakeCanvas() {
  const listeners = new Map<string, CanvasListener>();
  const canvas = {
    parentElement: null,
    clientWidth: 640,
    clientHeight: 360,
    addEventListener: (type: string, listener: CanvasListener) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
  };
  const emit = (type: string): void => {
    listeners.get(type)?.({ preventDefault: () => {} } as Event);
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, emit, listeners };
}

function diceMeshes(arena: DiceArena3D): THREE.Mesh[] {
  return arena.scene.children.filter(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh && Array.isArray(child.material),
  );
}

describe('DiceArena3D roll lifecycle', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 16));
    vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('places dice at rest immediately when the animation is skipped', async () => {
    const { canvas } = createFakeCanvas();
    const arena = new DiceArena3D(canvas);

    await arena.rollVisual(6, [4], { skipAnimation: true });

    const [die] = diceMeshes(arena);
    expect(die?.position.toArray()).toEqual([0, 0.85, 0]);
    expect(die?.quaternion.angleTo(computeTargetQuaternion(6, 4, 0))).toBeCloseTo(0, 6);
    arena.dispose();
  });

  it('runs an animated roll to completion and lands on the target orientation', async () => {
    const { canvas } = createFakeCanvas();
    const arena = new DiceArena3D(canvas);

    await arena.rollVisual(20, [17], { durationMs: 40 });

    const [die] = diceMeshes(arena);
    expect(die?.position.toArray()).toEqual([0, 0.85, 0]);
    expect(die?.quaternion.angleTo(computeTargetQuaternion(20, 17, 0))).toBeCloseTo(0, 6);
    arena.dispose();
  });

  it('settles the pending roll when the WebGL context is lost mid-animation', async () => {
    vi.useFakeTimers();
    const { canvas, emit } = createFakeCanvas();
    const onContextLost = vi.fn<() => void>();
    const arena = new DiceArena3D(canvas, { onContextLost });

    let settled = false;
    const roll = arena.rollVisual(6, [3, 5]).then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(32);
    expect(settled).toBe(false);

    emit('webglcontextlost');
    await roll;

    expect(settled).toBe(true);
    expect(onContextLost).toHaveBeenCalledTimes(1);
    for (const die of diceMeshes(arena)) {
      expect(die.position.y).toBeCloseTo(0.85, 6);
    }
    arena.dispose();
  });

  it('shows the rolled faces at rest for a roll requested while the context is lost', async () => {
    const { canvas, emit } = createFakeCanvas();
    const onContextRestored = vi.fn<() => void>();
    const arena = new DiceArena3D(canvas, { onContextRestored });

    emit('webglcontextlost');
    await arena.rollVisual(6, [2]);

    const [die] = diceMeshes(arena);
    expect(die?.position.toArray()).toEqual([0, 0.85, 0]);
    expect(die?.quaternion.angleTo(computeTargetQuaternion(6, 2, 0))).toBeCloseTo(0, 6);

    emit('webglcontextrestored');
    expect(onContextRestored).toHaveBeenCalledTimes(1);
    arena.dispose();
  });

  it('resolves the in-flight roll on skip, replaces dice between rolls, and rejects after dispose', async () => {
    vi.useFakeTimers();
    const { canvas, listeners } = createFakeCanvas();
    const arena = new DiceArena3D(canvas);

    const first = arena.rollVisual(2, [1, 2, 1]);
    await vi.advanceTimersByTimeAsync(16);
    arena.skipCurrentAnimation();
    await first;
    expect(diceMeshes(arena)).toHaveLength(3);

    await arena.rollVisual(8, [], { skipAnimation: true });
    await arena.rollVisual(8, [8, 1, 4, 6, 2], { skipAnimation: true });
    expect(diceMeshes(arena)).toHaveLength(5);

    arena.dispose();
    arena.dispose();
    expect(listeners.size).toBe(0);
    expect(diceMeshes(arena)).toHaveLength(0);
    await expect(arena.rollVisual(6, [1])).rejects.toThrow('disposed');
  });
});
