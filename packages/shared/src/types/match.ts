/** 战绩摘要 */
export interface MatchSummary {
  gameId: number;
  gameMode: string;
  gameType: string;
  queueId: number;
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
  /** 是否为胜利方 KDA 最高者 */
  isMVP?: boolean;
  /** 是否为失败方 KDA 最高者 */
  isSVP?: boolean;
  totalDamageDealtToChampions?: number;
  totalDamageTaken?: number;
  goldEarned?: number;
}

/** 战绩列表 */
export interface MatchList {
  matches: MatchSummary[];
  totalGames: number;
  /** Next service offset; lists are requested page by page without local filtering. */
  nextIndex?: number;
  hasMore?: boolean;
  /** Used to detect servers that ignore pagination and repeat the first page. */
  pageGameIds?: number[];
  source?: 'lcu' | 'sgp';
  platformId?: string;
}

/** 战绩列表查询参数 */
export interface MatchListParams {
  puuid?: string;
  begIndex?: number;
  endIndex?: number;
  championId?: number;
  queue?: number;
  /** IDs from other pages, used to detect a service repeating the first page. */
  knownGameIds?: number[];
  historySource?: 'lcu' | 'sgp';
  platformId?: string;
}

/** 战绩详情 */
export interface MatchDetail {
  gameId: number;
  queueId: number;
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
  participantId: number;
  puuid: string;
  summonerName: string;
  tagLine?: string;
  championId: number;
  championName: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  /** 兼容旧展示字段；这里保存对英雄伤害，所有目标总伤害见 totalDamageDealtAllTargets。 */
  totalDamageDealt: number;
  totalDamageTaken?: number;
  goldEarned?: number;
  visionScore?: number;
  items: number[];
  perks: Perks;
  lane: string;
  role: string;
  isMVP?: boolean;
  isSVP?: boolean;
  totalDamageDealtToChampions?: number;
  physicalDamageDealtToChampions?: number;
  magicDamageDealtToChampions?: number;
  trueDamageDealtToChampions?: number;
  totalDamageDealtAllTargets?: number;
  physicalDamageDealt?: number;
  magicDamageDealt?: number;
  trueDamageDealt?: number;
  physicalDamageTaken?: number;
  magicDamageTaken?: number;
  trueDamageTaken?: number;
  damageSelfMitigated?: number;
  totalHeal?: number;
  totalHealsOnTeammates?: number;
  totalDamageShieldedOnTeammates?: number;
  timeCCingOthers?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  damageDealtToTurrets?: number;
  damageDealtToObjectives?: number;
  goldSpent?: number;
  wardsPlaced?: number;
  wardsKilled?: number;
  visionWardsBoughtInGame?: number;
  totalTimeSpentDead?: number;
  largestMultiKill?: number;
  firstBloodKill?: boolean;
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
