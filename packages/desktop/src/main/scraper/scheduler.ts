/**
 * 数据更新调度器
 * 版本更新触发、最短 6 小时刷新间隔、3 天数据过期
 * 失败重试策略：3 次重试，每次间隔 5 分钟
 */
import type {
  IChampionDataScraper,
  ChampionTier,
  ChampionBuilds,
  ChampionCounters,
} from '@lol-assistant/shared';
import { SCRAPER_CACHE } from '@lol-assistant/shared';
import { ScraperStorage } from './storage';
import { logger } from '../utils/logger';

/** 调度器状态 */
export type SchedulerStatus = 'idle' | 'running' | 'error';

/** 更新进度回调 */
export interface UpdateProgress {
  current: number;
  total: number;
  championId?: number;
  stage: 'tier-list' | 'builds' | 'counters';
}

export class ScraperScheduler {
  private storage: ScraperStorage;
  private scraper: IChampionDataScraper;
  private status: SchedulerStatus = 'idle';
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private abortController: AbortController | null = null;
  private onProgress?: (progress: UpdateProgress) => void;

  constructor(scraper: IChampionDataScraper, storage: ScraperStorage) {
    this.scraper = scraper;
    this.storage = storage;
  }

  /** 获取当前状态 */
  getStatus(): SchedulerStatus {
    return this.status;
  }

  /** 设置进度回调 */
  setProgressCallback(callback: (progress: UpdateProgress) => void): void {
    this.onProgress = callback;
  }

  /**
   * 触发全量数据更新
   * @param patch 当前游戏版本号
   * @param championIds 需要更新的英雄 ID 列表
   * @param force 是否强制更新（忽略刷新间隔限制）
   */
  async triggerFullUpdate(
    patch: string,
    championIds: number[],
    force = false,
  ): Promise<void> {
    // 检查刷新间隔
    if (!force) {
      const allowed = await this.storage.isRefreshAllowed();
      if (!allowed) {
        logger.info('距离上次更新不足最短刷新间隔，跳过');
        return;
      }
    }

    if (this.status === 'running') {
      logger.warn('更新任务已在运行中，跳过');
      return;
    }

    this.status = 'running';
    this.retryCount = 0;
    this.abortController = new AbortController();

    try {
      await this.executeUpdate(patch, championIds);
      this.status = 'idle';
      logger.info('数据全量更新完成');
    } catch (err) {
      if (this.abortController?.signal.aborted) {
        this.status = 'idle';
        logger.info('更新任务已被取消');
        return;
      }

      this.status = 'error';
      logger.error('数据更新失败:', err);

      // 启动重试
      this.scheduleRetry(patch, championIds);
    }
  }

  /**
   * 触发单英雄数据更新（按需获取）
   */
  async updateChampion(championId: number, role: string): Promise<{
    builds: ChampionBuilds | null;
    counters: ChampionCounters | null;
  }> {
    let builds: ChampionBuilds | null = null;
    let counters: ChampionCounters | null = null;

    try {
      builds = await this.scraper.getChampionBuilds(championId, role);
      if (builds) {
        await this.storage.saveChampionBuilds(builds);
      }
    } catch (err) {
      logger.warn(`获取英雄 ${championId} 构建数据失败:`, err);
    }

    try {
      counters = await this.scraper.getChampionCounters(championId, role);
      if (counters) {
        await this.storage.saveChampionCounters(counters);
      }
    } catch (err) {
      logger.warn(`获取英雄 ${championId} 克制数据失败:`, err);
    }

    return { builds, counters };
  }

  /** 取消正在进行的更新 */
  cancel(): void {
    this.abortController?.abort();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.status = 'idle';
    this.retryCount = 0;
    logger.info('已取消更新任务');
  }

  /** 销毁调度器 */
  destroy(): void {
    this.cancel();
    this.onProgress = undefined;
  }

  // ─── 内部逻辑 ──────────────────────────────────────────

  /** 执行全量更新 */
  private async executeUpdate(patch: string, championIds: number[]): Promise<void> {
    const signal = this.abortController?.signal;

    // 阶段 1: 更新 Tier 列表
    logger.info('开始更新 Tier 列表...');
    this.emitProgress({ current: 0, total: 1, stage: 'tier-list' });

    try {
      const tierList = await this.scraper.getChampionTierList('ranked_solo');
      await this.storage.saveTierList('ranked_solo', tierList);
      logger.info(`Tier 列表已更新，共 ${tierList.length} 条`);
    } catch (err) {
      logger.warn('更新 Tier 列表失败，继续更新其他数据:', err);
    }

    if (signal?.aborted) return;

    // 阶段 2: 更新英雄构建 + 克制数据（合并阶段，减少请求数）
    const roles = ['top', 'jungle', 'mid', 'adc', 'support'];
    const totalTasks = championIds.length;
    let completedTasks = 0;

    logger.info(`开始更新英雄构建+克制数据，共 ${totalTasks} 个英雄...`);

    for (const champId of championIds) {
      if (signal?.aborted) return;

      for (const role of roles) {
        if (signal?.aborted) return;

        // 获取构建和克制数据
        try {
          const builds = await this.scraper.getChampionBuilds(champId, role);
          await this.storage.saveChampionBuilds(builds);
        } catch {
          // 单个英雄/角色的构建获取失败不影响整体
        }

        try {
          const counters = await this.scraper.getChampionCounters(champId, role);
          await this.storage.saveChampionCounters(counters);
        } catch {
          // 单个英雄/角色的克制获取失败不影响整体
        }

        // 请求间隔，避免被封
        await this.delay(500);
      }

      completedTasks++;
      this.emitProgress({
        current: completedTasks,
        total: totalTasks,
        championId: champId,
        stage: 'builds',
      });
    }

    // 更新元数据
    await this.storage.saveDataVersion({
      patch,
      lastUpdated: Date.now(),
      source: this.getScraperSource(),
    });
  }

  /** 安排重试 */
  private scheduleRetry(patch: string, championIds: number[]): void {
    if (this.retryCount >= SCRAPER_CACHE.retryCount) {
      logger.error(`已达到最大重试次数 (${SCRAPER_CACHE.retryCount})，停止重试`);
      return;
    }

    this.retryCount++;
    const delay = SCRAPER_CACHE.retryDelay;

    logger.info(`将在 ${delay / 60000} 分钟后进行第 ${this.retryCount} 次重试`);

    this.retryTimer = setTimeout(async () => {
      this.retryTimer = null;
      this.status = 'running';

      try {
        await this.executeUpdate(patch, championIds);
        this.status = 'idle';
        this.retryCount = 0;
        logger.info('重试更新成功');
      } catch (err) {
        this.status = 'error';
        logger.error(`第 ${this.retryCount} 次重试失败:`, err);
        this.scheduleRetry(patch, championIds);
      }
    }, delay);
  }

  /** 发送进度事件 */
  private emitProgress(progress: UpdateProgress): void {
    this.onProgress?.(progress);
  }

  /** 获取爬取器数据源标记 */
  private getScraperSource(): 'opgg' | 'local' {
    const name = this.scraper.constructor.name.toLowerCase();
    if (name.includes('opgg')) return 'opgg';
    return 'local';
  }

  /** 延迟 */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
