/** 游戏版本信息 */
export interface GameVersion {
  /** 完整版本号，如 "14.10.1" */
  full: string;
  /** 主要版本号，如 "14.10" */
  major: string;
}

/** 资源类型 */
export type AssetType =
  | 'champion-icon'
  | 'champion-splash'
  | 'champion-loading'
  | 'item-icon'
  | 'summoner-spell-icon'
  | 'profile-icon'
  | 'tier-icon'
  | 'rune-icon'
  | 'perk-style-icon';

/** 资源缓存条目 */
export interface AssetCacheEntry {
  /** 资源远程 URL */
  remoteUrl: string;
  /** 本地缓存文件路径 */
  localPath: string;
  /** 缓存时间戳 */
  cachedAt: number;
  /** 文件大小（字节） */
  size: number;
  /** 对应游戏版本 */
  version: string;
}

/** 资源缓存索引 */
export interface AssetCacheIndex {
  /** 当前缓存的游戏版本 */
  version: string;
  /** 缓存最后更新时间 */
  lastUpdated: number;
  /** 缓存条目映射 (key: assetType/assetId) */
  entries: Record<string, AssetCacheEntry>;
  /** 缓存总大小（字节） */
  totalSize: number;
}

/** CommunityDragon 英雄数据 */
export interface CDragonChampionData {
  id: number;
  name: string;
  alias: string;
  title: string;
  roles: string[];
  squarePortraitPath: string;
  skins: CDragonSkinData[];
}

/** CommunityDragon 皮肤数据 */
export interface CDragonSkinData {
  id: number;
  name: string;
  splashPath: string;
  tilePath: string;
}

/** CommunityDragon 装备数据 */
export interface CDragonItemData {
  id: number;
  name: string;
  description: string;
  iconPath: string;
  price: number;
  priceTotal: number;
  from: number[];
  to: number[];
  categories: string[];
}

/** CommunityDragon 符文数据 */
export interface CDragonRuneData {
  id: number;
  name: string;
  shortDesc: string;
  longDesc: string;
  iconPath: string;
}

/** CommunityDragon 符文树数据 */
export interface CDragonRuneTreeData {
  id: number;
  name: string;
  iconPath: string;
  slots: CDragonRuneSlot[];
}

/** CommunityDragon 符文槽位 */
export interface CDragonRuneSlot {
  runes: CDragonRuneData[];
}

/** CommunityDragon 召唤师技能数据 */
export interface CDragonSummonerSpellData {
  id: number;
  name: string;
  description: string;
  iconPath: string;
  gameModes: string[];
}
