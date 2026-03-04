/**
 * 应用相关 IPC 处理器（首次引导、路径检测等）
 */
import { ipcMain, dialog } from 'electron';
import { cacheStore } from '../cache/store';
import { detectLOLProcess } from '../utils/process';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export function registerAppIpcHandlers(): void {
  // 是否首次启动
  ipcMain.handle('app:isFirstLaunch', async () => {
    return cacheStore.isFirstLaunch();
  });

  // 标记首次启动完成
  ipcMain.handle('app:setFirstLaunchDone', async () => {
    cacheStore.setFirstLaunchDone();
  });

  // 自动检测 LOL 安装路径
  ipcMain.handle('app:detectLolPath', async () => {
    try {
      const processInfo = await detectLOLProcess();
      if (processInfo) {
        return processInfo.installDirectory;
      }

      // 尝试常见路径
      const commonPaths = [
        path.resolve(process.env.LOCALAPPDATA ?? '', 'Riot Games/League of Legends'),
        'C:/Riot Games/League of Legends',
        'D:/Riot Games/League of Legends',
        'E:/Riot Games/League of Legends',
      ];

      for (const p of commonPaths) {
        try {
          await fs.access(p);
          return p;
        } catch {
          // continue
        }
      }

      return null;
    } catch (err) {
      logger.error('自动检测 LOL 路径失败:', err);
      return null;
    }
  });

  // 手动选择 LOL 安装路径
  ipcMain.handle('app:selectLolPath', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择英雄联盟安装目录',
      properties: ['openDirectory'],
      defaultPath: 'C:/Riot Games/League of Legends',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // 验证 LOL 安装路径
  ipcMain.handle('app:validateLolPath', async (_event, lolPath: string) => {
    try {
      // 检查目录是否存在且有 LeagueClient.exe
      await fs.access(lolPath);
      const exePath = path.join(lolPath, 'LeagueClient.exe');
      try {
        await fs.access(exePath);
        return true;
      } catch {
        // 退而求其次，检查 lockfile 曾存在的痕迹
        return false;
      }
    } catch {
      return false;
    }
  });

  // 保存 LOL 安装路径
  ipcMain.handle('app:saveLolPath', async (_event, lolPath: string) => {
    cacheStore.setSetting('lolInstallPath', lolPath);
    logger.info(`保存 LOL 安装路径: ${lolPath}`);
  });

  // 获取已保存的 LOL 安装路径
  ipcMain.handle('app:getSavedLolPath', async () => {
    return cacheStore.getSetting<string>('lolInstallPath', '') || null;
  });
}
