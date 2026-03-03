/**
 * 战绩相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { cacheStore } from '../cache/store';
import { logger } from '../utils/logger';
import type { MatchListParams } from '@lol-assistant/shared';

export function registerMatchIpcHandlers(): void {
  // 获取战绩列表
  ipcMain.handle('match:getList', async (_event, params: MatchListParams) => {
    try {
      const cacheKey = `list_${params.begIndex ?? 0}_${params.endIndex ?? 20}`;
      const cached = cacheStore.get('matchList', cacheKey);
      if (cached) return cached;

      const matchList = await lcuAPI.getMatchList(params);
      cacheStore.set('matchList', cacheKey, matchList);
      return matchList;
    } catch (err) {
      logger.error('IPC match:getList 失败:', err);
      throw err;
    }
  });

  // 获取战绩详情
  ipcMain.handle('match:getDetail', async (_event, gameId: number) => {
    try {
      const cacheKey = String(gameId);
      const cached = cacheStore.get('matchDetail', cacheKey);
      if (cached) return cached;

      const detail = await lcuAPI.getMatchDetail(gameId);
      cacheStore.set('matchDetail', cacheKey, detail);
      return detail;
    } catch (err) {
      logger.error(`IPC match:getDetail 失败 (gameId=${gameId}):`, err);
      throw err;
    }
  });
}
