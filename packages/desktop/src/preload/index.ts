/**
 * Preload 脚本
 *
 * 通过 contextBridge 安全暴露 IPC API 给渲染进程
 * 所有事件监听器均返回 unsubscribe 函数，防止内存泄漏
 */
import { contextBridge, ipcRenderer } from 'electron';

/**
 * 创建安全的事件监听器，返回 unsubscribe 函数
 * 使用具体的 listener 引用确保精确移除，而非 removeAllListeners
 */
function createEventListener<T>(
  channel: string,
  callback: (data: T) => void,
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, data: T): void => {
    callback(data);
  };
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── LCU 连接 ──────────────────────────────────────────
  lcuConnect: () => ipcRenderer.invoke('lcu:connect'),
  lcuDisconnect: () => ipcRenderer.invoke('lcu:disconnect'),
  lcuGetStatus: () => ipcRenderer.invoke('lcu:status'),

  // ─── 召唤师 ────────────────────────────────────────────
  getCurrentSummoner: () => ipcRenderer.invoke('summoner:getCurrent'),
  getSummonerById: (puuid: string) => ipcRenderer.invoke('summoner:getById', puuid),

  // ─── 战绩 ──────────────────────────────────────────────
  getMatchList: (params: object) => ipcRenderer.invoke('match:getList', params),
  getMatchDetail: (gameId: number) => ipcRenderer.invoke('match:getDetail', gameId),

  // ─── 排位 ──────────────────────────────────────────────
  getRankStats: (puuid: string) => ipcRenderer.invoke('rank:getStats', puuid),

  // ─── 缓存 ──────────────────────────────────────────────
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  getCacheStats: () => ipcRenderer.invoke('cache:getStats'),

  // ─── WebSocket 事件监听 ─────────────────────────────────
  lcuSubscribe: (uri: string) => ipcRenderer.send('lcu:subscribe', uri),
  lcuUnsubscribe: (uri: string) => ipcRenderer.send('lcu:unsubscribe', uri),
  onLCUEvent: (callback: (event: unknown) => void) => {
    return createEventListener('lcu:event', callback);
  },

  // ─── 连接状态变化 ──────────────────────────────────────
  onConnectionChange: (callback: (status: string) => void) => {
    return createEventListener('lcu:connection-change', callback);
  },

  // ─── 对局实时分析 ──────────────────────────────────────
  analyzeLiveGame: () => ipcRenderer.invoke('live-game:analyze'),

  // ─── 第三方数据 ────────────────────────────────────────
  getChampionBuilds: (championId: number) =>
    ipcRenderer.invoke('scraper:getChampionBuilds', championId),
  getChampionCounters: (championId: number) =>
    ipcRenderer.invoke('scraper:getChampionCounters', championId),
  updateScraperData: () => ipcRenderer.invoke('scraper:updateData'),
  getScraperDataVersion: () => ipcRenderer.invoke('scraper:getDataVersion'),

  // ─── 符文页管理 ────────────────────────────────────────
  getPerksPages: () => ipcRenderer.invoke('perks:getPages'),
  applyPerksPage: (pageData: {
    name: string;
    primaryStyleId: number;
    subStyleId: number;
    selectedPerkIds: number[];
  }) => ipcRenderer.invoke('perks:apply', pageData),
  deletePerksPage: (pageId: number) => ipcRenderer.invoke('perks:delete', pageId),

  // ─── 窗口管理 ──────────────────────────────────────────
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.send('window:setAlwaysOnTop', flag),
  setMiniMode: (flag: boolean) => ipcRenderer.send('window:setMiniMode', flag),
  minimizeToTray: () => ipcRenderer.send('window:minimize-to-tray'),

  // ─── 自动更新 ──────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.send('updater:downloadUpdate'),
  installUpdate: () => ipcRenderer.send('updater:installUpdate'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:getStatus'),
  onUpdateProgress: (callback: (progress: number) => void) => {
    return createEventListener('updater:progress', callback);
  },
  onUpdateStatusChange: (callback: (status: string) => void) => {
    return createEventListener('updater:status-change', callback);
  },
  onUpdateAvailable: (callback: (info: unknown) => void) => {
    return createEventListener('updater:update-available', callback);
  },

  // ─── 日志 ──────────────────────────────────────────────
  exportLog: () => ipcRenderer.invoke('log:export'),

  // ─── 通知事件（主进程 -> 渲染进程） ─────────────────────
  onGamePhaseChange: (callback: (phase: string) => void) => {
    return createEventListener('game:phase-change', callback);
  },
  onMatchEnded: (callback: () => void) => {
    return createEventListener('game:match-ended', callback);
  },

  // ─── 静态资源 ──────────────────────────────────────────
  getGameVersion: () => ipcRenderer.invoke('assets:getVersion'),
  getMajorVersion: () => ipcRenderer.invoke('assets:getMajorVersion'),
  getCachedAsset: (remoteUrl: string, assetType: string, assetId: string | number) =>
    ipcRenderer.invoke('assets:getCachedAsset', remoteUrl, assetType, assetId),
  getMetadata: (url: string, metaKey: string) =>
    ipcRenderer.invoke('assets:getMetadata', url, metaKey),
  getAssetCacheStats: () => ipcRenderer.invoke('assets:getCacheStats'),
  clearAssetCache: () => ipcRenderer.invoke('assets:clearCache'),

  // ─── 首次引导 ──────────────────────────────────────────
  getIsFirstLaunch: () => ipcRenderer.invoke('app:isFirstLaunch'),
  setFirstLaunchDone: () => ipcRenderer.invoke('app:setFirstLaunchDone'),

  // ─── LOL 路径管理 ──────────────────────────────────────
  detectLolPath: () => ipcRenderer.invoke('app:detectLolPath'),
  selectLolPath: () => ipcRenderer.invoke('app:selectLolPath'),
  validateLolPath: (lolPath: string) => ipcRenderer.invoke('app:validateLolPath', lolPath),
  saveLolPath: (lolPath: string) => ipcRenderer.invoke('app:saveLolPath', lolPath),
  getSavedLolPath: () => ipcRenderer.invoke('app:getSavedLolPath'),

  // ─── 局域网代理 ────────────────────────────────────────
  startProxy: () => ipcRenderer.invoke('proxy:start'),
  stopProxy: () => ipcRenderer.invoke('proxy:stop'),
  getProxyStatus: () => ipcRenderer.invoke('proxy:status'),
});
