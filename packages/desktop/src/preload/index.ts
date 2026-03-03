import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API（占位，Task 4 中完整实现）
contextBridge.exposeInMainWorld('electronAPI', {
  // LCU 连接
  lcuConnect: () => ipcRenderer.invoke('lcu:connect'),
  lcuDisconnect: () => ipcRenderer.invoke('lcu:disconnect'),
  lcuGetStatus: () => ipcRenderer.invoke('lcu:status'),

  // 召唤师
  getCurrentSummoner: () => ipcRenderer.invoke('summoner:getCurrent'),
  getSummonerById: (puuid: string) => ipcRenderer.invoke('summoner:getById', puuid),

  // 战绩
  getMatchList: (params: object) => ipcRenderer.invoke('match:getList', params),
  getMatchDetail: (gameId: number) => ipcRenderer.invoke('match:getDetail', gameId),

  // 排位
  getRankStats: (puuid: string) => ipcRenderer.invoke('rank:getStats', puuid),

  // 缓存
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  getCacheStats: () => ipcRenderer.invoke('cache:getStats'),

  // WebSocket 事件监听
  lcuSubscribe: (uri: string) => ipcRenderer.send('lcu:subscribe', uri),
  lcuUnsubscribe: (uri: string) => ipcRenderer.send('lcu:unsubscribe', uri),
  onLCUEvent: (callback: (event: unknown) => void) => {
    ipcRenderer.on('lcu:event', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('lcu:event');
  },

  // 通用事件监听
  onConnectionChange: (callback: (status: string) => void) => {
    ipcRenderer.on('lcu:connection-change', (_event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners('lcu:connection-change');
  },

  // 对局实时分析
  analyzeLiveGame: () => ipcRenderer.invoke('live-game:analyze'),

  // 第三方数据
  getChampionBuilds: (championId: number) =>
    ipcRenderer.invoke('scraper:getChampionBuilds', championId),
  getChampionCounters: (championId: number) =>
    ipcRenderer.invoke('scraper:getChampionCounters', championId),
  updateScraperData: () => ipcRenderer.invoke('scraper:updateData'),
  getScraperDataVersion: () => ipcRenderer.invoke('scraper:getDataVersion'),

  // 窗口管理
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.send('window:setAlwaysOnTop', flag),
  setMiniMode: (flag: boolean) => ipcRenderer.send('window:setMiniMode', flag),
  minimizeToTray: () => ipcRenderer.send('window:minimize-to-tray'),

  // 自动更新
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.send('updater:downloadUpdate'),
  installUpdate: () => ipcRenderer.send('updater:installUpdate'),
  onUpdateProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('updater:progress', (_event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('updater:progress');
  },

  // 日志
  exportLog: () => ipcRenderer.invoke('log:export'),

  // 通知事件
  onGamePhaseChange: (callback: (phase: string) => void) => {
    ipcRenderer.on('game:phase-change', (_event, phase) => callback(phase));
    return () => ipcRenderer.removeAllListeners('game:phase-change');
  },

  // 静态资源
  getGameVersion: () => ipcRenderer.invoke('assets:getVersion'),
  getMajorVersion: () => ipcRenderer.invoke('assets:getMajorVersion'),
  getCachedAsset: (remoteUrl: string, assetType: string, assetId: string | number) =>
    ipcRenderer.invoke('assets:getCachedAsset', remoteUrl, assetType, assetId),
  getMetadata: (url: string, metaKey: string) =>
    ipcRenderer.invoke('assets:getMetadata', url, metaKey),
  getAssetCacheStats: () => ipcRenderer.invoke('assets:getCacheStats'),
  clearAssetCache: () => ipcRenderer.invoke('assets:clearCache'),

  // 首次引导
  getIsFirstLaunch: () => ipcRenderer.invoke('app:isFirstLaunch'),
  setFirstLaunchDone: () => ipcRenderer.invoke('app:setFirstLaunchDone'),
});
