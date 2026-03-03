/** 连接状态 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

/** 缓存统计 */
export interface CacheStats {
  totalSize: number;
  entryCount: number;
}

/** 缓存条目 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/** 更新信息 */
export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

/** 游戏流程阶段 */
export type GamePhase =
  | 'None'
  | 'Lobby'
  | 'Matchmaking'
  | 'ReadyCheck'
  | 'ChampSelect'
  | 'GameStart'
  | 'InProgress'
  | 'WaitingForStats'
  | 'EndOfGame'
  | 'Reconnect';

/** LCU 事件 */
export interface LCUEvent {
  uri: string;
  eventType: 'Create' | 'Update' | 'Delete';
  data: unknown;
}

/** 应用设置 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  cacheEnabled: boolean;
  lanProxyEnabled: boolean;
  alwaysOnTop: boolean;
  miniMode: boolean;
  autoUpdate: boolean;
}
