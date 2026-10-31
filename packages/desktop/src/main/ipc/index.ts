/**
 * IPC 处理器注册模块
 * 统一注册所有 IPC 通道处理器 + WebSocket 事件转发
 */
import { ipcMain } from 'electron';
import { lcuWebSocket } from '../lcu/websocket';
import { logger } from '../utils/logger';
import { registerAssetIpcHandlers } from './assets';
import { registerConnectionIpcHandlers } from './connection';
import { registerSummonerIpcHandlers } from './summoner';
import { registerMatchIpcHandlers } from './match';
import { registerRankIpcHandlers } from './rank';
import { registerCacheIpcHandlers } from './cache';
import { registerLiveGameIpcHandlers } from './live-game';
import { registerScraperIpcHandlers } from './scraper';
import { registerWindowIpcHandlers } from './window';
import { registerUpdaterIpcHandlers } from './updater';
import { registerLogIpcHandlers } from './log';
import { registerAppIpcHandlers } from './app';
import { registerPerksIpcHandlers } from './perks';
import { registerProxyIpcHandlers } from './proxy';
import { registerChampionIpcHandlers } from './champion';
import { registerClientSettingsIpcHandlers } from './client-settings';
import { registerAramMayhemIpcHandlers } from './aram-mayhem';

/**
 * 注册所有 IPC 处理器
 */
export function registerAllIpcHandlers(): void {
  // 静态资源
  registerAssetIpcHandlers();

  // LCU 连接
  registerConnectionIpcHandlers();

  // 召唤师
  registerSummonerIpcHandlers();

  // 战绩
  registerMatchIpcHandlers();

  // 排位
  registerRankIpcHandlers();

  // 缓存
  registerCacheIpcHandlers();

  // 对局实时分析
  registerLiveGameIpcHandlers();

  // 第三方数据爬取
  registerScraperIpcHandlers();
  registerAramMayhemIpcHandlers();

  // 窗口管理
  registerWindowIpcHandlers();

  // 自动更新
  registerUpdaterIpcHandlers();

  // 日志
  registerLogIpcHandlers();

  // 应用（首次引导等）
  registerAppIpcHandlers();

  // 符文页管理
  registerPerksIpcHandlers();

  // 局域网代理
  registerProxyIpcHandlers();

  // 英雄统计
  registerChampionIpcHandlers();

  // 客户端设置（自动接受、藏品背景、个性签名）
  registerClientSettingsIpcHandlers();

  // WebSocket 事件转发
  registerWebSocketForwarding();

  logger.info('所有 IPC 处理器注册完成');
}

/**
 * 注册 WebSocket 事件转发 IPC 通道
 *
 * 渲染进程通过 lcu:subscribe / lcu:unsubscribe 控制订阅
 * 主进程通过 webContents.send('lcu:event', ...) 推送事件（已在 index.ts 中实现）
 */
function registerWebSocketForwarding(): void {
  // 渲染进程请求订阅 LCU 事件
  ipcMain.on('lcu:subscribe', (_event, uri: string) => {
    if (!uri || typeof uri !== 'string') return;

    logger.info(`渲染进程请求订阅 LCU 事件: ${uri}`);
    lcuWebSocket.subscribe(uri, () => {
      // handler 不需要在此处理，事件已通过 lcuWebSocket.on('event') 统一转发
    });
  });

  // 渲染进程请求取消订阅 LCU 事件
  ipcMain.on('lcu:unsubscribe', (_event, uri: string) => {
    if (!uri || typeof uri !== 'string') return;

    logger.info(`渲染进程请求取消订阅 LCU 事件: ${uri}`);
    lcuWebSocket.unsubscribe(uri);
  });
}
