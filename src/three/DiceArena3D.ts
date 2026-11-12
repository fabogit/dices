import * as THREE from 'three';
import { type DieFaces } from '../core/types';
import { computeTargetQuaternion, createDieMesh } from './geometries';

export interface DiceArenaOptions {
  onContextLost?: () => void;
  onContextRestored?: () => void;
  shadows?: boolean;
}

export interface RollVisualOptions {
  durationMs?: number;
  skipAnimation?: boolean;
}

interface ActiveDieAnimation {
  mesh: THREE.Mesh;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetQuaternion: THREE.Quaternion;
  spinAxis: THREE.Vector3;
  totalSpinAngle: number;
}

/**
 * Calculates non-overlapping landing slot coordinates on the tabletop tray.
 */
function getLandingSlots(count: number): Array<{ x: number; z: number }> {
  if (count <= 1) return [{ x: 0, z: 0 }];
  if (count === 2) return [{ x: -2.2, z: 0 }, { x: 2.2, z: 0 }];
  if (count === 3) return [{ x: -2.8, z: 0 }, { x: 0, z: 0 }, { x: 2.8, z: 0 }];

  const cols = count <= 6 ? Math.ceil(count / 2) : Math.ceil(count / 2);
  const spacingX = count <= 6 ? 2.8 : 2.4;
  const spacingZ = 2.4;
  const slots: Array<{ x: number; z: number }> = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const countInRow = row === 0 ? cols : count - cols;
    const rowStartX = -((countInRow - 1) * spacingX) / 2;
    const col = i - row * cols;
    const x = rowStartX + col * spacingX;
    const z = row === 0 ? -spacingZ / 2 : spacingZ / 2;
    slots.push({ x, z });
  }

  return slots;
}

/**
 * Deterministic Kinematic 3D Tabletop Arena for rendering and animating dice rolls.
 */
export class DiceArena3D {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer | null = null;
  public readonly canvas: HTMLCanvasElement;

  private readonly options: DiceArenaOptions;
  private resizeObserver: ResizeObserver | null = null;
  private currentResolve: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private activeAnimations: ActiveDieAnimation[] = [];
  private currentDiceMeshes: THREE.Mesh[] = [];
  private trayMeshes: THREE.Object3D[] = [];
  private isDisposed = false;
  private isContextLost = false;

  constructor(canvas: HTMLCanvasElement, options: DiceArenaOptions = {}) {
    this.canvas = canvas;
    this.options = options;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f19);

    const container = canvas.parentElement ?? canvas;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;
    const aspect = width / height;
    const zoomOut = aspect < 1.25 ? 1.25 / Math.max(0.55, aspect) : 1;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    this.camera.position.set(0, 15 * zoomOut, 12 * zoomOut);
    this.camera.lookAt(0, 0, 0);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(
        typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
      );

