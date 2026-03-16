/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface ElectronAPI {
  // LCU 连接
  lcuConnect: () => Promise<void>;
  lcuDisconnect: () => Promise<void>;
  lcuGetStatus: () => Promise<import('@lol-assistant/shared').ConnectionStatus>;

  // 召唤师
  getCurrentSummoner: () => Promise<import('@lol-assistant/shared').Summoner>;
  getSummonerById: (puuid: string) => Promise<import('@lol-assistant/shared').Summoner>;
  searchSummoner: (query: string) => Promise<import('@lol-assistant/shared').Summoner>;

  // 战绩
  getMatchList: (params: import('@lol-assistant/shared').MatchListParams) => Promise<import('@lol-assistant/shared').MatchList>;
  getMatchDetail: (gameId: number) => Promise<import('@lol-assistant/shared').MatchDetail>;

  // 排位
  getRankStats: (puuid: string) => Promise<import('@lol-assistant/shared').RankStats>;

  // 英雄统计
  getChampionStats: (puuid: string) => Promise<import('@lol-assistant/shared').ChampionStats[]>;

  // 缓存
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<import('@lol-assistant/shared').CacheStats>;

  // WebSocket 事件
  lcuSubscribe: (uri: string) => void;
  lcuUnsubscribe: (uri: string) => void;
  onLCUEvent: (callback: (event: unknown) => void) => () => void;
  onConnectionChange: (callback: (status: import('@lol-assistant/shared').ConnectionStatus) => void) => () => void;

  // 对局实时分析
  analyzeLiveGame: () => Promise<import('@lol-assistant/shared').LiveGameAnalysis>;

  // 第三方数据
  getChampionBuilds: (championId: number, role?: string) => Promise<import('@lol-assistant/shared').ChampionBuilds>;
  refreshChampionBuilds: (championId: number) => Promise<void>;
  getChampionCounters: (championId: number) => Promise<import('@lol-assistant/shared').ChampionCounters>;
  updateScraperData: () => Promise<void>;
  getScraperDataVersion: () => Promise<import('@lol-assistant/shared').ScraperDataVersion | null>;
  getAramTierList: () => Promise<import('@lol-assistant/shared').AramChampionTier[]>;
  getChampionRankings: (position?: string, tier?: string) => Promise<import('@lol-assistant/shared').ChampionRankingList>;

  // 符文页管理
  getPerksPages: () => Promise<unknown[]>;
  applyPerksPage: (pageData: {
    name: string;
    primaryStyleId: number;
    subStyleId: number;
    selectedPerkIds: number[];
  }) => Promise<unknown>;
  deletePerksPage: (pageId: number) => Promise<void>;

  // 窗口管理
  setAlwaysOnTop: (flag: boolean) => void;
  setMiniMode: (flag: boolean) => void;
  minimizeToTray: () => void;

  // 自动更新
  checkForUpdates: () => Promise<import('@lol-assistant/shared').UpdateInfo | null>;
  downloadUpdate: () => void;
  installUpdate: () => void;
  getUpdateStatus: () => Promise<{
    status: string;
    updateInfo: import('@lol-assistant/shared').UpdateInfo | null;
    downloadPercent: number;
  }>;
  onUpdateProgress: (callback: (progress: number) => void) => () => void;
  onUpdateStatusChange: (callback: (status: string) => void) => () => void;
  onUpdateAvailable: (callback: (info: import('@lol-assistant/shared').UpdateInfo) => void) => () => void;

  // 日志
  exportLog: () => Promise<string>;

  // 游戏阶段变化
  onGamePhaseChange: (callback: (phase: string) => void) => () => void;
  onMatchEnded: (callback: () => void) => () => void;

  // 静态资源
  getGameVersion: () => Promise<string | null>;
  getMajorVersion: () => Promise<string | null>;
  getCachedAsset: (remoteUrl: string, assetType: string, assetId: string | number) => Promise<string>;
  getMetadata: (url: string, metaKey: string) => Promise<unknown>;
  getAssetCacheStats: () => Promise<import('@lol-assistant/shared').CacheStats>;
  clearAssetCache: () => Promise<void>;

  // 首次引导
  getIsFirstLaunch: () => Promise<boolean>;
  setFirstLaunchDone: () => Promise<void>;

  // LOL 路径管理
  detectLolPath: () => Promise<string | null>;
  selectLolPath: () => Promise<string | null>;
  validateLolPath: (lolPath: string) => Promise<boolean>;
  saveLolPath: (lolPath: string) => Promise<void>;
  getSavedLolPath: () => Promise<string | null>;

  // 局域网代理
  startProxy: () => Promise<{
    running: boolean;
    port: number;
    localIP: string | null;
    address: string | null;
  }>;
  stopProxy: () => Promise<void>;
  getProxyStatus: () => Promise<{
    running: boolean;
    port: number;
    localIP: string | null;
    address: string | null;
  }>;

  // 客户端设置 - 自动接受
  setAutoAccept: (enabled: boolean, delay: number) => Promise<{ success: boolean }>;
  getAutoAccept: () => Promise<{ enabled: boolean; delay: number }>;

  // 客户端设置 - 藏品背景皮肤
  getBackdrop: (summonerId: number) => Promise<unknown>;
  setBackdrop: (summonerId: number, championId: number, skinId: number) => Promise<{ success: boolean }>;

  // 客户端设置 - 个性签名
  getStatusMessage: () => Promise<string>;
  setStatusMessage: (message: string) => Promise<{ success: boolean }>;

  // ARAM 板凳英雄交换
  benchSwap: (championId: number) => Promise<{ success: boolean }>;

  // 选人阶段 session
  getChampSelectSession: () => Promise<unknown | null>;
}

export {};
