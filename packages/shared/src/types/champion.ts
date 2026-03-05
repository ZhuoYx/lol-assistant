/** 英雄统计 */
export interface ChampionStats {
  championId: number;
  championName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKDA: number;
  /** 平均对局时长（秒） */
  avgGameDuration: number;
  /** MVP 次数 */
  mvpCount: number;
  /** SVP 次数 */
  svpCount: number;
  /** 最近一次使用时间戳 */
  lastPlayed: number;
}

/** 英雄基础信息 */
export interface ChampionInfo {
  id: number;
  name: string;
  title: string;
  key: string;
  tags: string[];
}

/** 英雄熟练度 */
export interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
}
