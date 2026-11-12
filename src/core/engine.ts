import { validateRollConfig } from './csprng';
import { LocalCryptoRollProvider, type IRollProvider } from './provider';
import type {
  CoinSide,
  DieFaces,
  FaceDistributionEntry,
  ModeStat,
  Player,
  PlayerLeaderboardEntry,
  RollConfig,
  RoundResult,
  SeriesAnalytics,
  SeriesSummary,
} from './types';

export function computeRoundResult(
  roundIndex: number,
  values: number[],
  faces: DieFaces,
  timestamp: number = Date.now(),
): RoundResult {
  const sum = values.reduce((acc, v) => acc + v, 0);
  const max = values.length > 0 ? Math.max(...values) : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;

  if (faces === 2) {
    const headsCount = values.filter((v) => v === 1).length;
    const tailsCount = values.filter((v) => v === 2).length;
    const roundWinnerSide: CoinSide | 'TIE' =
      headsCount > tailsCount ? 'HEADS' : tailsCount > headsCount ? 'TAILS' : 'TIE';

    return {
      roundIndex,
      values: [...values],
      sum,
      max,
      min,
      headsCount,
      tailsCount,
      roundWinnerSide,
      timestamp,
    };
  }

  return {
    roundIndex,
    values: [...values],
    sum,
    max,
    min,
    timestamp,
  };
}

export function computeMode(values: number[]): ModeStat {
  if (values.length === 0) {
    return {
      values: [],
      frequency: 0,
      isTie: false,
    };
  }

  const freqMap = new Map<number, number>();
  for (const v of values) {
    freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
  }

  let maxFrequency = 0;
  for (const count of freqMap.values()) {
    if (count > maxFrequency) {
      maxFrequency = count;
    }
  }

  const topValues: number[] = [];
  for (const [val, count] of freqMap.entries()) {
    if (count === maxFrequency) {
      topValues.push(val);
    }
  }

  topValues.sort((a, b) => a - b);

  return {
    values: topValues,
    frequency: maxFrequency,
    isTie: topValues.length > 1,
  };
}

export function computeSeriesAnalytics(
  config: RollConfig,
  rounds: RoundResult[],
): SeriesAnalytics {
  const allValues = rounds.flatMap((r) => r.values);
  const totalDiceRolled = allValues.length;
  const expectedRoundAverage = config.countPerRoll * ((config.faces + 1) / 2);

  const roundAverage =
    rounds.length > 0 ? rounds.reduce((acc, r) => acc + r.sum, 0) / rounds.length : 0;
  const averageDelta = rounds.length > 0 ? roundAverage - expectedRoundAverage : 0;

  // Population Standard Deviation of round sums
  let standardDeviation = 0;
  if (rounds.length > 0) {
    const variance =
      rounds.reduce((acc, r) => acc + Math.pow(r.sum - roundAverage, 2), 0) / rounds.length;
    standardDeviation = Math.sqrt(variance);
  }

  // Critical counts and high roll counts
  let highRollCount = 0;
  let criticalMaxCount = 0;
  let criticalMinCount = 0;

  if (config.faces === 2) {
    // For d2, 1 = HEADS (criticalMax & highRoll), 2 = TAILS (criticalMin)
    for (const v of allValues) {
      if (v === 1) {
        highRollCount++;
        criticalMaxCount++;
      } else if (v === 2) {
        criticalMinCount++;
      }
    }
  } else {
    const half = config.faces / 2;
    for (const v of allValues) {
      if (v > half) {
        highRollCount++;
      }
      if (v === config.faces) {
        criticalMaxCount++;
      }
      if (v === 1) {
        criticalMinCount++;
      }
    }
  }

  const highRollRate = totalDiceRolled > 0 ? (highRollCount / totalDiceRolled) * 100 : 0;
  const criticalMaxRate = totalDiceRolled > 0 ? (criticalMaxCount / totalDiceRolled) * 100 : 0;
  const criticalMinRate = totalDiceRolled > 0 ? (criticalMinCount / totalDiceRolled) * 100 : 0;

  // Distribution for faces 1..faces
  const freqMap = new Map<number, number>();
  for (const v of allValues) {
    freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
  }

  const expectedPercentage = 100 / config.faces;
  const distribution: FaceDistributionEntry[] = [];

  for (let face = 1; face <= config.faces; face++) {
    const count = freqMap.get(face) ?? 0;
    const percentage = totalDiceRolled > 0 ? (count / totalDiceRolled) * 100 : 0;
    const deltaPercentage = percentage - expectedPercentage;
    const label =
      config.faces === 2
        ? face === 1
          ? 'HEADS'
          : 'TAILS'
        : `${face}`;

    distribution.push({
      face,
      label,
      count,
      percentage,
      expectedPercentage,
      deltaPercentage,
    });
  }

  return {
    totalDiceRolled,
    expectedRoundAverage,
    averageDelta,
    standardDeviation,
    highRollCount,
    highRollRate,
    criticalMaxCount,
    criticalMaxRate,
    criticalMinCount,
    criticalMinRate,
    distribution,
  };
}

