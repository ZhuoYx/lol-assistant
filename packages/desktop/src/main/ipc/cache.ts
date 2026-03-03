/**
 * 缓存管理 IPC 处理器
 */
import { ipcMain } from 'electron';
import { cacheStore } from '../cache/store';
import { logger } from '../utils/logger';

export function registerCacheIpcHandlers(): void {
  // 清空缓存
  ipcMain.handle('cache:clear', async () => {
    try {
      cacheStore.clearAll();
    } catch (err) {
      logger.error('IPC cache:clear 失败:', err);
      throw err;
    }
  });

  // 获取缓存统计
  ipcMain.handle('cache:getStats', async () => {
    try {
      return cacheStore.getStats();
    } catch (err) {
      logger.error('IPC cache:getStats 失败:', err);
      throw err;
    }
  });
}
