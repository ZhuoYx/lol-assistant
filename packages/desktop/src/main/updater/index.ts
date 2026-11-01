import { app } from 'electron';
import { autoUpdater, type UpdateInfo as ElectronUpdateInfo } from 'electron-updater';
import { logger } from '../utils/logger';
import { cacheStore } from '../cache/store';
import type { UpdateInfo, UpdateState, UpdateStatus } from '@lol-assistant/shared';

const CHECK_INTERVAL = 4 * 60 * 60 * 1000;

export class AppUpdater {
  private status: UpdateStatus = 'idle';
  private updateInfo: UpdateInfo | null = null;
  private downloadPercent = 0;
  private error: string | null = null;
  private enabled = true;
  private initialized = false;
  private started = false;
  private onChange: ((state: UpdateState) => void) | undefined;
  private checking: Promise<UpdateState> | null = null;
  private downloading: Promise<UpdateState> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | undefined;
  private intervalTimer: ReturnType<typeof setInterval> | undefined;

  init(onChange?: (state: UpdateState) => void): void {
    this.onChange = onChange;
    if (this.initialized) return;
    this.initialized = true;
    this.enabled = cacheStore.getSetting<boolean>('autoUpdate', true) !== false;
    // Start downloads explicitly so an in-flight check respects a newly disabled preference.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = this.enabled;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.logger = logger;

    autoUpdater.on('checking-for-update', () => this.setStatus('checking'));
    autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
      this.updateInfo = this.normalizeInfo(info);
      this.error = null;
      this.downloadPercent = 0;
      this.setStatus('available');
      logger.info(`发现新版本：${info.version}`);
      if (this.enabled) void this.downloadUpdate();
    });
    autoUpdater.on('update-not-available', () => {
      this.updateInfo = null;
      this.downloadPercent = 0;
      this.error = null;
      this.setStatus('not-available');
    });
    autoUpdater.on('download-progress', (progress) => {
      this.downloadPercent = Math.max(0, Math.min(100, Math.round(progress.percent || 0)));
      this.setStatus('downloading');
    });
    autoUpdater.on('update-downloaded', () => {
      this.downloadPercent = 100;
      this.error = null;
      this.setStatus('downloaded');
      logger.info('更新已下载，等待用户重启或正常退出应用');
    });
    autoUpdater.on('error', (error: Error) => this.fail(error));
  }

  start(): void {
    this.started = true;
    this.scheduleChecks();
  }

  private scheduleChecks(): void {
    this.clearTimers();
    if (!this.started || !this.enabled || !this.isSupported()) return;
    this.startupTimer = setTimeout(() => void this.checkForUpdates(true), 5000);
    this.intervalTimer = setInterval(() => void this.checkForUpdates(true), CHECK_INTERVAL);
    this.startupTimer.unref();
    this.intervalTimer.unref();
  }

  private clearTimers(): void {
    clearTimeout(this.startupTimer);
    clearInterval(this.intervalTimer);
  }

  dispose(): void {
    this.started = false;
    this.clearTimers();
  }

  setAutoUpdate(value: boolean): UpdateState {
    cacheStore.setSetting('autoUpdate', value);
    this.enabled = value;
    autoUpdater.autoInstallOnAppQuit = value;
    this.scheduleChecks();
    this.notify();
    if (value && this.status === 'available') void this.downloadUpdate();
    // A manual download made while auto-install was disabled has no quit hook yet.
    // Revalidating the cached download registers electron-updater's official quit hook.
    if (value && this.status === 'downloaded')
      void autoUpdater.downloadUpdate().catch((error) => this.fail(error));
    return this.getStatus();
  }

  async checkForUpdates(background = false): Promise<UpdateState> {
    if (background && !this.enabled) return this.getStatus();
    if (!this.isSupported()) {
      this.error = '自动更新仅支持已安装的 Windows 版本，开发模式下不会下载或安装更新。';
      this.setStatus('unsupported');
      return this.getStatus();
    }
    if (this.downloading || this.status === 'downloaded') return this.getStatus();
    if (this.checking) return this.checking;
    this.error = null;
    this.updateInfo = null;
    this.downloadPercent = 0;
    this.setStatus('checking');
    this.checking = (async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        if (!result) throw new Error('更新服务未返回检查结果');
        // updateInfo also exists when the server version equals/precedates this version.
        // Only the explicit availability flag indicates a newer release.
        if (!result.isUpdateAvailable) {
          this.updateInfo = null;
          this.setStatus('not-available');
        }
      } catch (error) {
        this.fail(error);
      }
      return this.getStatus();
    })();
    try {
      return await this.checking;
    } finally {
      this.checking = null;
    }
  }

  async downloadUpdate(): Promise<UpdateState> {
    if (!this.isSupported() || !this.updateInfo || !['available', 'error'].includes(this.status))
      return this.downloading ?? this.getStatus();
    if (this.downloading) return this.downloading;
    this.error = null;
    this.downloadPercent = 0;
    this.setStatus('downloading');
    this.downloading = (async () => {
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        this.fail(error);
      }
      return this.getStatus();
    })();
    try {
      return await this.downloading;
    } finally {
      this.downloading = null;
    }
  }

  installUpdate(): UpdateState {
    if (this.status === 'downloaded' && this.isSupported()) {
      try {
        // Explicit installation is allowed even with automatic updates disabled.
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        this.fail(error);
      }
    }
    return this.getStatus();
  }

  getStatus(): UpdateState {
    return {
      status: this.status,
      currentVersion: app.getVersion(),
      supported: this.isSupported(),
      autoUpdate: this.enabled,
      updateInfo: this.updateInfo,
      downloadPercent: this.downloadPercent,
      error: this.error,
    };
  }

  private isSupported(): boolean {
    return app.isPackaged && process.platform === 'win32';
  }

  private normalizeInfo(info: ElectronUpdateInfo): UpdateInfo {
    return {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    };
  }

  private fail(error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.error =
      /404|No published versions|ERR_UPDATER_(?:LATEST_VERSION_NOT_FOUND|CHANNEL_FILE_NOT_FOUND)/i.test(
        detail,
      )
        ? '尚未发布可用的更新，或发布文件不完整，请稍后重试。'
        : '更新失败，请检查 GitHub 网络连接后重试；详细原因可通过导出日志查看。';
    logger.warn('应用更新失败：', detail);
    this.setStatus('error');
  }

  private setStatus(status: UpdateStatus): void {
    this.status = status;
    this.notify();
  }

  private notify(): void {
    this.onChange?.(this.getStatus());
  }
}

export const appUpdater = new AppUpdater();
