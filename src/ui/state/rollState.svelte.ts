import type {
  AppMode,
  DieFaces,
  Player,
  PlayerLeaderboardEntry,
  RollConfig,
  RoundResult,
  SeriesSummary,
} from '../../core/types';
import { computePlayerLeaderboard } from '../../core/leaderboard';
import { computeRoundResult, createSeriesId } from '../../core/round';
import { computeSeriesSummary } from '../../core/series-analytics';
import {
  DEFAULT_PLAYER,
  defaultStorage,
  hydratePersistedState,
  MAX_PLAYER_NAME_LENGTH,
  PLAYER_PALETTE,
  serializePersistedState,
  type RollStorage,
} from '../../core/persistence';
import {
  COUNT_PER_ROLL_LIMITS,
  MAX_HISTORY_ENTRIES,
  MAX_QUICK_ROLLS,
  SERIES_LENGTH_LIMITS,
  clampInt,
} from '../../core/limits';
import { LocalCryptoRollProvider, type IRollProvider } from '../../core/provider';
import type { DiceArena3D } from '../../three/DiceArena3D';
import {
  HISTORY_CLEARED_ANNOUNCEMENT,
  QUICK_FEED_CLEARED_ANNOUNCEMENT,
  SERIES_LOCKED_ANNOUNCEMENT,
  modeSwitchedAnnouncement,
  quickRollAnnouncement,
  seriesCompleteAnnouncement,
  seriesResetAnnouncement,
  seriesRoundAnnouncement,
} from './announcements';

export interface SeriesState {
  id: string;
  config: RollConfig;
  playerName: string;
  rounds: RoundResult[];
}

export type AddPlayerResult =
  | { ok: true; player: Player }
  | { ok: false; reason: 'empty' | 'duplicate' | 'locked' };

export interface RollStateOptions {
  provider?: IRollProvider;
  storage?: RollStorage;
}

