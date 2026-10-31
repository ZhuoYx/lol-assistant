/**
 * 召唤师相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { cacheStore } from '../cache/store';
import { logger } from '../utils/logger';
import { lcuClient } from '../lcu/client';

export function registerSummonerIpcHandlers(): void {
  ipcMain.handle('summoner:getIcon', async (_event, iconId: number) => {
    if (!Number.isSafeInteger(iconId) || iconId < 0 || iconId > 1000000) {
      throw new Error('无效的召唤师头像编号');
    }
    try {
      const image = await lcuClient.request<Buffer>(
        `/lol-game-data/assets/v1/profile-icons/${iconId}.jpg`,
        { responseType: 'buffer' },
      );
      if (image.length > 0 && image[0] === 0xff && image[1] === 0xd8) {
        return `data:image/jpeg;base64,${image.toString('base64')}`;
      }
      if (image.length > 4 && image.subarray(0, 4).equals(Buffer.from([137, 80, 78, 71]))) {
        return `data:image/png;base64,${image.toString('base64')}`;
      }
    } catch {
      // Offline/CDN fallback never exposes the local client's credentials.
    }
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
  });
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
      const trimmed = query.trim();
      if (!trimmed) throw new Error('搜索名称不能为空');

      // LCU 接口接受完整的 "名字" 或 "名字#编号" 格式
      const summoner = await lcuAPI.getSummonerByName(trimmed);
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
