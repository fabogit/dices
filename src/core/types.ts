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
  faces?: DieFaces;
}

export interface ModeStat {
  values: number[];
  frequency: number;
  isTie: boolean;
}

export interface FaceDistributionEntry {
  face: number;
  label: string;
  count: number;
  percentage: number;
  expectedPercentage: number;
  deltaPercentage: number;
}

export interface CoinSeriesStats {
  headsCount: number;
  tailsCount: number;
  headsPercentage: number;
  tailsPercentage: number;
  headsDeltaPercentage: number;
  tailsDeltaPercentage: number;
  headsRoundsWon: number;
  tailsRoundsWon: number;
  tieRounds: number;
}

export interface SeriesAnalytics {
  totalDiceRolled: number;
  expectedRoundAverage: number;
  averageDelta: number;
  standardDeviation: number;
  theoreticalRoundStdDev: number;
  zScore: number;
  sampleReliability: 'empty' | 'small' | 'moderate' | 'solid';
  distributionPeakPercentage: number;
  hottestFaces: number[];
  coldestFaces: number[];
  highRollCount: number;
  highRollRate: number; // percentage (0..100) of rolls strictly in upper half (> faces / 2)
  criticalMaxCount: number;
  criticalMaxRate: number; // percentage (0..100) of rolls equal to `faces` (or Heads for d2)
  criticalMinCount: number;
  criticalMinRate: number; // percentage (0..100) of rolls equal to `1`
  distribution: FaceDistributionEntry[];
  coinStats?: CoinSeriesStats;
  insightSummary: string;
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
  totalHeads?: number;
  totalTails?: number;
  headsRoundsWon?: number;
  tailsRoundsWon?: number;
  completedAt: number;
}

export interface PlayerLeaderboardEntry {
  playerId: string;
  playerName: string;
  color: string;
  seriesPlayed: number;
  totalRolls: number;
  normalizedLuckScore: number;
  criticalMaxRate: number;
  coinSeriesWon: number;
  coinHeadsRate?: number;
  coinTosses?: number;
}

export interface QuickRollStats {
  faces: DieFaces;
  values: number[];
  timestamp: number;
  headsCount?: number;
  tailsCount?: number;
  headsPercentage?: number;
  tailsPercentage?: number;
  sum?: number;
  expectedSum?: number;
  sumDelta?: number;
  zScore?: number;
  criticalMaxCount?: number;
  criticalMinCount?: number;
  insight: string;
}

export interface QuickRollSessionStats {
  faces: DieFaces;
  matchingThrows: number;
  totalDiceCount: number;
  totalHeads?: number;
  totalTails?: number;
  headsPercentage?: number;
  tailsPercentage?: number;
  balanceVerdict?: string;
  actualAverage?: number;
  expectedAverage?: number;
  averageDelta?: number;
  criticalMaxCount?: number;
  criticalMinCount?: number;
  insight: string;
}
