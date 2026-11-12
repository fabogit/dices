# dices

> High-fidelity 3D WebGL dice and coin rolling Single Page Application engineered with Svelte 5 Runes, TypeScript 7, and Three.js, powered by a mathematically unbiased Web Crypto CSPRNG rejection-sampling engine and deployed to Cloudflare Pages.

**Inception (First Commit):** `2026-11-12` • **Batch / Horizon:** `2026` • **Architecture Domain:** `Frontend 3D WebGL / CSPRNG Utility & Cloudflare Pages SPA`

---

## 📌 Architecture & Overview

`dices` is a client-side 3D simulation and statistical tracking application designed for tabletop gaming, decision making, and cryptographic fairness verification. Unlike standard browser utilities that rely on `Math.random()` (a pseudo-random number generator susceptible to seed predictability and modulo skew), `dices` pairs the browser's native `Crypto.getRandomValues()` interface with strict rejection sampling, guaranteeing an equal probability distribution across all dice faces.

The architecture cleanly decouples mathematical random generation, domain statistical analysis, Three.js 3D rendering, and reactive user interface state.

* **Context:** High-performance, zero-backend WebGL utility and reference implementation demonstrating Svelte 5 Runes architecture (`$state`, `$derived`, `$effect`), procedural 3D polyhedral mesh generation, deterministic quaternion landing mathematics, and Cloudflare Pages edge delivery.
* **Key Patterns:**
  * **Hexagonal Provider Port (`IRollProvider`):** Random number generation is abstracted behind the `IRollProvider` interface (`LocalCryptoRollProvider`), creating an inversion-of-control seam ready for future remote server seeds, commit-reveal schemes, or peer-to-peer WebRTC multiplayer rooms without modifying the series engine or UI.
  * **Zero-Modulo-Bias Rejection Sampling:** Uniform 32-bit unsigned integers from `globalThis.crypto.getRandomValues()` are filtered through an upper rejection boundary ($L = \lfloor 2^{32} / N \rfloor \times N$). Numbers falling outside the boundary are discarded, eliminating the statistical bias inherent in naïve `rand % N` calculations.
  * **Deterministic Quaternion Landing Alignment:** Rather than relying on non-deterministic physics engine convergence, the 3D tabletop computes the exact target landing rotation using face-normal to global-up quaternion transformations ($\vec{n}_{\text{face}} \to (0, 1, 0)$). During a roll, dice undergo randomized parabolic translational arc ballistic tumbles before smoothly settling into their pre-determined target orientation.
  * **Svelte 5 Runes Reactive Orchestration:** Application state (`RollState`) is centralized into a standalone class utilizing Svelte 5 Runes (`$state`, `$derived`). The Three.js WebGL animation loop runs independently via `requestAnimationFrame` without triggering Svelte DOM reconciliations, maintaining 60 FPS rendering under heavy animation.
  * **Dual Presentation Modes:** Supports both instantaneous unconstrained rolls (**Quick Roll**) with a session-capped feed and structured Best-of-$K$ tournaments (**Series Mode**) with empirical distribution tracking and player leaderboards.

### Component Hierarchy & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          App.svelte                                         │
│  - Layout Shell & Landmark Navigation (Skip link, Header, Main, Aside)                       │
│  - Centralized Accessibility Announcer (aria-live="polite", aria-atomic="true")             │
│  - Mode Switcher (⚡ Quick Roll vs 📊 Series Mode) & Local Player Management Dialog          │
└──────┬──────────────────────────────────────┬──────────────────────────────────────┬────────┘
       │                                      │                                      │
       ▼                                      ▼                                      ▼
┌────────────────────────┐         ┌──────────────────────────────┐         ┌─────────────────────────────────┐
│  ControlPanel.svelte   │         │    ArenaViewport.svelte      │         │ Right Column Presentation Mode  │
│ - Instrument (d2..d20) │         │ - Three.js WebGL Canvas      │         ├────────────────┬────────────────┤
│ - Quantity M (1..10)   │         │ - HUD Overlay (Round, Sum)   │         │ Quick Mode     │ Series Mode    │
│ - Series Length (1..21)│         │ - Context Loss Alert Banner  │         ├────────────────┼────────────────┤
│ - Presets (1, Bo3, Bo5)│         │ - Collapsible Tray Header    │         │ QuickResult    │ - Series       │
│ - Collapsible Section  │         │ - Integrated role="toolbar": │         │ Panel.svelte   │   Scoreboard   │
└───────────┬────────────┘         │   [Roll] [Auto-Roll] [Reset] │         │ - Session Feed │ - HistoryPanel │
            │                      └──────────────┬───────────────┘         │ - Hero Stat    │ - Leaderboard  │
            │                                     │                         └────────┬───────┴────────┬───────┘
            ▼                                     ▼                                  │                │
