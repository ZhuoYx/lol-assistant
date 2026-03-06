/**
 * 客户端设置 IPC 处理器
 * 自动接受对局、藏品背景皮肤、个性签名
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { logger } from '../utils/logger';

export function registerClientSettingsIpcHandlers(): void {
  // ─── 自动接受对局 ──────────────────────────────────────

  ipcMain.handle('client:acceptMatch', async () => {
    try {
      await lcuAPI.acceptMatch();
      return { success: true };
    } catch (err) {
      logger.error('接受对局失败:', err);
      throw err;
    }
  });

  // ─── 藏品背景皮肤 ──────────────────────────────────────

  ipcMain.handle('client:getBackdrop', async (_event, summonerId: number) => {
    try {
      return await lcuAPI.getCollectionsBackdrop(summonerId);
    } catch (err) {
      logger.error('获取藏品背景失败:', err);
      throw err;
    }
  });

  ipcMain.handle(
    'client:setBackdrop',
    async (_event, summonerId: number, championId: number, skinId: number) => {
      try {
        await lcuAPI.setCollectionsBackdrop(summonerId, { championId, skinId });
        return { success: true };
      } catch (err) {
        logger.error('设置藏品背景失败:', err);
        throw err;
      }
    },
  );

  // ─── 个性签名 ──────────────────────────────────────────

  ipcMain.handle('client:getStatusMessage', async () => {
    try {
      const me = (await lcuAPI.getChatMe()) as { statusMessage?: string };
      return me?.statusMessage ?? '';
    } catch (err) {
      logger.error('获取个性签名失败:', err);
      throw err;
    }
  });

  ipcMain.handle('client:setStatusMessage', async (_event, message: string) => {
    try {
      await lcuAPI.setStatusMessage(message);
      return { success: true };
    } catch (err) {
      logger.error('设置个性签名失败:', err);
      throw err;
    }
  });

  // ─── 自动接受控制（由主进程管理定时器） ─────────────────

  let autoAcceptEnabled = false;
  let autoAcceptDelay = 0; // 秒

  ipcMain.handle('client:setAutoAccept', async (_event, enabled: boolean, delay: number) => {
    autoAcceptEnabled = enabled;
    autoAcceptDelay = delay;
    logger.info(`自动接受对局: ${enabled ? '开启' : '关闭'}，延迟 ${delay} 秒`);
    return { success: true };
  });

  ipcMain.handle('client:getAutoAccept', async () => {
    return { enabled: autoAcceptEnabled, delay: autoAcceptDelay };
  });

  // 暴露状态检查供 WebSocket 事件使用
  registerAutoAcceptState(() => autoAcceptEnabled, () => autoAcceptDelay);
}

// 自动接受状态回调
let _getAutoAcceptEnabled: () => boolean = () => false;
let _getAutoAcceptDelay: () => number = () => 0;

function registerAutoAcceptState(
  getEnabled: () => boolean,
  getDelay: () => number,
): void {
  _getAutoAcceptEnabled = getEnabled;
  _getAutoAcceptDelay = getDelay;
}

export function isAutoAcceptEnabled(): boolean {
  return _getAutoAcceptEnabled();
}

export function getAutoAcceptDelay(): number {
  return _getAutoAcceptDelay();
}
