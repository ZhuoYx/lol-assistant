/** 战绩摘要 */
export interface MatchSummary {
  gameId: number;
  gameMode: string;
  gameType: string;
  gameCreation: number;
  gameDuration: number;
  championId: number;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  lane: string;
  role: string;
}

/** 战绩列表 */
export interface MatchList {
  matches: MatchSummary[];
  totalGames: number;
}

/** 战绩列表查询参数 */
export interface MatchListParams {
  puuid?: string;
  begIndex?: number;
  endIndex?: number;
  championId?: number;
  queue?: number;
}

/** 战绩详情 */
export interface MatchDetail {
  gameId: number;
  gameMode: string;
  gameType: string;
  gameCreation: number;
  gameDuration: number;
  teams: Team[];
  participants: Participant[];
}

/** 队伍信息 */
export interface Team {
  teamId: number;
  win: boolean;
  bans: { championId: number; pickTurn: number }[];
  objectives: Record<string, { first: boolean; kills: number }>;
}

/** 参与者信息 */
export interface Participant {
  puuid: string;
  summonerName: string;
  championId: number;
  championName: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  goldEarned: number;
  visionScore: number;
  items: number[];
  perks: Perks;
  lane: string;
}

/** 符文配置 */
export interface Perks {
  perkStyle: number;
  perkSubStyle: number;
  perkIds: number[];
}

/** 战绩筛选条件 */
export interface MatchFilters {
  championId?: number;
  queue?: number;
  timeRange?: 'week' | 'month' | 'season' | 'all';
}
