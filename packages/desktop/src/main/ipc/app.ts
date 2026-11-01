/** 应用相关 IPC：首次引导与安装目录选择。 */
import { ipcMain, dialog } from 'electron';
import { cacheStore } from '../cache/store';
import { detectLOLInstallPath, resolveLOLClientPath } from '../utils/lol-path';
import { logger } from '../utils/logger';

export function registerAppIpcHandlers(): void {
  ipcMain.handle('app:isFirstLaunch', async () => cacheStore.isFirstLaunch());
  ipcMain.handle('app:setFirstLaunchDone', async () => cacheStore.setFirstLaunchDone());

  // Installation discovery is independent from LCU credentials and never requests UAC.
  ipcMain.handle('app:detectLolPath', async () => {
    try {
      return await detectLOLInstallPath(cacheStore.getSetting<string>('lolInstallPath', ''));
    } catch (error) {
      logger.warn('自动检测 LOL 安装目录失败:', error);
      return null;
    }
  });

  ipcMain.handle('app:selectLolPath', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择英雄联盟安装目录或 LeagueClient 目录',
      properties: ['openDirectory'],
      defaultPath: cacheStore.getSetting<string>('lolInstallPath', '') || undefined,
    });
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
  });

  // Detection, validation and saving share the same directory rules.
  ipcMain.handle('app:validateLolPath', async (_event, lolPath: unknown) => {
    return !!(await resolveLOLClientPath(lolPath));
  });

  ipcMain.handle('app:saveLolPath', async (_event, lolPath: unknown) => {
    const directory = await resolveLOLClientPath(lolPath);
    if (!directory) throw new Error('所选目录未找到英雄联盟客户端，请重新选择。');
    cacheStore.setSetting('lolInstallPath', directory);
    logger.info(`保存 LOL 客户端目录: ${directory}`);
  });

  ipcMain.handle('app:getSavedLolPath', async () => {
    return cacheStore.getSetting<string>('lolInstallPath', '') || null;
  });
}
