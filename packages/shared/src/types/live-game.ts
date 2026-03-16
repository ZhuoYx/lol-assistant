/** 对局实时分析 */
export interface LiveGameAnalysis {
  gameId: number;
  gameMode: string;
  queueId?: number;
  teams: LiveGameTeam[];
}

/** 对局队伍 */
export interface LiveGameTeam {
  teamId: number;
  players: LiveGamePlayer[];
  /** 预组队分组：同一数组内的 puuid 是预组队的 */
  premadeGroups?: string[][];
}

/** 近期战绩摘要 */
export interface RecentMatchSummary {
  gameId: number;
  championId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  queueId: number;
  gameDuration: number;
  gameCreation: number;
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
  /** 近 10 把战绩摘要 */
  recentMatches?: RecentMatchSummary[];
  /** 分路位置 (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY) */
  position?: string;
  /** 召唤师技能 ID */
  spell1Id?: number;
  spell2Id?: number;
  /** 数据加载状态 */
  dataStatus: 'loaded' | 'loading' | 'failed';
}
