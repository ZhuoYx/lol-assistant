/** 缓存 TTL 配置（毫秒） */
export const CACHE_TTL = {
  /** 召唤师信息 - 5 分钟 */
  summoner: 5 * 60 * 1000,
  /** 战绩列表 - 2 分钟 */
  matchList: 2 * 60 * 1000,
  /** 战绩详情 - 30 分钟 */
  matchDetail: 30 * 60 * 1000,
  /** 排位信息 - 5 分钟 */
  rankStats: 5 * 60 * 1000,
  /** 实时对局 - 不缓存 */
  liveGame: 0,
} as const;

/** 缓存大小上限配置 */
export const CACHE_MAX_ENTRIES = {
  matchList: 5,
  matchDetail: 50,
} as const;

/** 缓存总大小上限（字节）- 50MB */
export const CACHE_MAX_TOTAL_SIZE = 50 * 1024 * 1024;

/** 静态资源缓存配置 */
export const ASSET_CACHE = {
  /** 元数据缓存有效期 - 24 小时 */
  metadataTTL: 24 * 60 * 60 * 1000,
  /** 资源缓存总大小上限 - 200MB */
  maxTotalSize: 200 * 1024 * 1024,
  /** 图片下载超时 - 30 秒 */
  downloadTimeout: 30 * 1000,
  /** JSON 请求超时 - 15 秒 */
  fetchTimeout: 15 * 1000,
} as const;

/** 爬取数据缓存配置 */
export const SCRAPER_CACHE = {
  /** 数据过期时间 - 3 天 */
  dataExpiry: 3 * 24 * 60 * 60 * 1000,
  /** 最短刷新间隔 - 6 小时 */
  minRefreshInterval: 6 * 60 * 60 * 1000,
  /** 失败重试次数 */
  retryCount: 3,
  /** 失败重试延迟 - 5 分钟 */
  retryDelay: 5 * 60 * 1000,
} as const;
