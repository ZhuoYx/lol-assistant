/** 英雄 Tier 信息 */
export interface ChampionTier {
  championId: number;
  role: string;
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  winRate: number;
  pickRate: number;
  banRate: number;
}

/** 英雄构建数据 */
export interface ChampionBuilds {
  championId: number;
  role: string;
  patch: string;
  dataSource: 'opgg' | 'lolalytics' | 'local';
  runeBuilds: RuneBuild[];
  itemBuilds: ItemBuild[];
  skillOrder: string[];
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
  source: 'opgg' | 'lolalytics' | 'local';
}

/** 爬取器接口 */
export interface IChampionDataScraper {
  getChampionTierList(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]>;
  getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds>;
  getChampionCounters(championId: number, role?: string): Promise<ChampionCounters>;
}
