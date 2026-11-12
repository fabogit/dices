export const ALLOWED_FACES = [2, 4, 6, 8, 10, 12, 20] as const;

export type DieFaces = (typeof ALLOWED_FACES)[number];

export type CoinSide = 'HEADS' | 'TAILS';

export interface Player {
  id: string;
  name: string;
  color: string;
}

export interface RollConfig {
  faces: DieFaces;
  countPerRoll: number;
  seriesLength: number;
  playerId: string;
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

export interface ModeStat {
  values: number[];
  frequency: number;
  isTie: boolean;
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
  coinSeriesWinner?: CoinSide | 'TIE';
  totalHeads?: number;
  totalTails?: number;
  headsRoundsWon?: number;
  tailsRoundsWon?: number;
  completedAt: number;
}