export function computeSeriesSummary(
  id: string,
  config: RollConfig,
  playerName: string,
  rounds: RoundResult[],
  completedAt: number = Date.now(),
): SeriesSummary {
  const analytics = computeSeriesAnalytics(config, rounds);

  if (rounds.length === 0) {
    return {
      id,
      config: { ...config },
      playerId: config.playerId,
      playerName,
      rounds: [],
      totalSum: 0,
      overallMax: 0,
      overallMin: 0,
      average: 0,
      bestRoundIndex: -1,
      worstRoundIndex: -1,
      mode: { values: [], frequency: 0, isTie: false },
      analytics,
      completedAt,
    };
  }

  const totalSum = rounds.reduce((acc, r) => acc + r.sum, 0);
  const overallMax = Math.max(...rounds.map((r) => r.max));
  const overallMin = Math.min(...rounds.map((r) => r.min));
  const average = totalSum / rounds.length;

  let bestRoundIndex = rounds[0].roundIndex;
  let bestSum = rounds[0].sum;
  let worstRoundIndex = rounds[0].roundIndex;
  let worstSum = rounds[0].sum;

  for (let i = 1; i < rounds.length; i++) {
    const round = rounds[i];
    if (round.sum > bestSum) {
      bestSum = round.sum;
      bestRoundIndex = round.roundIndex;
    }
    if (round.sum < worstSum) {
      worstSum = round.sum;
      worstRoundIndex = round.roundIndex;
    }
  }

  const allValues = rounds.flatMap((r) => r.values);
  const mode = computeMode(allValues);

  const summary: SeriesSummary = {
    id,
    config: { ...config },
    playerId: config.playerId,
    playerName,
    rounds: [...rounds],
    totalSum,
    overallMax,
    overallMin,
    average,
    bestRoundIndex,
    worstRoundIndex,
    mode,
    analytics,
    completedAt,
  };

  if (config.faces === 2) {
    const totalHeads = rounds.reduce((acc, r) => acc + (r.headsCount ?? 0), 0);
    const totalTails = rounds.reduce((acc, r) => acc + (r.tailsCount ?? 0), 0);
    const headsRoundsWon = rounds.filter((r) => r.roundWinnerSide === 'HEADS').length;
    const tailsRoundsWon = rounds.filter((r) => r.roundWinnerSide === 'TAILS').length;
    const coinSeriesWinner: CoinSide | 'TIE' =
      headsRoundsWon > tailsRoundsWon
        ? 'HEADS'
        : tailsRoundsWon > headsRoundsWon
          ? 'TAILS'
          : 'TIE';

    summary.totalHeads = totalHeads;
    summary.totalTails = totalTails;
    summary.headsRoundsWon = headsRoundsWon;
    summary.tailsRoundsWon = tailsRoundsWon;
    summary.coinSeriesWinner = coinSeriesWinner;
  }

  return summary;
}

