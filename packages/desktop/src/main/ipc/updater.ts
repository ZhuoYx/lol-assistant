/**
 * 自动更新 IPC 处理器
 *
 * 注意：electron-updater 的完整实现在 Task 10 中完成
 * 此处提供 IPC 通道注册，实际更新逻辑为占位实现
 */
import { ipcMain } from 'electron';
import { logger } from '../utils/logger';

export function registerUpdaterIpcHandlers(): void {
  // 检查更新
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      // TODO: Task 10 中实现 electron-updater 集成
      logger.info('检查更新（尚未实现）');
      return null;
    } catch (err) {
      // 更新检查失败时静默跳过
      logger.warn('检查更新失败（静默跳过）:', err);
      return null;
    }
  });

  // 下载更新
  ipcMain.on('updater:downloadUpdate', () => {
    // TODO: Task 10 中实现
    logger.info('下载更新（尚未实现）');
  });

  // 安装更新
  ipcMain.on('updater:installUpdate', () => {
    // TODO: Task 10 中实现
    logger.info('安装更新（尚未实现）');
  });
}
