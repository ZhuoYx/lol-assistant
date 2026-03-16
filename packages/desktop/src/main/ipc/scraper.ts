/**
 * 第三方数据爬取 IPC 处理器
 */
import { ipcMain } from 'electron';
import { ScraperManager } from '../scraper/index';
import { logger } from '../utils/logger';

/** 爬取器全局单例 */
const scraperManager = new ScraperManager();

export function registerScraperIpcHandlers(): void {
  // 获取英雄构建数据
  ipcMain.handle('scraper:getChampionBuilds', async (_event, championId: number, role?: string) => {
    try {
      return await scraperManager.getChampionBuilds(championId, role);
    } catch (err) {
      logger.error(`IPC scraper:getChampionBuilds 失败 (championId=${championId}, role=${role}):`, err);
      throw err;
    }
  });

  // 刷新英雄构建数据（清除缓存后重新获取）
  ipcMain.handle('scraper:refreshChampionBuilds', async (_event, championId: number) => {
    try {
      await scraperManager.clearChampionCache(championId);
      logger.info(`已清除英雄 ${championId} 的缓存`);
    } catch (err) {
      logger.error(`IPC scraper:refreshChampionBuilds 失败 (championId=${championId}):`, err);
      throw err;
    }
  });

  // 获取英雄克制关系
  ipcMain.handle('scraper:getChampionCounters', async (_event, championId: number) => {
    try {
      return await scraperManager.getChampionCounters(championId);
    } catch (err) {
      logger.error(`IPC scraper:getChampionCounters 失败 (championId=${championId}):`, err);
      throw err;
    }
  });

  // 手动触发数据更新
  ipcMain.handle('scraper:updateData', async () => {
    try {
      // 触发全量更新（使用空的 championIds 数组表示全量）
      await scraperManager.triggerUpdate('', [], true);
    } catch (err) {
      logger.error('IPC scraper:updateData 失败:', err);
      throw err;
    }
  });

  // 获取数据版本信息
  ipcMain.handle('scraper:getDataVersion', async () => {
    try {
      return await scraperManager.getDataVersion();
    } catch (err) {
      logger.error('IPC scraper:getDataVersion 失败:', err);
      throw err;
    }
  });

  // 获取英雄排名列表
  ipcMain.handle('scraper:getChampionRankings', async (_event, position?: string, tier?: string) => {
    try {
      return await scraperManager.getChampionRankings(position, tier);
    } catch (err) {
      logger.error(`IPC scraper:getChampionRankings 失败 (position=${position}, tier=${tier}):`, err);
      throw err;
    }
  });

  // 获取 ARAM Tier 列表（大乱斗/海克斯大乱斗英雄强度排名）
  ipcMain.handle('scraper:getAramTierList', async () => {
    try {
      return await scraperManager.getAramTierList();
    } catch (err) {
      logger.error('IPC scraper:getAramTierList 失败:', err);
      throw err;
    }
  });
}

/** 获取爬取器管理器（供其他模块使用） */
export function getScraperManager(): ScraperManager {
  return scraperManager;
}
