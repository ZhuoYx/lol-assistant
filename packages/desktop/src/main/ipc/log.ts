import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { access, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { release } from 'node:os';
import type { LogExportResult } from '@lol-assistant/shared';
import { getLogDirectory, logger } from '../utils/logger';
import { buildLogReport } from '../utils/log-export';
import { lcuClient } from '../lcu/client';

export function registerLogIpcHandlers(): void {
  let exporting = false;
  let lastExportPath: string | null = null;

  ipcMain.handle('log:export', async (event): Promise<LogExportResult> => {
    if (exporting) return { status: 'busy' };
    exporting = true;
    try {
      const directory = getLogDirectory();
      const now = new Date();
      const report = await buildLogReport(
        directory,
        {
          appVersion: app.getVersion(),
          system: `${process.platform} ${release()}`,
          arch: process.arch,
          electronVersion: process.versions.electron ?? '',
          nodeVersion: process.versions.node,
          connectionStatus: lcuClient.status,
        },
        now,
      );
      if (!report.fileCount)
        return report.skippedCount
          ? { status: 'error', message: '无法读取日志文件，请检查日志目录的访问权限后重试。' }
          : { status: 'empty' };
      const stamp = now.toISOString().replace(/[:.]/g, '-');
      const options = {
        title: '导出诊断日志',
        buttonLabel: '保存日志',
        defaultPath: join(app.getPath('downloads'), `LOL助手-诊断日志-${stamp}.txt`),
        filters: [{ name: '诊断日志', extensions: ['txt'] }],
      };
      const owner = BrowserWindow.fromWebContents(event.sender);
      const target = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);
      if (target.canceled || !target.filePath) return { status: 'cancelled' };
      const canonical = (file: string) =>
        process.platform === 'win32' ? resolve(file).toLowerCase() : resolve(file);
      if (
        canonical(dirname(target.filePath)) === canonical(directory) &&
        /\.log$/i.test(target.filePath)
      )
        return { status: 'error', message: '不能覆盖应用的原始日志，请选择其他保存位置。' };
      // UTF-8 BOM and Windows line endings also work in Notepad.
      await writeFile(target.filePath, '\uFEFF' + report.text.replace(/\r?\n/g, '\r\n'), 'utf8');
      lastExportPath = target.filePath;
      logger.info(`诊断日志导出完成：${report.fileCount} 个文件`);
      return {
        status: 'saved',
        filePath: target.filePath,
        fileCount: report.fileCount,
        skippedCount: report.skippedCount,
        truncated: report.truncated,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      logger.warn('诊断日志导出失败:', code ?? 'unknown');
      return {
        status: 'error',
        message:
          code === 'EACCES' || code === 'EPERM'
            ? '没有权限读取或保存日志，请尝试其他保存位置。'
            : code === 'ENOSPC'
              ? '保存位置的磁盘空间不足。'
              : '导出日志失败，请稍后重试。',
      };
    } finally {
      exporting = false;
    }
  });

  // Only reveal a file this process successfully exported; renderer cannot supply an arbitrary path.
  ipcMain.handle('log:revealExport', async (): Promise<boolean> => {
    if (!lastExportPath) return false;
    try {
      await access(lastExportPath);
      shell.showItemInFolder(lastExportPath);
      return true;
    } catch {
      return false;
    }
  });
}
