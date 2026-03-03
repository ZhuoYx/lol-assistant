/**
 * 计算 KDA 值
 * @returns (kills + assists) / max(deaths, 1)
 */
export function calculateKDA(kills: number, deaths: number, assists: number): number {
  return Number(((kills + assists) / Math.max(deaths, 1)).toFixed(2));
}

/**
 * 计算胜率
 * @returns wins / totalGames (0~1)
 */
export function calculateWinRate(wins: number, totalGames: number): number {
  if (totalGames === 0) return 0;
  return Number((wins / totalGames).toFixed(4));
}

/**
 * 计算击杀参与率
 * @returns (kills + assists) / max(teamKills, 1)
 */
export function calculateKillParticipation(
  kills: number,
  assists: number,
  teamKills: number,
): number {
  if (teamKills === 0) return 0;
  return Number(((kills + assists) / teamKills).toFixed(4));
}

/**
 * 计算平均值
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number((sum / values.length).toFixed(2));
}
