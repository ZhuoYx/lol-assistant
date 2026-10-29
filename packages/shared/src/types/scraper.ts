export type ChampionDataSource = 'opgg' | 'qq101';

/** 英雄 Tier 信息 */
export interface ChampionTier {
  championId: number;
  role: string;
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  winRate: number;
  pickRate: number;
  banRate: number;
}

/** ARAM 英雄 Tier 信息（大乱斗/海克斯大乱斗通用） */
export interface AramChampionTier {
  championId: number;
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  winRate: number;
  pickRate: number;
  rank: number;
  games: number;
}

/** 英雄构建数据 */
export interface ChampionBuilds {
  championId: number;
  role: string;
  patch: string;
  dataSource: ChampionDataSource;
  runeBuilds: RuneBuild[];
  itemBuilds: ItemBuild[];
  skillOrder: string[];
  /** 技能优先级（如 ["Q","E","W"]，仅 3 个主/副/三） */
  skillPriority?: string[];
  /** 该英雄实际可用的位置列表（来自 API 数据） */
  availableRoles?: string[];
}

/** 符文构建 */
export interface RuneBuild {
  name: string;
  winRate: number;
  pickRate: number;
  sampleSize: number;
  primaryTree: number;
  primaryPerks: number[];
  secondaryTree: number;
  secondaryPerks: number[];
  statShards: number[];
}

/** 装备构建 */
export interface ItemBuild {
  name: string;
  winRate: number;
  pickRate: number;
  sampleSize: number;
  items: number[];
  startingItems: number[];
  boots: number;
}

/** 英雄克制关系 */
export interface ChampionCounters {
  dataSource?: ChampionDataSource;
  championId: number;
  role: string;
  hardCounters: CounterInfo[];
  easyMatchups: CounterInfo[];
}

/** 克制信息 */
export interface CounterInfo {
  championId: number;
  winRate: number;
  sampleSize: number;
}

/** 爬取数据版本信息 */
export interface ScraperDataVersion {
  patch: string;
  lastUpdated: number;
  source: ChampionDataSource;
}

/** 英雄排名信息（来自 OP.GG） */
export interface ChampionRanking {
  championId: number;
  position: string;
  tier: number;           // 1-5 对应 OP/S/A/B/C
  rank: number;           // 同 tier 内排名
  rankPrev: number;       // 上期排名
  winRate: number;        // 0-1
  pickRate: number;       // 0-1
  banRate: number;        // 0-1
  kda: number;
  games: number;          // 总场次
}

/** 英雄排名列表响应 */
export interface ChampionRankingList {
  rankings: ChampionRanking[];
  patch: string;
  tier: string;           // 段位筛选
  position: string;       // 位置筛选
}

/** 爬取器接口 */
export interface IChampionDataScraper {
  getChampionTierList(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]>;
  getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds>;
  getChampionCounters(championId: number, role?: string): Promise<ChampionCounters>;
}
