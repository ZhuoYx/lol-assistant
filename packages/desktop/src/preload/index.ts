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
function createEventListener<T>(channel: string, callback: (data: T) => void): () => void {
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
  searchSummoner: (query: string) => ipcRenderer.invoke('summoner:search', query),

  // ─── 战绩 ──────────────────────────────────────────────
  getMatchList: (params: object) => ipcRenderer.invoke('match:getList', params),
  getMatchDetail: (gameId: number) => ipcRenderer.invoke('match:getDetail', gameId),
  getSummonerIcon: (iconId: number) => ipcRenderer.invoke('summoner:getIcon', iconId),

  // ─── 排位 ──────────────────────────────────────────────
  getRankStats: (puuid: string) => ipcRenderer.invoke('rank:getStats', puuid),

  // ─── 英雄统计 ────────────────────────────────────────────
  getChampionStats: (puuid: string) => ipcRenderer.invoke('champion:getStats', puuid),

  // ─── 缓存 ──────────────────────────────────────────────
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  getCacheStats: () => ipcRenderer.invoke('cache:getStats'),

  // ─── WebSocket 事件监听 ─────────────────────────────────
  lcuSubscribe: (uri: string) => ipcRenderer.send('lcu:subscribe', uri),
  getGameflowState: () => ipcRenderer.invoke('lcu:getGameflowState'),
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
  getMayhemRecommendations: (championId: number, refresh = false) =>
    ipcRenderer.invoke('aram:getChampionRecommendations', championId, refresh),
  openMayhemSource: (url: string) => ipcRenderer.invoke('aram:openSource', url),
  getChampionDataSource: () => ipcRenderer.invoke('scraper:getSource'),
  setChampionDataSource: (source: 'opgg' | 'qq101') =>
    ipcRenderer.invoke('scraper:setSource', source),
  getChampionBuilds: (championId: number, role?: string) =>
    ipcRenderer.invoke('scraper:getChampionBuilds', championId, role),
  refreshChampionBuilds: (championId: number) =>
    ipcRenderer.invoke('scraper:refreshChampionBuilds', championId),
  getChampionCounters: (championId: number, role?: string) =>
    ipcRenderer.invoke('scraper:getChampionCounters', championId, role),
  updateScraperData: () => ipcRenderer.invoke('scraper:updateData'),
  getScraperDataVersion: () => ipcRenderer.invoke('scraper:getDataVersion'),
  getAramTierList: () => ipcRenderer.invoke('scraper:getAramTierList'),
  getChampionRankings: (position?: string, tier?: string) =>
    ipcRenderer.invoke('scraper:getChampionRankings', position, tier),

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
  minimizeToTray: () => ipcRenderer.send('window:minimize-to-tray'),

  // ─── 自动更新 ──────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('updater:installUpdate'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:getStatus'),
  setAutoUpdate: (enabled: boolean) => ipcRenderer.invoke('updater:setAutoUpdate', enabled),
  onUpdateStateChange: (callback: (state: import('@lol-assistant/shared').UpdateState) => void) => {
    return createEventListener('updater:state-change', callback);
  },

  // ─── 日志导出 ──────────────────────────────────────────
  exportLog: () => ipcRenderer.invoke('log:export'),
  revealExportedLog: () => ipcRenderer.invoke('log:revealExport'),

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

  // ─── 客户端设置 ────────────────────────────────────────
  // 自动接受
  setAutoAccept: (enabled: boolean, delay: number) =>
    ipcRenderer.invoke('client:setAutoAccept', enabled, delay),
  getAutoAccept: () => ipcRenderer.invoke('client:getAutoAccept'),

  // 藏品背景皮肤
  getBackdrop: (summonerId: number) => ipcRenderer.invoke('client:getBackdrop', summonerId),
  setBackdrop: (summonerId: number, championId: number, skinId: number) =>
    ipcRenderer.invoke('client:setBackdrop', summonerId, championId, skinId),

  // 个性签名
  getStatusMessage: () => ipcRenderer.invoke('client:getStatusMessage'),
  setStatusMessage: (message: string) => ipcRenderer.invoke('client:setStatusMessage', message),

  // ARAM 板凳英雄交换
  benchSwap: (championId: number) => ipcRenderer.invoke('client:benchSwap', championId),

  // 选人阶段 session
  getChampSelectSession: () => ipcRenderer.invoke('client:getChampSelectSession'),
});
