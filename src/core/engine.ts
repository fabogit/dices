import { validateRollConfig } from './csprng';
import { LocalCryptoRollProvider, type IRollProvider } from './provider';
import type {
  CoinSide,
  DieFaces,
  ModeStat,
  RollConfig,
  RoundResult,
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

export function computeSeriesSummary(
  id: string,
  config: RollConfig,
  playerName: string,
  rounds: RoundResult[],
  completedAt: number = Date.now(),
): SeriesSummary {
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