      if (options.shadows !== false) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    } catch {
      // In headless environments where WebGL is unavailable, renderer stays null
      this.renderer = null;
    }

    this.setupLighting();
    this.setupTabletopTray();
    this.setupEventListeners();
    this.render();
  }

  private setupLighting(): void {
    // Ambient fill light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);
    this.trayMeshes.push(ambientLight);

    // Directional key light with shadows
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(6, 18, 8);
    if (this.renderer?.shadowMap.enabled) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 40;
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(keyLight);
    this.trayMeshes.push(keyLight);

    // Subtle blue rim/edge light
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.7);
    rimLight.position.set(-8, 12, -6);
    this.scene.add(rimLight);
    this.trayMeshes.push(rimLight);
  }

  private setupTabletopTray(): void {
    // Tray Floor (Tabletop surface)
    const floorGeo = new THREE.PlaneGeometry(18, 14);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.trayMeshes.push(floor);

    // Outer Tray Bezel / Borders
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.4,
    });

    const borderGeoX = new THREE.BoxGeometry(18.4, 0.6, 0.4);
    const borderNorth = new THREE.Mesh(borderGeoX, wallMat);
    borderNorth.position.set(0, 0.3, -7.2);
    borderNorth.castShadow = true;
    borderNorth.receiveShadow = true;
    this.scene.add(borderNorth);
    this.trayMeshes.push(borderNorth);

    const borderSouth = new THREE.Mesh(borderGeoX, wallMat);
    borderSouth.position.set(0, 0.3, 7.2);
    borderSouth.castShadow = true;
    borderSouth.receiveShadow = true;
    this.scene.add(borderSouth);
    this.trayMeshes.push(borderSouth);

    const borderGeoZ = new THREE.BoxGeometry(0.4, 0.6, 14.8);
    const borderWest = new THREE.Mesh(borderGeoZ, wallMat);
    borderWest.position.set(-9.2, 0.3, 0);
    borderWest.castShadow = true;
    borderWest.receiveShadow = true;
    this.scene.add(borderWest);
    this.trayMeshes.push(borderWest);

    const borderEast = new THREE.Mesh(borderGeoZ, wallMat);
    borderEast.position.set(9.2, 0.3, 0);
    borderEast.castShadow = true;
    borderEast.receiveShadow = true;
    this.scene.add(borderEast);
    this.trayMeshes.push(borderEast);
  }

  private setupEventListeners(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      const targetElement = this.canvas.parentElement ?? this.canvas;
      this.resizeObserver.observe(targetElement);
    }

    this.canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
  }

  private handleResize(): void {
    if (this.isDisposed || !this.renderer) return;
    const container = this.canvas.parentElement ?? this.canvas;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;
    const aspect = width / height;
    const zoomOut = aspect < 1.25 ? 1.25 / Math.max(0.55, aspect) : 1;
    this.camera.aspect = aspect;
    this.camera.position.set(0, 15 * zoomOut, 12 * zoomOut);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.isContextLost = true;
    if (this.animationFrameId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }
    this.options.onContextLost?.();
  };

  private onContextRestored = (): void => {
    this.isContextLost = false;
    this.render();
    this.options.onContextRestored?.();
  };

  public render(): void {
    if (this.isDisposed || this.isContextLost || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Spawns and animates a deterministic visual roll of M dice (M in [1, 10]).
   */
  public rollVisual(
    faces: DieFaces,
    values: number[],
    options: RollVisualOptions = {}
  ): Promise<void> {
    if (this.isDisposed) {
      return Promise.reject(new Error('DiceArena3D is disposed'));
    }

    // Snap and resolve any previous animation before starting a new one
    this.skipCurrentAnimation();

    const count = values.length;
    if (count === 0) {
      return Promise.resolve();
    }

    // Remove any previous dice meshes from scene
    this.cleanupCurrentDice();

    const slots = getLandingSlots(count);
    const restY = faces === 2 ? 0.08 : 0.85;
    const animations: ActiveDieAnimation[] = [];

    for (let i = 0; i < count; i++) {
      const val = values[i];
      const mesh = createDieMesh(faces);
      const slot = slots[i];

      // Jitter yaw slightly per die for natural organic scattering
      const yaw = ((i * 137.5) % 360) * (Math.PI / 180);
      const targetQuat = computeTargetQuaternion(faces, val, yaw);

      // Random tumbling axis in upper hemisphere
      const spinAxis = new THREE.Vector3(
        Math.cos(i * 1.7) * 0.8 + 0.2,
        Math.sin(i * 2.3) * 0.5 + 0.6,
        Math.sin(i * 0.9) * 0.8 + 0.1
      ).normalize();

      const totalSpinAngle = Math.PI * (6 + (i % 3) * 2);

      const anim: ActiveDieAnimation = {
        mesh,
        startX: slot.x + (Math.sin(i * 1.5) * 1.2),
        startY: 7.5 + (i * 0.35),
        startZ: slot.z - 4.5,
        targetX: slot.x,
        targetY: restY,
        targetZ: slot.z,
        targetQuaternion: targetQuat,
        spinAxis,
        totalSpinAngle,
      };

      this.scene.add(mesh);
      this.currentDiceMeshes.push(mesh);
      animations.push(anim);
    }

    this.activeAnimations = animations;

    const duration = options.durationMs ?? 1200;
    const skip = options.skipAnimation || duration <= 0;

    if (skip || !this.renderer) {
      // Place immediately at rest
      for (const anim of animations) {
        anim.mesh.position.set(anim.targetX, anim.targetY, anim.targetZ);
        anim.mesh.quaternion.copy(anim.targetQuaternion);
      }
      this.render();
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.currentResolve = resolve;
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const tick = () => {
        if (this.isDisposed || this.isContextLost) {
          resolve();
          return;
        }

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        // Kinematic trajectory calculation
        for (const anim of this.activeAnimations) {
          // Horizontal ease-out
          const easeXZ = 1 - Math.pow(1 - progress, 3);
          const curX = anim.startX + (anim.targetX - anim.startX) * easeXZ;
          const curZ = anim.startZ + (anim.targetZ - anim.startZ) * easeXZ;

          // Multi-bounce ballistic vertical curve
          let curY = anim.targetY;
          if (progress < 0.45) {
            // Drop 1
            const p = progress / 0.45;
            curY = anim.targetY + (anim.startY - anim.targetY) * (1 - p * p);
          } else if (progress < 0.75) {
            // Bounce 1
            const p = (progress - 0.45) / 0.30;
            const bounceH = 1.6;
            curY = anim.targetY + bounceH * 4 * p * (1 - p);
          } else if (progress < 0.92) {
            // Bounce 2
            const p = (progress - 0.75) / 0.17;
            const bounceH = 0.45;
            curY = anim.targetY + bounceH * 4 * p * (1 - p);
          } else {
            // Final settling
            curY = anim.targetY;
          }

          anim.mesh.position.set(curX, curY, curZ);

          // Tumbling angular deceleration
          const spinDecay = Math.pow(1 - progress, 2.5);
          const spinAngle = anim.totalSpinAngle * spinDecay;
          const spinQuat = new THREE.Quaternion().setFromAxisAngle(anim.spinAxis, spinAngle);
          anim.mesh.quaternion.copy(anim.targetQuaternion).multiply(spinQuat);
        }

        this.render();

        if (progress < 1.0) {
          if (typeof requestAnimationFrame !== 'undefined') {
            this.animationFrameId = requestAnimationFrame(tick);
          } else {
            setTimeout(tick, 16);
          }
        } else {
          // Final exact snap
          for (const anim of this.activeAnimations) {
            anim.mesh.position.set(anim.targetX, anim.targetY, anim.targetZ);
            anim.mesh.quaternion.copy(anim.targetQuaternion);
          }
          this.render();
          this.animationFrameId = null;
          this.currentResolve = null;
          resolve();
        }
      };

      if (typeof requestAnimationFrame !== 'undefined') {
        this.animationFrameId = requestAnimationFrame(tick);
      } else {
        setTimeout(tick, 16);
      }
    });
  }

  /**
   * Snaps the current roll animation to its completed rest state immediately.
   */
  public skipCurrentAnimation(): void {
    if (this.animationFrameId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    if (this.activeAnimations.length > 0) {
      for (const anim of this.activeAnimations) {
        anim.mesh.position.set(anim.targetX, anim.targetY, anim.targetZ);
        anim.mesh.quaternion.copy(anim.targetQuaternion);
      }
      this.render();
    }

    if (this.currentResolve) {
      const res = this.currentResolve;
      this.currentResolve = null;
      res();
    }
  }

  private cleanupCurrentDice(): void {
    for (const mesh of this.currentDiceMeshes) {
      this.scene.remove(mesh);
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        for (const mat of mesh.material) mat.dispose();
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
    this.currentDiceMeshes = [];
    this.activeAnimations = [];
  }

  /**
   * Disposes all Three.js resources, event listeners, and observers.
   */
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.skipCurrentAnimation();
    this.cleanupCurrentDice();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);

    for (const obj of this.trayMeshes) {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          for (const mat of obj.material) mat.dispose();
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    }
    this.trayMeshes = [];

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
