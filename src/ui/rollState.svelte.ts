import {
  ALLOWED_FACES,
  type DieFaces,
  type Player,
  type PlayerLeaderboardEntry,
  type RollConfig,
  type RoundResult,
  type SeriesSummary,
} from '../core/types';
import {
  computePlayerLeaderboard,
  computeRoundResult,
  computeSeriesSummary,
  RollSeriesEngine,
} from '../core/engine';
import { sanitizePersistedHistory } from '../core/persistence';
import { LocalCryptoRollProvider } from '../core/provider';
import type { DiceArena3D } from '../three/DiceArena3D';

export type AppMode = 'quick' | 'series';

const STORAGE_KEY = 'dices_history_v1';
const PLAYER_PALETTE = ['#38bdf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c'];

function getInitialMotionPreference(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

function loadHistoryFromStorage(): SeriesSummary[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizePersistedHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveHistoryToStorage(history: SeriesSummary[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage quota or access errors in sandbox / restricted browsers
  }
}

export class RollState {
  // Application Mode ('quick' or 'series')
  mode: AppMode = $state('series');

  // Reactive Configurations
  faces: DieFaces = $state(6);
  countPerRoll: number = $state(1);
  seriesLength: number = $state(3);

  // Players
  players: Player[] = $state([{ id: 'player-1', name: 'Player 1', color: '#38bdf8' }]);
  activePlayerId: string = $state('player-1');

  // Animation & Execution States
  isRolling: boolean = $state(false);
  isAutoRolling: boolean = $state(false);
  instantMode: boolean = $state(getInitialMotionPreference());
  contextLost: boolean = $state(false);

  // Announcer text for assistive technologies (aria-live="polite")
  announcerMessage: string = $state('');

  // History & Reactive Rounds (Series mode)
  history: SeriesSummary[] = $state(loadHistoryFromStorage());
  rounds: RoundResult[] = $state([]);

  // Session-only Quick Rolls (Quick mode, feed capped at 25)
  quickRolls: RoundResult[] = $state([]);
  // Total quick rolls thrown this session; keeps counting past the feed cap
  quickRollCount: number = $state(0);

  // Internal Engine
  private engine: RollSeriesEngine;
  private summaryRevision: number = $state(0);
  private arena: DiceArena3D | null = null;
  // Identifies the active auto-roll loop; bumping it retires any loop still awaiting
  private autoRollRun: number = 0;
  private cryptoProvider: LocalCryptoRollProvider = new LocalCryptoRollProvider();

  constructor() {
    this.engine = this.createEngine();
    this.setupMotionMediaListener();
  }

  private createEngine(): RollSeriesEngine {
    const config: RollConfig = {
      faces: this.faces,
      countPerRoll: this.countPerRoll,
      seriesLength: this.seriesLength,
      playerId: this.activePlayerId,
    };
    return new RollSeriesEngine(config, this.activePlayer.name);
  }

  private setupMotionMediaListener(): void {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = (event: MediaQueryListEvent) => {
        this.instantMode = event.matches;
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', listener);
      }
    }
  }

  // Derived properties
  get activePlayer(): Player {
    return this.players.find((p) => p.id === this.activePlayerId) ?? this.players[0];
  }

  get currentRoundIndex(): number {
    return this.rounds.length;
  }

  get isComplete(): boolean {
    return this.rounds.length >= this.seriesLength;
  }

  // A series with at least one round and rounds still to play
  get isSeriesInProgress(): boolean {
    return this.rounds.length > 0 && !this.isComplete;
  }

  // Dice setup is frozen in Series mode until the running series completes or is reset
  get isConfigLocked(): boolean {
    return this.mode === 'series' && this.isSeriesInProgress;
  }

  get latestRound(): RoundResult | null {
    return this.rounds.length > 0 ? this.rounds[this.rounds.length - 1] : null;
  }

  get latestQuickRoll(): RoundResult | null {
    return this.quickRolls.length > 0 ? this.quickRolls[0] : null;
  }

  // Built from the published rounds, never from the engine's own list: a round still in
  // flight stays out of the summary until its dice have landed. The engine itself is not
  // reactive, so summaryRevision signals when it is replaced (new setup or player).
  readonly summary: SeriesSummary = $derived.by(() => {
    void this.summaryRevision;
    const { id, config, playerName } = this.engine;
    return computeSeriesSummary(id, config, playerName, this.rounds);
  });

  get progressPercent(): number {
    return Math.min(100, Math.round((this.rounds.length / this.seriesLength) * 100));
  }

  readonly leaderboard: PlayerLeaderboardEntry[] = $derived(
    computePlayerLeaderboard(this.history, this.players),
  );

  // Mode switching
  setMode(mode: AppMode): void {
    if (this.isRolling || this.isAutoRolling || this.mode === mode) return;
    if (mode === 'series') {
      if (this.rounds.length > 0) {
        // Series has at least one round (in progress or completed): resume with its own setup
        this.faces = this.engine.config.faces;
        this.countPerRoll = this.engine.config.countPerRoll;
      } else {
        // Series is empty: recreate it silently with the current setup
        this.resetCurrentSeries({ announce: false });
      }
    }
    this.mode = mode;
    this.announcerMessage =
      mode === 'quick' ? 'Switched to Quick Roll mode.' : 'Switched to Series mode.';
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
      this.announcerMessage = 'Series in progress. Reset the series to change the setup.';
    }
    return locked;
  }

  // Rebuilds the series for a new dice setup. In Quick Roll mode any existing series
  // (in progress or completed) is never touched; an empty series is kept silently aligned.
  private applyDiceSetupChange(): void {
    if (this.mode === 'quick') {
      if (this.rounds.length === 0) {
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
    const clamped = Math.min(10, Math.max(1, Math.round(count)));
    if (this.countPerRoll === clamped) return;
    if (this.rejectWhileSeriesRuns(this.isConfigLocked)) return;
    this.countPerRoll = clamped;
    this.applyDiceSetupChange();
  }

  setSeriesLength(length: number): void {
    if (this.isRolling) return;
    if (!Number.isFinite(length)) return;
    const clamped = Math.min(21, Math.max(1, Math.round(length)));
    if (this.seriesLength === clamped) return;
    if (this.rejectWhileSeriesRuns(this.isSeriesInProgress)) return;
    this.seriesLength = clamped;
    this.resetCurrentSeries({ announce: this.mode === 'series' });
  }

  toggleInstantMode(): void {
    this.instantMode = !this.instantMode;
  }

  // Player Management
  addPlayer(name: string): void {
    if (this.isRolling) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (this.rejectWhileSeriesRuns(this.isSeriesInProgress)) return;
    const nextIndex = this.players.length;
    const color = PLAYER_PALETTE[nextIndex % PLAYER_PALETTE.length];
    const newPlayer: Player = {
      id: `player-${Date.now()}-${nextIndex + 1}`,
      name: trimmed,
      color,
    };
    this.players = [...this.players, newPlayer];
    this.activePlayerId = newPlayer.id;
    this.resetCurrentSeries();
  }

  setActivePlayer(id: string): void {
    if (this.isRolling) return;
    if (this.activePlayerId === id) return;
    const exists = this.players.some((p) => p.id === id);
    if (!exists) return;
    if (this.rejectWhileSeriesRuns(this.isSeriesInProgress)) return;
    this.activePlayerId = id;
    this.resetCurrentSeries();
  }

  // Quick Roll action
  async executeQuickRoll(): Promise<RoundResult | null> {
    if (this.isRolling) {
      return null;
    }

    this.isRolling = true;
    try {
      const faces = this.faces;
      const values = await this.cryptoProvider.rollRound(faces, this.countPerRoll);

      // The result stays hidden until the dice have landed
      await this.playVisual(faces, values);

      const round = computeRoundResult(this.quickRollCount, values, faces);
      round.faces = faces;
      this.quickRollCount += 1;
      this.quickRolls = [round, ...this.quickRolls.slice(0, 24)];

      if (this.mode === 'quick') {
        if (faces === 2) {
          const sideNames = round.values.map((v) => (v === 1 ? 'Heads' : 'Tails')).join(', ');
          const outcome =
            round.roundWinnerSide === 'TIE' ? 'Tied.' : `${round.roundWinnerSide} wins.`;
          this.announcerMessage = `Quick roll: ${sideNames}. ${outcome}`;
        } else {
          this.announcerMessage = `Quick roll: Rolled ${round.values.join(', ')}. Sum: ${round.sum}.`;
        }
      }

      return round;
    } finally {
      this.isRolling = false;
    }
  }

  clearQuickRolls(): void {
    this.quickRolls = [];
    this.quickRollCount = 0;
    this.announcerMessage = 'Quick roll feed cleared.';
  }

  // Series Rolling actions
  async rollNextRound(): Promise<RoundResult | null> {
    if (this.isRolling || this.isComplete) {
      return null;
    }

    this.isRolling = true;
    try {
      const engine = this.engine;
      const faces = engine.config.faces;
      const round = await engine.rollNextRound();

      // The result stays hidden until the dice have landed
      await this.playVisual(faces, round.values);

      if (engine !== this.engine) {
        // The series was reset while this round was in flight: the round is discarded
        return null;
      }
      this.rounds = [...engine.rounds];
      this.summaryRevision++;

      let completedSummary: SeriesSummary | null = null;
      if (this.isComplete) {
        completedSummary = engine.getSummary();
        this.history = [completedSummary, ...this.history.slice(0, 49)];
        saveHistoryToStorage(this.history);
      }

      if (this.mode === 'series') {
        // Generate a11y announcement
        const roundNum = round.roundIndex + 1;
        let roundAnnounce = '';
        if (faces === 2) {
          const sideNames = round.values.map((v) => (v === 1 ? 'Heads' : 'Tails')).join(', ');
          const outcome =
            round.roundWinnerSide === 'TIE'
              ? 'Round tied.'
              : `${round.roundWinnerSide} wins round.`;
          roundAnnounce = `Round ${roundNum} of ${this.seriesLength}: ${sideNames}. ${outcome}`;
        } else {
          roundAnnounce = `Round ${roundNum} of ${this.seriesLength}: Rolled ${round.values.join(', ')}. Sum: ${round.sum}.`;
        }

        if (completedSummary) {
          let seriesAnnounce = '';
          if (faces === 2) {
            seriesAnnounce = ` Series complete! ${
              completedSummary.coinSeriesWinner === 'TIE'
                ? 'Series ended in a tie'
                : completedSummary.coinSeriesWinner + ' wins series'
            } with ${completedSummary.headsRoundsWon} Heads rounds to ${completedSummary.tailsRoundsWon} Tails rounds.`;
          } else {
            seriesAnnounce = ` Series complete for ${this.activePlayer.name}! Total sum: ${completedSummary.totalSum}, Average: ${completedSummary.average.toFixed(1)}, Best round: ${completedSummary.bestRoundIndex + 1}.`;
          }
          this.announcerMessage = roundAnnounce + seriesAnnounce;
        } else {
          this.announcerMessage = roundAnnounce;
        }
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
          await new Promise((resolve) => setTimeout(resolve, 450));
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
    this.engine = this.createEngine();
    this.rounds = [];
    this.summaryRevision++;
    if (options.announce !== false) {
      this.announcerMessage = `Series reset for ${this.activePlayer.name}. Ready to roll.`;
    }
  }

  clearHistory(): void {
    this.history = [];
    saveHistoryToStorage([]);
    this.announcerMessage = 'Roll history cleared.';
  }
}

export { ALLOWED_FACES };
export const rollState = new RollState();
