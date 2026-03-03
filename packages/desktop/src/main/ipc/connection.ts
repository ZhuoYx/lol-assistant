/**
 * LCU 连接相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lcuClient } from '../lcu/client';
import { logger } from '../utils/logger';

export function registerConnectionIpcHandlers(): void {
  // 连接 LCU 客户端
  ipcMain.handle('lcu:connect', async () => {
    try {
      await lcuClient.connect();
    } catch (err) {
      logger.error('IPC lcu:connect 失败:', err);
      throw err;
    }
  });

  // 断开连接
  ipcMain.handle('lcu:disconnect', async () => {
    lcuClient.disconnect();
  });

  // 获取连接状态
  ipcMain.handle('lcu:status', async () => {
    return lcuClient.status;
  });
}
