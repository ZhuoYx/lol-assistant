/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

import type {
  ConnectionStatus,
  CacheStats,
  UpdateInfo,
  Summoner,
  MatchList,
  MatchListParams,
  MatchDetail,
  RankStats,
  LiveGameAnalysis,
  ChampionBuilds,
  ChampionCounters,
  ScraperDataVersion,
} from '@lol-assistant/shared';

interface ElectronAPI {
  // LCU 连接
  lcuConnect: () => Promise<void>;
  lcuDisconnect: () => Promise<void>;
  lcuGetStatus: () => Promise<ConnectionStatus>;

  // 召唤师
  getCurrentSummoner: () => Promise<Summoner>;
  getSummonerById: (puuid: string) => Promise<Summoner>;

  // 战绩
  getMatchList: (params: MatchListParams) => Promise<MatchList>;
  getMatchDetail: (gameId: number) => Promise<MatchDetail>;

  // 排位
  getRankStats: (puuid: string) => Promise<RankStats>;

  // 缓存
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<CacheStats>;

  // WebSocket 事件
  lcuSubscribe: (uri: string) => void;
  lcuUnsubscribe: (uri: string) => void;
  onLCUEvent: (callback: (event: unknown) => void) => () => void;
  onConnectionChange: (callback: (status: ConnectionStatus) => void) => () => void;

  // 对局实时分析
  analyzeLiveGame: () => Promise<LiveGameAnalysis>;

  // 第三方数据
  getChampionBuilds: (championId: number) => Promise<ChampionBuilds>;
  getChampionCounters: (championId: number) => Promise<ChampionCounters>;
  updateScraperData: () => Promise<void>;
  getScraperDataVersion: () => Promise<ScraperDataVersion | null>;

  // 窗口管理
  setAlwaysOnTop: (flag: boolean) => void;
  setMiniMode: (flag: boolean) => void;
  minimizeToTray: () => void;

  // 自动更新
  checkForUpdates: () => Promise<UpdateInfo | null>;
  downloadUpdate: () => void;
  installUpdate: () => void;
  onUpdateProgress: (callback: (progress: number) => void) => () => void;

  // 日志
  exportLog: () => Promise<string>;

  // 游戏阶段变化
  onGamePhaseChange: (callback: (phase: string) => void) => () => void;

  // 静态资源
  getGameVersion: () => Promise<string | null>;
  getMajorVersion: () => Promise<string | null>;
  getCachedAsset: (remoteUrl: string, assetType: string, assetId: string | number) => Promise<string>;
  getMetadata: (url: string, metaKey: string) => Promise<unknown>;
  getAssetCacheStats: () => Promise<CacheStats>;
  clearAssetCache: () => Promise<void>;

  // 首次引导
  getIsFirstLaunch: () => Promise<boolean>;
  setFirstLaunchDone: () => Promise<void>;
}

interface Window {
  electronAPI: ElectronAPI;
}
