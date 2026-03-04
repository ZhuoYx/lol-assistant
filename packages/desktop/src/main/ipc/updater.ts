/**
 * 自动更新 IPC 处理器
 *
 * 通过 appUpdater 封装 electron-updater，提供检查/下载/安装更新的 IPC 通道
 * 将更新进度和状态变化转发到渲染进程
 */
import { ipcMain } from 'electron';
import { appUpdater } from '../updater/index';
import { getMainWindow } from '../index';
import { logger } from '../utils/logger';

export function registerUpdaterIpcHandlers(): void {
  // 检查更新
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      return await appUpdater.checkForUpdates();
    } catch (err) {
      logger.warn('检查更新失败（静默跳过）:', err);
      return null;
    }
  });

  // 下载更新
  ipcMain.on('updater:downloadUpdate', () => {
    appUpdater.downloadUpdate();
  });

  // 安装更新
  ipcMain.on('updater:installUpdate', () => {
    appUpdater.installUpdate();
  });

  // 获取更新状态
  ipcMain.handle('updater:getStatus', () => {
    return appUpdater.getStatus();
  });

  // 初始化 updater 并注册事件转发
  appUpdater.init({
    onStatusChange: (status) => {
      const win = getMainWindow();
      win?.webContents.send('updater:status-change', status);
    },
    onProgress: (percent) => {
      const win = getMainWindow();
      win?.webContents.send('updater:progress', percent);
    },
    onUpdateInfo: (info) => {
      const win = getMainWindow();
      win?.webContents.send('updater:update-available', info);
    },
    onError: (error) => {
      const win = getMainWindow();
      win?.webContents.send('updater:error', error);
    },
  });
}