┌────────────────────────────────────────────────────────────────────────────────────┴────────────────┘
│                                       RollState (rollState.svelte.ts)                               │
│  - Svelte 5 Reactive Store ($state, $derived)                                                       │
│  - Mode, Faces, Dice Count (M), Series Rounds (K), Active Player, and Visual Preferences           │
│  - Reduced Motion Detection via window.matchMedia('(prefers-reduced-motion: reduce)')               │
│  - Browser LocalStorage Synchronization ('dices_history_v1')                                        │
└──────────────────────────────────────┬──────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
┌───────────────────────────────────────┐  ┌──────────────────────────────────────────────────────────┐
│      RollSeriesEngine (engine.ts)     │  │                DiceArena3D (DiceArena3D.ts)              │
│ - Lifecycle State Machine & Bounds    │  │ - Three.js PerspectiveCamera, Scene, & WebGLRenderer     │
│ - Round Evaluation & Mode Calculation │  │ - Procedural Mesh Factory (geometries.ts)                │
│ - Series Analytics (Δ, σ, Criticals)  │  │ - Face Normal Alignment to Quaternion Math               │
│ - Player Leaderboard & Luck Score     │  │ - Kinematic Ballistic Tumble & Settlement Easing         │
└───────────────────┬───────────────────┘  └──────────────────────────────────────────────────────────┘
                    ▼
┌───────────────────────────────────────┐
│     IRollProvider (provider.ts)       │
│  - LocalCryptoRollProvider            │
│  - Extensible Port for Remote Seeds   │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│       csprng.ts (Web Crypto API)      │
│  - globalThis.crypto.getRandomValues  │
│  - 32-bit Rejection Sampling Limit    │
│  - Unbiased Uniform Random Generator  │
└───────────────────────────────────────┘
```

---

## 🛠 Tech Stack

* **Runtime & Framework:** [Svelte 5](https://svelte.dev/) (`^5.15.0`) utilizing Svelte 5 Runes (`$state`, `$derived`, `$effect`)
* **3D Graphics & Rendering:** [Three.js](https://threejs.org/) (`^0.170.0`), `@types/three` (`^0.170.0`)
* **Language & Typings:** [TypeScript](https://www.typescriptlang.org/) (`^7.0.2`), ECMAScript 2022 Target
* **Build Tooling & Bundler:** [Vite 6](https://vite.dev/) (`^6.0.0`), `@sveltejs/vite-plugin-svelte` (`^5.0.0`), with manual chunk splitting for `three`
* **Testing & Quality:** [Vitest](https://vitest.dev/) (`^2.1.0`), [Playwright](https://playwright.dev/) (`^1.65.0`, Chromium E2E), GitHub Actions CI, and strict type-checking via `tsc --noEmit`
* **Package Management & Engine:** [pnpm](https://pnpm.io/) (`pnpm@11.21.0`), Node.js `>=26.13.1` (pinned via `.node-version`)
* **Cloud Infrastructure & Security:** [Cloudflare Pages](https://pages.cloudflare.com/) (`wrangler.jsonc`, `compatibility_date: 2026-11-01`), strict security headers via `public/_headers`

---

## ✨ Features & Interfaces

### 1. Dual Application Modes
* **⚡ Quick Roll Mode:**
  * Free-form, instantaneous throws without series progression overhead.
  * Roll any combination of dice or coins on demand.
  * In-memory rolling feed tracking up to the last 25 results with individual dice badges, sums, timestamps, and coin outcome badges.
  * One-click feed clearing (`↺ Clear Feed`).
* **📊 Series Mode:**
  * Structured multi-round tournaments ($K \in [1, 21]$).
  * Fast preset buttons: **Single (1)**, **Bo3 (3)**, and **Bo5 (5)** alongside a granular range slider.
  * Interactive controls: Manual step-by-step rolling, fully automated rolling sequence with cancel support (`⚡ Auto-Roll Series` / `⏹ Stop Auto-Roll`), and tournament reset (`↺ Reset`).
  * Live round completion progress bar with percentage indicator.

### 2. Supported Instruments & Polyhedral Meshes
All geometries and textures are generated procedurally at runtime using Three.js buffer geometries and dynamic canvas rendering:

| Instrument | Geometric Polyhedron | Faces ($N$) | Theoretical Range | Primary Theme Color |
|---|---|---|---|---|
| **Coin (d2)** | Procedural Cylinder with Beveled Edges & Edge Reeding | 2 | Heads ($1$), Tails ($2$) | Gold (`#eab308`) |
| **d4** | Regular Tetrahedron (`TetrahedronGeometry`) | 4 | $1 \dots 4$ | Emerald (`#059669`) |
| **d6** | Regular Hexahedron / Cube (`BoxGeometry`) | 6 | $1 \dots 6$ | Ruby (`#dc2626`) |
| **d8** | Regular Octahedron (`OctahedronGeometry`) | 8 | $1 \dots 8$ | Sapphire (`#2563eb`) |
| **d10** | Pentagonal Trapezohedron (`PolyhedronGeometry`) | 10 | $1 \dots 10$ | Amethyst (`#7c3aed`) |
| **d12** | Regular Dodecahedron (`DodecahedronGeometry`) | 12 | $1 \dots 12$ | Amber (`#d97706`) |
| **d20** | Regular Icosahedron (`IcosahedronGeometry`) | 20 | $1 \dots 20$ | Obsidian / Cyan (`#0f172a`) |

