/**
 * 自动更新模块
 *
 * 封装 electron-updater，配置 GitHub Releases 作为更新分发渠道
 * 更新检查失败时静默跳过，不影响正常使用
 */
import { autoUpdater, type UpdateInfo as ElectronUpdateInfo } from 'electron-updater';
import { logger } from '../utils/logger';
import type { UpdateInfo } from '@lol-assistant/shared';

/** 更新状态 */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

/** 更新事件回调 */
interface UpdateCallbacks {
  onStatusChange?: (status: UpdateStatus) => void;
  onProgress?: (percent: number) => void;
  onUpdateInfo?: (info: UpdateInfo) => void;
  onError?: (error: string) => void;
}

class AppUpdater {
  private status: UpdateStatus = 'idle';
  private callbacks: UpdateCallbacks = {};
  private updateInfo: UpdateInfo | null = null;
  private downloadPercent = 0;
  private initialized = false;

  /**
   * 初始化自动更新
   */
  init(callbacks: UpdateCallbacks = {}): void {
    if (this.initialized) return;
    this.initialized = true;
    this.callbacks = callbacks;

    // 配置 autoUpdater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = null; // 使用自定义 logger

    // 注册事件
    autoUpdater.on('checking-for-update', () => {
      this.setStatus('checking');
      logger.info('正在检查更新...');
    });

    autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
      this.updateInfo = {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string'
          ? info.releaseNotes
          : undefined,
        releaseDate: info.releaseDate,
      };
      this.setStatus('available');
      this.callbacks.onUpdateInfo?.(this.updateInfo);
      logger.info(`发现新版本: ${info.version}`);
    });

    autoUpdater.on('update-not-available', () => {
      this.setStatus('not-available');
      logger.info('当前已是最新版本');
    });

    autoUpdater.on('download-progress', (progress) => {
      this.downloadPercent = Math.round(progress.percent);
      this.setStatus('downloading');
      this.callbacks.onProgress?.(this.downloadPercent);
    });

    autoUpdater.on('update-downloaded', () => {
      this.setStatus('downloaded');
      logger.info('更新已下载，将在下次启动时安装');
    });

    autoUpdater.on('error', (err) => {
      const msg = err?.message ?? '未知更新错误';
      this.setStatus('error');
      this.callbacks.onError?.(msg);
      logger.warn('更新检查失败（静默跳过）:', msg);
    });
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      this.setStatus('checking');
      const result = await autoUpdater.checkForUpdates();
      if (result?.updateInfo) {
        this.updateInfo = {
          version: result.updateInfo.version,
          releaseNotes: typeof result.updateInfo.releaseNotes === 'string'
            ? result.updateInfo.releaseNotes
            : undefined,
          releaseDate: result.updateInfo.releaseDate,
        };
        return this.updateInfo;
      }
      return null;
    } catch (err) {
      logger.warn('检查更新失败（静默跳过）:', err);
      this.setStatus('error');
      return null;
    }
  }

  /**
   * 下载更新
   */
  downloadUpdate(): void {
    if (this.status !== 'available') {
      logger.warn('没有可用更新可下载');
      return;
    }
    logger.info('开始下载更新...');
    autoUpdater.downloadUpdate().catch((err) => {
      logger.error('下载更新失败:', err);
      this.setStatus('error');
    });
  }

  /**
   * 安装更新（退出应用并安装）
   */
  installUpdate(): void {
    if (this.status !== 'downloaded') {
      logger.warn('更新尚未下载完成');
      return;
    }
    logger.info('退出并安装更新...');
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * 获取当前状态
   */
  getStatus(): { status: UpdateStatus; updateInfo: UpdateInfo | null; downloadPercent: number } {
    return {
      status: this.status,
      updateInfo: this.updateInfo,
      downloadPercent: this.downloadPercent,
    };
  }

  private setStatus(status: UpdateStatus): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }
}

export const appUpdater = new AppUpdater();
