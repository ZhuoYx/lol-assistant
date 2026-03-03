/** 对局实时分析 */
export interface LiveGameAnalysis {
  gameId: number;
  gameMode: string;
  teams: LiveGameTeam[];
}

/** 对局队伍 */
export interface LiveGameTeam {
  teamId: number;
  players: LiveGamePlayer[];
}

/** 对局玩家 */
export interface LiveGamePlayer {
  puuid: string;
  summonerName: string;
  championId: number;
  championName: string;
  /** 段位 */
  tier: string;
  division: string;
  leaguePoints: number;
  /** 该英雄数据 */
  championWinRate: number;
  championGamesPlayed: number;
  championMasteryLevel: number;
  /** 近期表现 */
  recentWinRate: number;
  recentKDA: number;
  /** 数据加载状态 */
  dataStatus: 'loaded' | 'loading' | 'failed';
}
