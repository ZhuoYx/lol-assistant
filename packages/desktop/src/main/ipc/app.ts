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
      // 策略1：通过进程/注册表检测
      const processInfo = await detectLOLProcess();
      if (processInfo) {
        return processInfo.installDirectory;
      }

      // 策略2：尝试常见路径（国际服 + 国服 / WeGame）
      const drives = ['C:', 'D:', 'E:', 'F:'];
      const commonPaths = [
        // Riot 国际服
        path.resolve(process.env.LOCALAPPDATA ?? '', 'Riot Games/League of Legends'),
        ...drives.map((d) => `${d}/Riot Games/League of Legends`),
        // 国服 / WeGame 常见路径（包含常见子目录结构）
        ...drives.flatMap((d) => [
          `${d}/腾讯游戏/英雄联盟`,
          `${d}/WeGame/games/英雄联盟`,
          `${d}/Program Files/腾讯游戏/英雄联盟`,
          `${d}/Program Files (x86)/腾讯游戏/英雄联盟`,
          `${d}/Program Files (x86)/英雄联盟`,
          `${d}/Games/英雄联盟`,
          `${d}/LOL`,
          `${d}/英雄联盟`,
        ]),
      ];

      // 国服结构：安装根目录/LeagueClient/lockfile
      const leagueClientFiles = ['LeagueClient.exe', 'LeagueClientUx.exe', 'lockfile'];

      for (const p of commonPaths) {
        try {
          await fs.access(p);
          // 检查根目录自身
          for (const f of leagueClientFiles) {
            try {
              await fs.access(path.join(p, f));
              return p;
            } catch {
              // continue
            }
          }
          // 检查 LeagueClient 子目录（国服典型结构）
          const subDir = path.join(p, 'LeagueClient');
          for (const f of leagueClientFiles) {
            try {
              await fs.access(path.join(subDir, f));
              return subDir;
            } catch {
              // continue
            }
          }
          // 检查 TCLS/Client.exe（国服启动器作为有效标记）
          try {
            await fs.access(path.join(p, 'TCLS', 'Client.exe'));
            return p;
          } catch {
            // continue
          }
        } catch {
          // 目录不存在
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
      await fs.access(lolPath);
      // 检查根目录下的文件
      const candidates = ['LeagueClient.exe', 'LeagueClientUx.exe', 'lockfile', 'TCLS/Client.exe'];
      for (const name of candidates) {
        try {
          await fs.access(path.join(lolPath, name));
          return true;
        } catch {
          // continue
        }
      }
      // 检查 LeagueClient 子目录（国服典型结构）
      const subDir = path.join(lolPath, 'LeagueClient');
      for (const name of ['LeagueClient.exe', 'LeagueClientUx.exe', 'lockfile']) {
        try {
          await fs.access(path.join(subDir, name));
          return true;
        } catch {
          // continue
        }
      }
      return false;
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
