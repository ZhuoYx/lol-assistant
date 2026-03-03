/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ElectronAPI {
  lcuConnect: () => Promise<void>;
  lcuDisconnect: () => Promise<void>;
  lcuGetStatus: () => Promise<string>;
  getCurrentSummoner: () => Promise<unknown>;
  getSummonerById: (puuid: string) => Promise<unknown>;
  getMatchList: (params: object) => Promise<unknown>;
  getMatchDetail: (gameId: number) => Promise<unknown>;
  getRankStats: (puuid: string) => Promise<unknown>;
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<unknown>;
  lcuSubscribe: (uri: string) => void;
  lcuUnsubscribe: (uri: string) => void;
  onLCUEvent: (callback: (event: unknown) => void) => () => void;
  onConnectionChange: (callback: (status: string) => void) => () => void;
  analyzeLiveGame: () => Promise<unknown>;
  getChampionBuilds: (championId: number) => Promise<unknown>;
  getChampionCounters: (championId: number) => Promise<unknown>;
  updateScraperData: () => Promise<void>;
  getScraperDataVersion: () => Promise<unknown>;
  setAlwaysOnTop: (flag: boolean) => void;
  setMiniMode: (flag: boolean) => void;
  minimizeToTray: () => void;
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => void;
  installUpdate: () => void;
  onUpdateProgress: (callback: (progress: number) => void) => () => void;
  exportLog: () => Promise<string>;
  onGamePhaseChange: (callback: (phase: string) => void) => () => void;
  getIsFirstLaunch: () => Promise<boolean>;
  setFirstLaunchDone: () => Promise<void>;
}

interface Window {
  electronAPI: ElectronAPI;
}
