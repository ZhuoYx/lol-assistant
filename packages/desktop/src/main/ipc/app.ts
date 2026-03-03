/**
 * 应用相关 IPC 处理器（首次引导等）
 */
import { ipcMain } from 'electron';
import { cacheStore } from '../cache/store';

export function registerAppIpcHandlers(): void {
  // 是否首次启动
  ipcMain.handle('app:isFirstLaunch', async () => {
    return cacheStore.isFirstLaunch();
  });

  // 标记首次启动完成
  ipcMain.handle('app:setFirstLaunchDone', async () => {
    cacheStore.setFirstLaunchDone();
  });
}
