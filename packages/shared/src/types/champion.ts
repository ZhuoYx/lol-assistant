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
