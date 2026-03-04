/**
 * 召唤师相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { cacheStore } from '../cache/store';
import { logger } from '../utils/logger';

export function registerSummonerIpcHandlers(): void {
  // 获取当前召唤师
  ipcMain.handle('summoner:getCurrent', async () => {
    try {
      // 尝试缓存
      const cached = cacheStore.get('summoner', 'current');
      if (cached) return cached;

      const summoner = await lcuAPI.getCurrentSummoner();
      cacheStore.set('summoner', 'current', summoner);
      return summoner;
    } catch (err) {
      logger.error('IPC summoner:getCurrent 失败:', err);
      throw err;
    }
  });

  // 通过 PUUID 获取召唤师
  ipcMain.handle('summoner:getById', async (_event, puuid: string) => {
    try {
      const cached = cacheStore.get('summoner', puuid);
      if (cached) return cached;

      const summoner = await lcuAPI.getSummonerByPUUID(puuid);
      cacheStore.set('summoner', puuid, summoner);
      return summoner;
    } catch (err) {
      logger.error(`IPC summoner:getById 失败 (puuid=${puuid}):`, err);
      throw err;
    }
  });

  // 通过名称搜索召唤师（支持 "名称#标签" 格式）
  ipcMain.handle('summoner:search', async (_event, query: string) => {
    try {
      // 解析 "名称#标签" 格式
      const parts = query.split('#');
      const gameName = parts[0].trim();
      if (!gameName) throw new Error('搜索名称不能为空');

      const summoner = await lcuAPI.getSummonerByName(gameName);
      if (summoner) {
        cacheStore.set('summoner', summoner.puuid, summoner);
      }
      return summoner;
    } catch (err) {
      logger.error(`IPC summoner:search 失败 (query=${query}):`, err);
      throw err;
    }
  });
}
