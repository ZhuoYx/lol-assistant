/**
 * 客户端设置 IPC 处理器
 * 自动接受对局、藏品背景皮肤、在线状态与个性签名
 */
import { ipcMain } from 'electron';
import type { ChatAvailability } from '@lol-assistant/shared';
import { cacheStore } from '../cache/store';
import { lcuAPI } from '../lcu/api';
import { logger } from '../utils/logger';

function normalizeAutoAcceptDelay(delay: unknown): number {
  return typeof delay === 'number' && Number.isFinite(delay)
    ? Math.max(0, Math.min(10, Math.round(delay)))
    : 0;
}

export function getAutoAcceptSettings(): { enabled: boolean; delay: number } {
  const saved = cacheStore.getSetting<{ enabled?: unknown; delay?: unknown }>('autoAccept');
  return { enabled: saved?.enabled === true, delay: normalizeAutoAcceptDelay(saved?.delay) };
}

function isChatAvailability(value: unknown): value is ChatAvailability {
  return value === 'chat' || value === 'away' || value === 'offline';
}

async function readChatAvailability(): Promise<ChatAvailability | null> {
  const me = await lcuAPI.getChatMe();
  const availability = me?.availability === 'online' ? 'chat' : me?.availability;
  return isChatAvailability(availability) ? availability : null;
}

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
      const me = await lcuAPI.getChatMe();
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

  ipcMain.handle('client:getChatAvailability', readChatAvailability);
  ipcMain.handle('client:setChatAvailability', async (_event, availability: unknown) => {
    if (!isChatAvailability(availability)) throw new Error('无效的在线状态');
    await lcuAPI.setChatAvailability(availability);
    return readChatAvailability();
  });

  ipcMain.handle('client:setAutoAccept', (_event, enabled: unknown, delay: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('无效的自动接受设置');
    const settings = { enabled, delay: normalizeAutoAcceptDelay(delay) };
    cacheStore.setSetting('autoAccept', settings);
    logger.info(`自动接受对局: ${enabled ? '开启' : '关闭'}，延迟 ${settings.delay} 秒`);
    return { success: true };
  });

  ipcMain.handle('client:getAutoAccept', getAutoAcceptSettings);

  // ─── 选人阶段 session 获取 ────────────────────────────

  ipcMain.handle('client:getChampSelectSession', async () => {
    try {
      return await lcuAPI.getChampSelectSession();
    } catch {
      return null;
    }
  });

  // ─── ARAM 板凳英雄交换 ────────────────────────────────

  ipcMain.handle('client:benchSwap', async (_event, championId: number) => {
    try {
      await lcuAPI.benchSwap(championId);
      logger.info(`板凳英雄交换成功: championId=${championId}`);
      return { success: true };
    } catch (err) {
      logger.error(`板凳英雄交换失败 (championId=${championId}):`, err);
      throw err;
    }
  });
}