* **Simultaneous Multi-Dice Throws ($M \in [1, 10]$):** Cast up to 10 dice or coins simultaneously in a single throw. The 3D tabletop calculates non-overlapping landing grid slots dynamically.

### 3. Cryptographic Fairness & Kinematics

#### Elimination of Modulo Bias via Rejection Sampling
Standard implementations that generate random numbers via $R = (\text{rand} \pmod N) + 1$ suffer from modulo bias whenever the size of the generator's state space ($2^{32} = 4,294,967,296$) is not evenly divisible by $N$. Lower face values have an elevated probability of occurring:

$$\text{Limit } L = \left\lfloor \frac{2^{32}}{N} \right\rfloor \times N$$

Any random 32-bit sample $U \ge L$ is discarded, and another sample is drawn:

| Die ($N$) | Max Unsigned 32-bit Limit ($L$) | Discard Window ($2^{32} - L$) | Re-draw Probability | Bias |
|---|---|---|---|---|
| **d2** | $4,294,967,296$ | $0$ | $0.00\%$ | **Zero** |
| **d4** | $4,294,967,296$ | $0$ | $0.00\%$ | **Zero** |
| **d6** | $4,294,967,292$ | $4$ | $9.31 \times 10^{-10}$ | **Zero** |
| **d8** | $4,294,967,296$ | $0$ | $0.00\%$ | **Zero** |
| **d10** | $4,294,967,290$ | $6$ | $1.40 \times 10^{-9}$ | **Zero** |
| **d12** | $4,294,967,292$ | $4$ | $9.31 \times 10^{-10}$ | **Zero** |
| **d20** | $4,294,967,280$ | $16$ | $3.73 \times 10^{-9}$ | **Zero** |

The rejection probability is mathematically negligible while ensuring 100% uniformity.

#### Deterministic 3D Kinematics
1. **Target Orientation Pre-computation:** Each polyhedral face index has a known normal vector $\vec{n}_{\text{face}}$. The target quaternion $Q_{\text{target}}$ is determined by rotating $\vec{n}_{\text{face}}$ to align with the world up-vector $(0, 1, 0)$:
   $$Q_{\text{target}} = \text{setFromUnitVectors}(\vec{n}_{\text{face}}, (0, 1, 0))$$
2. **Ballistic Trajectory:** During the roll duration ($1.2\text{s}$), dice follow a vertical parabolic bounce $y(t) = y_0 + 4h \cdot t(1-t)$ combined with horizontal linear interpolation towards designated tabletop tray slots.
3. **Smooth Tumble Settlement:** Rotation interpolates between a high-speed spin around a random 3D unit axis and the target landing quaternion using ease-out cubic settling.
4. **Instant / Reduced Motion Mode:** Users can toggle `⚡ Fast: ON` to bypass all 3D animation, instantly snapping dice to their final positions for rapid play or accessibility compliance.

### 4. Statistical Breakdown & Player Leaderboard
For every completed series, `RollSeriesEngine` computes an exhaustive analytical breakdown:
* **Theoretical Expectation:** $E[\text{Round Sum}] = M \times \frac{N + 1}{2}$.
* **Average Delta ($\Delta$):** Observed mean round sum minus theoretical expectation ($\bar{s} - E$).
* **Population Standard Deviation ($\sigma$):**
  $$\sigma = \sqrt{\frac{1}{K}\sum_{i=1}^{K} (s_i - \bar{s})^2}$$
* **Critical & High Roll Tracking:**
  * **Critical Max Rate:** Percentage of individual dice showing maximum face $N$ (or Heads for $d2$).
  * **Critical Min Rate:** Percentage of individual dice showing $1$ (or Tails for $d2$).
  * **High Roll Rate:** Percentage of rolls strictly greater than $N/2$.