function getInitialMotionPreference(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

export class RollState {
  // Application Mode ('quick' or 'series')
  mode: AppMode = $state('series');

  // Reactive Configurations
  faces: DieFaces = $state(6);
  countPerRoll: number = $state(1);
  seriesLength: number = $state(3);

  // Players
  players: Player[] = $state([{ ...DEFAULT_PLAYER }]);
  activePlayerId: string = $state(DEFAULT_PLAYER.id);

  // Animation & Execution States
  isRolling: boolean = $state(false);
  isAutoRolling: boolean = $state(false);
  instantMode: boolean = $state(getInitialMotionPreference());
  contextLost: boolean = $state(false);

  // Announcer text for assistive technologies (aria-live="polite")
  announcerMessage: string = $state('');

  // History & Single Source of Truth for the Active/Current Series
  history: SeriesSummary[] = $state([]);
  // Created once in the constructor, after the persisted active player is hydrated
  private series: SeriesState;

  // Session-only Quick Rolls (Quick mode, feed capped at 25)
  quickRolls: RoundResult[] = $state([]);
  // Total quick rolls thrown this session; keeps counting past the feed cap
  quickRollCount: number = $state(0);

  // Injected Ports & Arena Reference
  private readonly provider: IRollProvider;
  private readonly storage: RollStorage;
  private arena: DiceArena3D | null = null;
  // Identifies the active auto-roll loop; bumping it retires any loop still awaiting
  private autoRollRun: number = 0;

  constructor({
    provider = new LocalCryptoRollProvider(),
    storage = defaultStorage(),
  }: RollStateOptions = {}) {
    this.provider = provider;
    this.storage = storage;
    const hydrated = hydratePersistedState(this.storage.load());
    this.players = hydrated.players;
    this.activePlayerId = hydrated.activePlayerId;
    this.history = hydrated.history;
    this.series = $state.raw(this.createSeriesState());
    this.setupMotionMediaListener();
  }

  private saveState(): void {
    this.storage.save(
      serializePersistedState({
        players: this.players,
        activePlayerId: this.activePlayerId,
        history: this.history,
      }),
    );
  }

  private createSeriesState(): SeriesState {
    return {
      id: createSeriesId(),
      config: {
        faces: this.faces,
        countPerRoll: this.countPerRoll,
        seriesLength: this.seriesLength,
        playerId: this.activePlayerId,
      },
      playerName: this.activePlayer.name,
      rounds: [],
    };
  }

  // Tracks who last decided `instantMode`. OS reduced-motion changes only apply while 'system';
  // instantMode is not persisted, so there is no stored preference to restore as 'user'.
  private instantModeSource: 'system' | 'user' = 'system';
  private motionListenerAbort: AbortController | undefined;
  private motionListenerCleanup: (() => void) | undefined;

  private setupMotionMediaListener(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (typeof mediaQuery.addEventListener !== 'function') return;
    const listener = (event: MediaQueryListEvent) => {
      if (this.instantModeSource === 'system') this.instantMode = event.matches;
    };
    const abort = new AbortController();
    mediaQuery.addEventListener('change', listener, { signal: abort.signal });
    this.motionListenerAbort = abort;
    // Fallback for environments that ignore `signal`.
    this.motionListenerCleanup = () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', listener);
      }
    };
  }

  /**
   * Releases the OS reduced-motion listener. Idempotent. The app root instance (created in
   * `main.ts`) lives for the whole page lifetime and is never disposed; call this for
   * short-lived instances (e.g. tests).
   */
  dispose(): void {
    this.motionListenerAbort?.abort();
    this.motionListenerCleanup?.();
    this.motionListenerAbort = undefined;
    this.motionListenerCleanup = undefined;
  }

  // Derived properties
  get activePlayer(): Player {
    return this.players.find((p) => p.id === this.activePlayerId) ?? this.players[0];
  }

  get rounds(): RoundResult[] {
    return this.series.rounds;
  }

  get seriesFaces(): DieFaces {
    return this.series.config.faces;
  }

  get currentRoundIndex(): number {
    return this.series.rounds.length;
  }

  get isComplete(): boolean {
    return this.series.rounds.length >= this.series.config.seriesLength;
  }

  // A series with at least one round and rounds still to play
  get isSeriesInProgress(): boolean {
    return this.series.rounds.length > 0 && !this.isComplete;
  }

  // Dice setup is frozen in Series mode until the running series completes or is reset
  get isConfigLocked(): boolean {
    return this.mode === 'series' && this.isSeriesInProgress;
  }

  get latestRound(): RoundResult | null {
    return this.series.rounds.at(-1) ?? null;
  }

  get latestQuickRoll(): RoundResult | null {
    return this.quickRolls.length > 0 ? this.quickRolls[0] : null;
  }

  // Built directly from the single reactive series state; in-flight rounds only join `series.rounds`
  // once their dice have landed.
  readonly summary: SeriesSummary = $derived.by(() => {
    const { id, config, playerName, rounds } = this.series;
    return computeSeriesSummary(id, config, playerName, rounds);
  });

  get progressPercent(): number {
    return Math.min(
      100,
      Math.round((this.series.rounds.length / this.series.config.seriesLength) * 100),
    );
  }

  readonly leaderboard: PlayerLeaderboardEntry[] = $derived(
    computePlayerLeaderboard(this.history, this.players),
  );

  // Mode switching
  setMode(mode: AppMode): void {
    if (this.isRolling || this.isAutoRolling || this.mode === mode) return;
    if (mode === 'series') {
      if (this.series.rounds.length > 0) {
        // Series has at least one round (in progress or completed): resume with its own setup
        this.faces = this.series.config.faces;
        this.countPerRoll = this.series.config.countPerRoll;
      } else {
        // Series is empty: recreate it silently with the current setup
        this.resetCurrentSeries({ announce: false });
      }
    }
    this.mode = mode;
    this.announcerMessage = modeSwitchedAnnouncement(mode);
  }

  // Arena attachment
  setArena(arena: DiceArena3D | null): void {
    this.arena = arena;
  }

  setContextLost(isLost: boolean): void {
    this.contextLost = isLost;
  }

  // Rejects a change that would silently discard the rounds already rolled
  private rejectWhileSeriesRuns(locked: boolean): boolean {
    if (locked) {
      this.announcerMessage = SERIES_LOCKED_ANNOUNCEMENT;
    }
    return locked;
  }

  // Rebuilds the series for a new dice setup. In Quick Roll mode any existing series
  // (in progress or completed) is never touched; an empty series is kept silently aligned.
  private applyDiceSetupChange(): void {
    if (this.mode === 'quick') {
      if (this.series.rounds.length === 0) {
        this.resetCurrentSeries({ announce: false });
      }
      return;
    }
    if (this.isSeriesInProgress) return;
    this.resetCurrentSeries({ announce: true });
  }

  // Configuration updates
  setFaces(faces: DieFaces): void {
    if (this.isRolling) return;
    if (this.faces === faces) return;
    if (this.rejectWhileSeriesRuns(this.isConfigLocked)) return;
    this.faces = faces;
    this.applyDiceSetupChange();
  }

  setCountPerRoll(count: number): void {
    if (this.isRolling) return;
    if (!Number.isFinite(count)) return;
    const clamped = clampInt(count, COUNT_PER_ROLL_LIMITS);
    if (this.countPerRoll === clamped) return;
    if (this.rejectWhileSeriesRuns(this.isConfigLocked)) return;
    this.countPerRoll = clamped;
    this.applyDiceSetupChange();
  }

  setSeriesLength(length: number): void {
    if (this.isRolling) return;
    if (!Number.isFinite(length)) return;
    const clamped = clampInt(length, SERIES_LENGTH_LIMITS);
    if (this.seriesLength === clamped) return;
    if (this.rejectWhileSeriesRuns(this.isSeriesInProgress)) return;
    this.seriesLength = clamped;
    this.resetCurrentSeries({ announce: this.mode === 'series' });
  }

  toggleInstantMode(): void {
    this.instantMode = !this.instantMode;
    this.instantModeSource = 'user';
  }

  // Player Management
  addPlayer(name: string): AddPlayerResult {
    if (this.isRolling) return { ok: false, reason: 'locked' };
    const trimmed = name.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
    if (!trimmed) return { ok: false, reason: 'empty' };
    if (this.rejectWhileSeriesRuns(this.isSeriesInProgress)) {
      return { ok: false, reason: 'locked' };
    }
    // Names are compared trimmed and case-folded; persisted duplicates are tolerated, not migrated
    const folded = trimmed.toLocaleLowerCase();
    if (this.players.some((p) => p.name.trim().toLocaleLowerCase() === folded)) {
      return { ok: false, reason: 'duplicate' };
    }
    const nextIndex = this.players.length;
    const color = PLAYER_PALETTE[nextIndex % PLAYER_PALETTE.length];
    const newPlayer: Player = {
      id: `player-${Date.now()}-${nextIndex + 1}`,
      name: trimmed,
      color,
    };
    this.players = [...this.players, newPlayer];
    this.activePlayerId = newPlayer.id;
    this.resetCurrentSeries({ announce: this.mode === 'series' });
    this.saveState();
    return { ok: true, player: newPlayer };
  }

  setActivePlayer(id: string): void {
    if (this.isRolling) return;
    if (this.activePlayerId === id) return;
    const exists = this.players.some((p) => p.id === id);
    if (!exists) return;
    if (this.rejectWhileSeriesRuns(this.isSeriesInProgress)) return;
    this.activePlayerId = id;
    this.resetCurrentSeries({ announce: this.mode === 'series' });
    this.saveState();
  }

  // Quick Roll action
  async executeQuickRoll(): Promise<RoundResult | null> {
    if (this.isRolling) {
      return null;
    }

    this.isRolling = true;
    try {
      const faces = this.faces;
      const index = this.quickRollCount;
      const values = await this.provider.rollRound(faces, this.countPerRoll);
      const ts = Date.now();

      // The result stays hidden until the dice have landed
      await this.playVisual(faces, values);

      const round = computeRoundResult(index, values, faces, ts);
      this.quickRollCount += 1;
      this.quickRolls = [round, ...this.quickRolls.slice(0, MAX_QUICK_ROLLS - 1)];

      if (this.mode === 'quick') {
        this.announcerMessage = quickRollAnnouncement(round);
      }

      return round;
    } finally {
      this.isRolling = false;
    }
  }

  clearQuickRolls(): void {
    if (this.isRolling) return;
    this.quickRolls = [];
    this.quickRollCount = 0;
    this.announcerMessage = QUICK_FEED_CLEARED_ANNOUNCEMENT;
  }

  // Series Rolling actions
  async rollNextRound(): Promise<RoundResult | null> {
    if (this.isRolling || this.isComplete) {
      return null;
    }

    this.isRolling = true;
    try {
      const series = this.series;
      const { faces, countPerRoll, seriesLength } = series.config;
      const index = series.rounds.length;
      const values = await this.provider.rollRound(faces, countPerRoll);
      const ts = Date.now();

      // The result stays hidden until the dice have landed
      await this.playVisual(faces, values);

      if (series !== this.series) {
        // The series was reset while this round was in flight: the round is discarded
        return null;
      }
      const round = computeRoundResult(index, values, faces, ts);
      const rounds = [...series.rounds, round];
      this.series = { ...series, rounds };

      let completedSummary: SeriesSummary | null = null;
      if (this.isComplete) {
        completedSummary = computeSeriesSummary(
          series.id,
          series.config,
          series.playerName,
          rounds,
          Date.now(),
        );
        this.history = [completedSummary, ...this.history.slice(0, MAX_HISTORY_ENTRIES - 1)];
        this.saveState();
      }

      if (this.mode === 'series') {
        const roundAnnounce = seriesRoundAnnouncement(round, seriesLength);
        this.announcerMessage = completedSummary
          ? `${roundAnnounce} ${seriesCompleteAnnouncement(completedSummary)}`
          : roundAnnounce;
      }

      return round;
    } finally {
      this.isRolling = false;
    }
  }

  // Plays the 3D roll. A rendering failure must never lose a result that was already rolled.
  private async playVisual(faces: DieFaces, values: number[]): Promise<void> {
    if (!this.arena) return;
    try {
      await this.arena.rollVisual(faces, values, { skipAnimation: this.instantMode });
    } catch (err) {
      console.error('3D roll animation failed:', err);
    }
  }

  async autoRollSeries(): Promise<void> {
    if (this.isRolling || this.isAutoRolling || this.isComplete) {
      return;
    }

    // A stop followed by a restart during the inter-round pause must not revive the
    // stopped loop, so each loop only continues while it still owns the current run id.
    const run = ++this.autoRollRun;
    const isActive = (): boolean => run === this.autoRollRun;
    this.isAutoRolling = true;

    try {
      while (!this.isComplete && isActive()) {
        const round = await this.rollNextRound();
        if (!round) {
          // Another roll is in flight (e.g. a manual roll started during the pause):
          // yield to it instead of spinning on the busy guard.
          break;
        }

        if (!this.isComplete && isActive() && !this.instantMode) {
          // Brief pause between animated rounds
          await new Promise((resolve) => {
            setTimeout(resolve, 450);
          });
        }
      }
    } finally {
      if (isActive()) {
        this.isAutoRolling = false;
      }
    }
  }

  stopAutoRoll(): void {
    this.autoRollRun += 1;
    this.isAutoRolling = false;
  }

  skipAnimation(): void {
    if (this.arena) {
      this.arena.skipCurrentAnimation();
    }
  }

  resetCurrentSeries(options: { announce?: boolean } = {}): void {
    this.stopAutoRoll();
    this.skipAnimation();
    this.series = this.createSeriesState();
    if (options.announce !== false) {
      this.announcerMessage = seriesResetAnnouncement(this.activePlayer.name);
    }
  }

  clearHistory(): void {
    this.history = [];
    this.saveState();
    this.announcerMessage = HISTORY_CLEARED_ANNOUNCEMENT;
  }
}
