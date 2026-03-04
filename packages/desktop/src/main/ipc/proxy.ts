/**
 * 局域网代理相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lanProxyServer } from '../proxy/server';
import { logger } from '../utils/logger';

export function registerProxyIpcHandlers(): void {
  // 启动代理服务器
  ipcMain.handle('proxy:start', async () => {
    try {
      const status = await lanProxyServer.start();
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('启动代理服务器失败:', message);
      throw err;
    }
  });

  // 停止代理服务器
  ipcMain.handle('proxy:stop', async () => {
    await lanProxyServer.stop();
  });

  // 获取代理服务器状态
  ipcMain.handle('proxy:status', async () => {
    return lanProxyServer.getStatus();
  });
}
