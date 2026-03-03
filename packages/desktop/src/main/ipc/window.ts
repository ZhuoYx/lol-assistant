/**
 * 窗口管理 IPC 处理器
 */
import { ipcMain, BrowserWindow } from 'electron';
import { getMainWindow, toggleMiniMode } from '../index';
import { logger } from '../utils/logger';

export function registerWindowIpcHandlers(): void {
  // 设置窗口置顶
  ipcMain.on('window:setAlwaysOnTop', (_event, flag: boolean) => {
    const win = getMainWindow();
    if (win) {
      win.setAlwaysOnTop(flag, flag ? 'floating' : undefined);
      logger.info(`窗口置顶: ${flag}`);
    }
  });

  // 切换迷你模式
  ipcMain.on('window:setMiniMode', (_event, flag: boolean) => {
    toggleMiniMode(flag);
  });

  // 最小化到托盘
  ipcMain.on('window:minimize-to-tray', () => {
    const win = getMainWindow();
    if (win) {
      win.hide();
      logger.info('窗口最小化到托盘');
    }
  });
}