* **Face Frequency Distribution Table:** Real-time frequency count, empirical percentage, expected percentage ($100/N$), and delta percentage for each face.
* **Normalized Luck Index & Player Leaderboard:**
  $$\text{Luck Score} = \frac{\text{Observed Series Average}}{\text{Expected Round Average}} \times 100$$
  Normalized across different dice types ($d2$ to $d20$), tracking total rolls, critical hits, coin series won, and leaderboard rankings persisted in browser `localStorage`.

### 5. Accessibility & Edge Security Hardening
* **Assistive Technologies:**
  * Centralized dynamic live region: `<div class="sr-only" aria-live="polite" aria-atomic="true">`.
  * Keyboard navigation with visible focus rings and skip-to-content link (`#main-content`).
  * Attached action toolbar utilizing semantic `role="toolbar"` and `aria-label="Roll controls"`.
  * Modal focus management for player registration dialogs.
* **Motion Preferences:** Automatically respects `(prefers-reduced-motion: reduce)` via media query listeners, defaulting to instant visual resolution.
* **WebGL Fault Tolerance:** Listens for `webglcontextlost` and `webglcontextrestored`, pausing animations gracefully and rendering a non-blocking diagnostic HUD alert.
* **Edge Security Headers (`public/_headers`):**
  * `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';`
  * `X-Frame-Options: DENY`
  * `X-Content-Type-Options: nosniff`
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`

---

### Key Domain Contracts & Interfaces

#### Core Types (`src/core/types.ts`)

```typescript
export const ALLOWED_FACES = [2, 4, 6, 8, 10, 12, 20] as const;
export type DieFaces = (typeof ALLOWED_FACES)[number];
export type CoinSide = 'HEADS' | 'TAILS';

export interface RollConfig {
  faces: DieFaces;        // Supported polyhedral die face count (2, 4, 6, 8, 10, 12, 20)
  countPerRoll: number; // Simultaneous dice per throw M ∈ [1, 10]
  seriesLength: number; // Tournament round count K ∈ [1, 21]
  playerId: string;     // Unique identifier of active player
}

export interface RoundResult {
  roundIndex: number;
  values: number[];
  sum: number;
  max: number;
  min: number;
  headsCount?: number;
  tailsCount?: number;
  roundWinnerSide?: CoinSide | 'TIE';
  timestamp: number;
}

export interface SeriesAnalytics {
  totalDiceRolled: number;
  expectedRoundAverage: number;
  averageDelta: number;
  standardDeviation: number;
  highRollCount: number;
  highRollRate: number;
  criticalMaxCount: number;
  criticalMaxRate: number;
  criticalMinCount: number;
  criticalMinRate: number;
  distribution: FaceDistributionEntry[];
}

export interface SeriesSummary {
  id: string;
  config: RollConfig;
  playerId: string;
  playerName: string;
  rounds: RoundResult[];
  totalSum: number;
  overallMax: number;
  overallMin: number;
  average: number;
  bestRoundIndex: number;
  worstRoundIndex: number;
  mode: ModeStat;
  analytics: SeriesAnalytics;
  coinSeriesWinner?: CoinSide | 'TIE';
  completedAt: number;
}
```

#### Provider Port Contract (`src/core/provider.ts`)

```typescript
export interface IRollProvider {
  readonly kind: 'local-csprng' | 'remote-multiplayer';
  rollRound(faces: DieFaces, countPerRoll: number): Promise<number[]>;
}
```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js:** `>= 26.13.1` (verified with `node -v`; matches `.node-version`)
* **Package Manager:** `pnpm` (`>= 11.21.0`)

```bash
# Enable pnpm via Corepack if not already installed
corepack enable pnpm
```

### Installation

```bash
# Clone the repository
git clone https://github.com/fabogit/dices.git
cd dices

# Install dependencies
pnpm install
```

### Running the Application

```bash
# Start Vite local development server with Hot Module Replacement (HMR)
pnpm run dev

# Build for production (TypeScript check + Vite bundle with Three.js chunking)
pnpm run build

# Preview the production build locally
pnpm run preview
```

### Verification & Testing

```bash
# Run strict TypeScript type verification without emitting files
pnpm run check

# Execute comprehensive Vitest unit/state test suite (88 tests across core, 3D, and state)
pnpm test

# Execute Chromium Playwright E2E test suite against the built production preview (7 specs)
pnpm run test:e2e
```

### Cloudflare Pages Deployment

The project is configured for direct deployment to Cloudflare Pages via `wrangler.jsonc` and `public/_headers`:

```jsonc
{
  "name": "dices",
  "compatibility_date": "2026-11-01",
  "pages_build_output_dir": "./dist"
}
```

Build command in Cloudflare Pages dashboard:
* **Build command:** `pnpm run build`
* **Build output directory:** `dist`
* **Node.js Version:** `26.13.1` (picked up automatically from `.node-version`)

---

## 📄 License & Author

Developed by [@fabogit](https://github.com/fabogit).