export function computePlayerLeaderboard(
  history: SeriesSummary[],
  players: Player[],
): PlayerLeaderboardEntry[] {
  const playerMap = new Map<string, { name: string; color: string }>();
  for (const p of players) {
    playerMap.set(p.id, { name: p.name, color: p.color });
  }
  for (const s of history) {
    if (!playerMap.has(s.playerId)) {
      playerMap.set(s.playerId, { name: s.playerName, color: '#94a3b8' });
    }
  }

  const entries: PlayerLeaderboardEntry[] = [];

  for (const [playerId, meta] of playerMap.entries()) {
    const playerSeries = history.filter((s) => s.playerId === playerId);
    const seriesPlayed = playerSeries.length;

    let totalRolls = 0;
    let criticalMaxCountTotal = 0;
    let luckScoreSum = 0;
    let coinSeriesWon = 0;

    for (const s of playerSeries) {
      totalRolls += s.analytics.totalDiceRolled;
      criticalMaxCountTotal += s.analytics.criticalMaxCount;

      if (s.analytics.expectedRoundAverage > 0 && s.rounds.length > 0) {
        luckScoreSum += (s.average / s.analytics.expectedRoundAverage) * 100;
      } else {
        luckScoreSum += 100;
      }

      if (s.config.faces === 2 && s.coinSeriesWinner === 'HEADS') {
        coinSeriesWon++;
      }
    }

    const normalizedLuckScore = seriesPlayed > 0 ? luckScoreSum / seriesPlayed : 100;
    const criticalMaxRate = totalRolls > 0 ? (criticalMaxCountTotal / totalRolls) * 100 : 0;

    entries.push({
      playerId,
      playerName: meta.name,
      color: meta.color,
      seriesPlayed,
      totalRolls,
      normalizedLuckScore,
      criticalMaxRate,
      coinSeriesWon,
    });
  }

  entries.sort((a, b) => {
    if (b.seriesPlayed === 0 && a.seriesPlayed === 0) return 0;
    if (b.seriesPlayed === 0) return -1;
    if (a.seriesPlayed === 0) return 1;
    return b.normalizedLuckScore - a.normalizedLuckScore;
  });

  return entries;
}

export class RollSeriesEngine {
  readonly id: string;
  readonly config: RollConfig;
  readonly playerName: string;
  private readonly provider: IRollProvider;
  private _rounds: RoundResult[] = [];

  constructor(
    config: RollConfig,
    playerName: string,
    provider: IRollProvider = new LocalCryptoRollProvider(),
    id?: string,
  ) {
    validateRollConfig(config);
    this.config = { ...config };
    this.playerName = playerName;
    this.provider = provider;
    this.id =
      id ??
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `series-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  }

  get rounds(): ReadonlyArray<RoundResult> {
    return this._rounds;
  }

  get isComplete(): boolean {
    return this._rounds.length >= this.config.seriesLength;
  }

  get currentRoundIndex(): number {
    return this._rounds.length;
  }

  async rollNextRound(): Promise<RoundResult> {
    if (this.isComplete) {
      throw new Error(
        `Series is already complete (${this._rounds.length}/${this.config.seriesLength} rounds played)`
      );
    }

    const values = await this.provider.rollRound(
      this.config.faces,
      this.config.countPerRoll,
    );
    const round = computeRoundResult(this._rounds.length, values, this.config.faces);
    this._rounds.push(round);
    return round;
  }

  async rollAllRemainingRounds(): Promise<RoundResult[]> {
    while (!this.isComplete) {
      await this.rollNextRound();
    }
    return [...this._rounds];
  }

  getSummary(completedAt?: number): SeriesSummary {
    return computeSeriesSummary(
      this.id,
      this.config,
      this.playerName,
      this._rounds,
      completedAt,
    );
  }

  reset(): void {
    this._rounds = [];
  }
}
