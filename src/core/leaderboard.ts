import type { Player, PlayerLeaderboardEntry, SeriesSummary } from './types';

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
    let weightedLuckScoreSum = 0;
    let coinSeriesWon = 0;
    let coinTosses = 0;
    let totalCoinHeads = 0;

    for (const s of playerSeries) {
      const rollsInSeries = s.analytics.totalDiceRolled;
      totalRolls += rollsInSeries;
      criticalMaxCountTotal += s.analytics.criticalMaxCount;

      let seriesLuck = 100;
      if (s.kind === 'coin') {
        const headsInSeries = s.totalHeads;
        coinTosses += rollsInSeries;
        totalCoinHeads += headsInSeries;

        if (rollsInSeries > 0) {
          const headsRate = (headsInSeries / rollsInSeries) * 100;
          seriesLuck = (headsRate / 50) * 100;
        } else {
          seriesLuck = 100;
        }

        if (s.coinSeriesWinner === 'HEADS') {
          coinSeriesWon++;
        }
      } else if (s.analytics.expectedRoundAverage > 0 && s.rounds.length > 0) {
        seriesLuck = (s.average / s.analytics.expectedRoundAverage) * 100;
      } else {
        seriesLuck = 100;
      }

      weightedLuckScoreSum += seriesLuck * rollsInSeries;
    }

    const normalizedLuckScore = totalRolls > 0 ? weightedLuckScoreSum / totalRolls : 100;
    const criticalMaxRate = totalRolls > 0 ? (criticalMaxCountTotal / totalRolls) * 100 : 0;
    const coinHeadsRate = coinTosses > 0 ? (totalCoinHeads / coinTosses) * 100 : undefined;

    entries.push({
      playerId,
      playerName: meta.name,
      color: meta.color,
      seriesPlayed,
      totalRolls,
      normalizedLuckScore,
      criticalMaxRate,
      coinSeriesWon,
      ...(coinTosses > 0 ? { coinHeadsRate, coinTosses } : {}),
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
