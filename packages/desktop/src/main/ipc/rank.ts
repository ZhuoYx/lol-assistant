/**
 * 排位相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { cacheStore } from '../cache/store';
import { logger } from '../utils/logger';

export function registerRankIpcHandlers(): void {
  // 获取排位信息
  ipcMain.handle('rank:getStats', async (_event, puuid: string) => {
    try {
      const cached = cacheStore.get('rankStats', puuid);
      if (cached) return cached;

      const rankStats = await lcuAPI.getRankStats(puuid);
      cacheStore.set('rankStats', puuid, rankStats);
      return rankStats;
    } catch (err) {
      logger.error(`IPC rank:getStats 失败 (puuid=${puuid}):`, err);
      throw err;
    }
  });
}
