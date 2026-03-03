/**
 * 静态资源 IPC 处理器
 *
 * 处理渲染进程对静态资源的请求：
 * - 获取当前游戏版本
 * - 获取缓存的资源路径
 * - 获取缓存的元数据 JSON
 * - 缓存统计和清理
 */

import { ipcMain } from 'electron';
import { assetCacheManager } from '../assets/index';

export function registerAssetIpcHandlers(): void {
  // 获取当前游戏版本
  ipcMain.handle('assets:getVersion', async () => {
    return assetCacheManager.getCurrentVersion();
  });

  // 获取主版本号
  ipcMain.handle('assets:getMajorVersion', async () => {
    return assetCacheManager.getMajorVersion();
  });

  // 获取缓存的资源文件路径（本地 file:// URL 或远程 URL）
  ipcMain.handle(
    'assets:getCachedAsset',
    async (_event, remoteUrl: string, assetType: string, assetId: string | number) => {
      return assetCacheManager.getAssetFileUrl(remoteUrl, assetType, assetId);
    }
  );

  // 获取缓存的元数据 JSON
  ipcMain.handle(
    'assets:getMetadata',
    async (_event, url: string, metaKey: string) => {
      return assetCacheManager.getCachedMetadata(url, metaKey);
    }
  );

  // 获取资源缓存统计
  ipcMain.handle('assets:getCacheStats', async () => {
    return assetCacheManager.getCacheStats();
  });

  // 清除资源缓存
  ipcMain.handle('assets:clearCache', async () => {
    await assetCacheManager.clearCache();
  });
}
