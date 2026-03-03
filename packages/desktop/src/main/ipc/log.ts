/**
 * 日志相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { exportLogPath } from '../utils/logger';

export function registerLogIpcHandlers(): void {
  // 导出日志文件路径
  ipcMain.handle('log:export', async () => {
    return exportLogPath();
  });
}
