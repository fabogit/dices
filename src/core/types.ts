export const ALLOWED_FACES = [2, 4, 6, 8, 10, 12, 20] as const;

export type DieFaces = (typeof ALLOWED_FACES)[number];

export type PolyhedralFaces = Exclude<DieFaces, 2>;

export type CoinSide = 'HEADS' | 'TAILS';

export type AppMode = 'quick' | 'series';

export type SampleReliability = 'empty' | 'small' | 'moderate' | 'solid';

export type DeltaDirection = 'positive' | 'negative' | 'neutral';

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

export type CoinRollConfig = RollConfig & { faces: 2 };
export type DiceRollConfig = RollConfig & { faces: PolyhedralFaces };

export interface BaseRoundResult {
  id: string;
  roundIndex: number;
  values: number[];
  sum: number;
  max: number;
  min: number;
  timestamp: number;
}

export interface CoinRoundResult extends BaseRoundResult {
  kind: 'coin';
  faces: 2;
  headsCount: number;
  tailsCount: number;
  roundWinnerSide: CoinSide | 'TIE';
}

export interface DiceRoundResult extends BaseRoundResult {
  kind: 'dice';
  faces: PolyhedralFaces;
}

export type RoundResult = CoinRoundResult | DiceRoundResult;

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
  barWidthPercentage: number;
  expectedMarkerPercentage: number;
  deltaDirection: DeltaDirection;
  isHot: boolean;
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
  zQualitative: string;
}

export interface BaseSeriesAnalytics {
  totalDiceRolled: number;
  expectedRoundAverage: number;
  averageDelta: number;
  standardDeviation: number;
  theoreticalRoundStdDev: number;
  zScore: number;
  sampleReliability: SampleReliability;
  sampleReliabilityLabel: string;
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
  insightSummary: string;
}

export interface CoinSeriesAnalytics extends BaseSeriesAnalytics {
  kind: 'coin';
  coinStats: CoinSeriesStats;
}

export interface DiceSeriesAnalytics extends BaseSeriesAnalytics {
  kind: 'dice';
}

export type SeriesAnalytics = CoinSeriesAnalytics | DiceSeriesAnalytics;

export interface BaseSeriesSummary {
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
  completedAt: number;
}

export interface CoinSeriesSummary extends BaseSeriesSummary {
  kind: 'coin';
  analytics: CoinSeriesAnalytics;
  coinSeriesWinner: CoinSide | 'TIE';
  totalHeads: number;
  totalTails: number;
  headsRoundsWon: number;
  tailsRoundsWon: number;
}

export interface DiceSeriesSummary extends BaseSeriesSummary {
  kind: 'dice';
  analytics: DiceSeriesAnalytics;
}

export type SeriesSummary = CoinSeriesSummary | DiceSeriesSummary;

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

export interface BaseQuickRollStats {
  values: number[];
  timestamp: number;
  insight: string;
}

export interface CoinQuickRollStats extends BaseQuickRollStats {
  kind: 'coin';
  faces: 2;
  roundWinnerSide: CoinSide | 'TIE';
  headsCount: number;
  tailsCount: number;
  headsPercentage: number;
  tailsPercentage: number;
}

export interface DiceQuickRollStats extends BaseQuickRollStats {
  kind: 'dice';
  faces: PolyhedralFaces;
  sum: number;
  max: number;
  min: number;
  expectedSum: number;
  sumDelta: number;
  zScore: number;
  criticalMaxCount: number;
  criticalMinCount: number;
}

export type QuickRollStats = CoinQuickRollStats | DiceQuickRollStats;

export interface EmptyQuickRollSessionStats {
  kind: 'empty';
  faces: DieFaces;
  matchingThrows: 0;
  totalDiceCount: 0;
  insight: string;
}

export interface CoinQuickRollSessionStats {
  kind: 'coin';
  faces: 2;
  matchingThrows: number;
  totalDiceCount: number;
  totalHeads: number;
  totalTails: number;
  headsPercentage: number;
  tailsPercentage: number;
  balanceVerdict: string;
  insight: string;
}

export interface DiceQuickRollSessionStats {
  kind: 'dice';
  faces: PolyhedralFaces;
  matchingThrows: number;
  totalDiceCount: number;
  actualAverage: number;
  expectedAverage: number;
  averageDelta: number;
  criticalMaxCount: number;
  criticalMinCount: number;
  insight: string;
}

export type PopulatedQuickRollSessionStats = CoinQuickRollSessionStats | DiceQuickRollSessionStats;

export type QuickRollSessionStats = EmptyQuickRollSessionStats | PopulatedQuickRollSessionStats;
