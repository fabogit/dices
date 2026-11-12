import {
  ALLOWED_FACES,
  type DieFaces,
  type Player,
  type PlayerLeaderboardEntry,
  type RollConfig,
  type RoundResult,
  type SeriesSummary,
} from '../core/types';
import { computePlayerLeaderboard, RollSeriesEngine } from '../core/engine';
import type { DiceArena3D } from '../three/DiceArena3D';

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
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
  // Reactive Configurations
  faces: DieFaces = $state(6);
  countPerRoll: number = $state(1);
  seriesLength: number = $state(3);

  // Players
  players: Player[] = $state([
    { id: 'player-1', name: 'Player 1', color: '#38bdf8' },
  ]);
  activePlayerId: string = $state('player-1');

  // Animation & Execution States
  isRolling: boolean = $state(false);
  isAutoRolling: boolean = $state(false);
  instantMode: boolean = $state(getInitialMotionPreference());
  contextLost: boolean = $state(false);

  // Announcer text for assistive technologies (aria-live="polite")
  announcerMessage: string = $state('');

  // History & Reactive Rounds
  history: SeriesSummary[] = $state(loadHistoryFromStorage());
  rounds: RoundResult[] = $state([]);

  // Internal Engine
  private engine: RollSeriesEngine;
  private arena: DiceArena3D | null = null;
  private autoRollAborted: boolean = false;

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
      } else if (typeof (mediaQuery as any).addListener === 'function') {
        (mediaQuery as any).addListener(listener);
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

  get latestRound(): RoundResult | null {
    return this.rounds.length > 0 ? this.rounds[this.rounds.length - 1] : null;
  }

  get summary(): SeriesSummary {
    return this.engine.getSummary();
  }

  get progressPercent(): number {
    return Math.min(100, Math.round((this.rounds.length / this.seriesLength) * 100));
  }

  get leaderboard(): PlayerLeaderboardEntry[] {
    return computePlayerLeaderboard(this.history, this.players);
  }

  // Arena attachment
  setArena(arena: DiceArena3D | null): void {
    this.arena = arena;
  }

  setContextLost(isLost: boolean): void {
    this.contextLost = isLost;
  }

  // Configuration updates
  setFaces(faces: DieFaces): void {
    if (this.faces === faces) return;
    this.faces = faces;
    this.resetCurrentSeries();
  }

  setCountPerRoll(count: number): void {
    const clamped = Math.min(10, Math.max(1, Math.round(count)));
    if (this.countPerRoll === clamped) return;
    this.countPerRoll = clamped;
    this.resetCurrentSeries();
  }

  setSeriesLength(length: number): void {
    const clamped = Math.min(21, Math.max(1, Math.round(length)));
    if (this.seriesLength === clamped) return;
    this.seriesLength = clamped;
    this.resetCurrentSeries();
  }

  toggleInstantMode(): void {
    this.instantMode = !this.instantMode;
  }

  // Player Management
  addPlayer(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
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
    if (this.activePlayerId === id) return;
    const exists = this.players.some((p) => p.id === id);
    if (!exists) return;
    this.activePlayerId = id;
    this.resetCurrentSeries();
  }

  // Rolling actions
  async rollNextRound(): Promise<RoundResult | null> {
    if (this.isRolling || this.isComplete) {
      return null;
    }

    this.isRolling = true;
    try {
      const round = await this.engine.rollNextRound();
      this.rounds = [...this.engine.rounds];

      // Visual 3D roll
      if (this.arena) {
        await this.arena.rollVisual(this.faces, round.values, {
          skipAnimation: this.instantMode,
        });
      }

      // Generate a11y announcement
      const roundNum = round.roundIndex + 1;
      let roundAnnounce = '';
      if (this.faces === 2) {
        const sideNames = round.values.map((v) => (v === 1 ? 'Heads' : 'Tails')).join(', ');
        const outcome =
          round.roundWinnerSide === 'TIE' ? 'Round tied.' : `${round.roundWinnerSide} wins round.`;
        roundAnnounce = `Round ${roundNum} of ${this.seriesLength}: ${sideNames}. ${outcome}`;
      } else {
        roundAnnounce = `Round ${roundNum} of ${this.seriesLength}: Rolled ${round.values.join(', ')}. Sum: ${round.sum}.`;
      }

      if (this.isComplete) {
        const sumry = this.engine.getSummary();
        this.history = [sumry, ...this.history.slice(0, 49)];
        saveHistoryToStorage(this.history);

        let seriesAnnounce = '';
        if (this.faces === 2) {
          seriesAnnounce = ` Series complete! ${
            sumry.coinSeriesWinner === 'TIE'
              ? 'Series ended in a tie'
              : sumry.coinSeriesWinner + ' wins series'
          } with ${sumry.headsRoundsWon} Heads rounds to ${sumry.tailsRoundsWon} Tails rounds.`;
        } else {
          seriesAnnounce = ` Series complete for ${this.activePlayer.name}! Total sum: ${sumry.totalSum}, Average: ${sumry.average.toFixed(1)}, Best round: ${sumry.bestRoundIndex + 1}.`;
        }
        this.announcerMessage = roundAnnounce + seriesAnnounce;
      } else {
        this.announcerMessage = roundAnnounce;
      }

      return round;
    } finally {
      this.isRolling = false;
    }
  }

  async autoRollSeries(): Promise<void> {
    if (this.isRolling || this.isAutoRolling || this.isComplete) {
      return;
    }

    this.isAutoRolling = true;
    this.autoRollAborted = false;

    try {
      while (!this.isComplete && !this.autoRollAborted) {
        await this.rollNextRound();

        if (!this.isComplete && !this.autoRollAborted && !this.instantMode) {
          // Brief pause between animated rounds
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
      }
    } finally {
      this.isAutoRolling = false;
      this.autoRollAborted = false;
    }
  }

  stopAutoRoll(): void {
    this.autoRollAborted = true;
    this.isAutoRolling = false;
  }

  skipAnimation(): void {
    if (this.arena) {
      this.arena.skipCurrentAnimation();
    }
  }

  resetCurrentSeries(): void {
    this.stopAutoRoll();
    this.skipAnimation();
    this.engine = this.createEngine();
    this.rounds = [];
    this.announcerMessage = `Series reset for ${this.activePlayer.name}. Ready to roll.`;
  }

  clearHistory(): void {
    this.history = [];
    saveHistoryToStorage([]);
    this.announcerMessage = 'Roll history cleared.';
  }
}

export { ALLOWED_FACES };
export const rollState = new RollState();
