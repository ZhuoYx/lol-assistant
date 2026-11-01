/**
 * 自动更新 IPC 处理器
 *
 * 通过 appUpdater 封装 electron-updater，提供检查/下载/安装更新的 IPC 通道
 * 将更新进度和状态变化转发到渲染进程
 */
import { ipcMain } from 'electron';
import { appUpdater } from '../updater/index';
import { getMainWindow } from '../index';

export function registerUpdaterIpcHandlers(): void {
  appUpdater.init((state) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send('updater:state-change', state);
  });
  ipcMain.handle('updater:checkForUpdates', () => appUpdater.checkForUpdates());
  ipcMain.handle('updater:downloadUpdate', () => appUpdater.downloadUpdate());
  ipcMain.handle('updater:installUpdate', () => appUpdater.installUpdate());
  ipcMain.handle('updater:getStatus', () => appUpdater.getStatus());
  ipcMain.handle('updater:setAutoUpdate', (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('自动更新设置必须为布尔值');
    return appUpdater.setAutoUpdate(enabled);
  });
}
