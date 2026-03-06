/**
 * 爬取器统一接口与多数据源降级策略
 *
 * 降级流程：
 * 1. 查询本地缓存 -> 命中且未过期 -> 返回缓存数据
 * 2. 缓存未命中/已过期 -> 请求 OP.GG
 * 3. OP.GG 失败 -> 请求 Lolalytics（备选）
 * 4. Lolalytics 也失败 -> 使用本地内置静态数据（兜底）
 * 5. 更新本地缓存
 */
import type {
  IChampionDataScraper,
  ChampionTier,
  ChampionBuilds,
  ChampionCounters,
  ScraperDataVersion,
  AramChampionTier,
} from '@lol-assistant/shared';
import { CHAMPION_COUNTERS } from '@lol-assistant/shared';
import { OPGGScraper } from './opgg';
import { LolalyticsScraper } from './lolalytics';
import { ScraperStorage } from './storage';
import { ScraperScheduler } from './scheduler';
import { logger } from '../utils/logger';

export class ScraperManager implements IChampionDataScraper {
  private opgg: OPGGScraper;
  private lolalytics: LolalyticsScraper;
  private storage: ScraperStorage;
  private scheduler: ScraperScheduler;

  /** ARAM Tier 数据内存缓存 (1 小时过期) */
  private aramTierCache: { data: AramChampionTier[]; expiresAt: number } | null = null;
  private static ARAM_CACHE_TTL = 60 * 60 * 1000; // 1 小时

  constructor() {
    this.opgg = new OPGGScraper();
    this.lolalytics = new LolalyticsScraper();
    this.storage = new ScraperStorage();
    // 默认使用 OP.GG 作为调度器的主爬取器
    this.scheduler = new ScraperScheduler(this.opgg, this.storage);
  }

  /** 获取存储实例 */
  getStorage(): ScraperStorage {
    return this.storage;
  }

  /** 获取调度器实例 */
  getScheduler(): ScraperScheduler {
    return this.scheduler;
  }

  /** 获取数据版本信息 */
  async getDataVersion(): Promise<ScraperDataVersion | null> {
    return this.storage.getDataVersion();
  }

  /**
   * 获取 ARAM（大乱斗）英雄 Tier 列表
   * 数据源：Lolalytics ARAM tier endpoint
   * 带 1 小时内存缓存
   */
  async getAramTierList(): Promise<AramChampionTier[]> {
    // 检查缓存
    if (this.aramTierCache && Date.now() < this.aramTierCache.expiresAt) {
      logger.info(`ARAM Tier 列表缓存命中 (${this.aramTierCache.data.length} 英雄)`);
      return this.aramTierCache.data;
    }

    try {
      logger.info('从 Lolalytics 获取 ARAM Tier 列表...');
      const tierList = await this.lolalytics.getAramTierList();
      this.aramTierCache = {
        data: tierList,
        expiresAt: Date.now() + ScraperManager.ARAM_CACHE_TTL,
      };
      return tierList;
    } catch (err) {
      logger.warn('获取 ARAM Tier 列表失败:', err);
      // 返回缓存的过期数据（如果有）
      if (this.aramTierCache) {
        logger.info('返回过期的 ARAM Tier 缓存数据');
        return this.aramTierCache.data;
      }
      return [];
    }
  }

  // ─── IChampionDataScraper 实现 ─────────────────────────

  async getChampionTierList(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]> {
    // 1. 查询缓存
    const cached = await this.storage.getTierList(queue);
    if (cached) {
      logger.info(`Tier 列表缓存命中 (queue=${queue})`);
      return cached;
    }

    // 2. OP.GG
    try {
      logger.info('从 OP.GG 获取 Tier 列表...');
      const tierList = await this.opgg.getChampionTierList(queue);
      await this.storage.saveTierList(queue, tierList);
      return tierList;
    } catch (err) {
      logger.warn('OP.GG 获取 Tier 列表失败:', err);
    }

    // 3. Lolalytics
    try {
      logger.info('从 Lolalytics 获取 Tier 列表...');
      const tierList = await this.lolalytics.getChampionTierList(queue);
      await this.storage.saveTierList(queue, tierList);
      return tierList;
    } catch (err) {
      logger.warn('Lolalytics 获取 Tier 列表也失败:', err);
    }

    // 4. 本地静态数据（从 champion-counters 生成基础 Tier 列表）
    logger.info('所有在线数据源均失败，使用本地静态数据');
    return this.generateLocalTierList();
  }

  async getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds> {
    const normalizedRole = role ?? 'mid';

    // 1. 查询缓存
    const cached = await this.storage.getChampionBuilds(championId, normalizedRole);
    if (cached) {
      logger.info(`英雄构建缓存命中 (champion=${championId}, role=${normalizedRole})`);
      return cached;
    }

    // 2. OP.GG
    try {
      logger.info(`从 OP.GG 获取英雄 ${championId} 构建...`);
      const builds = await this.opgg.getChampionBuilds(championId, role);
      await this.storage.saveChampionBuilds(builds);
      return builds;
    } catch (err) {
      logger.warn(`OP.GG 获取英雄 ${championId} 构建失败:`, err);
    }

    // 3. Lolalytics
    try {
      logger.info(`从 Lolalytics 获取英雄 ${championId} 构建...`);
      const builds = await this.lolalytics.getChampionBuilds(championId, role);
      await this.storage.saveChampionBuilds(builds);
      return builds;
    } catch (err) {
      logger.warn(`Lolalytics 获取英雄 ${championId} 构建也失败:`, err);
    }

    // 4. 本地空数据兜底
    logger.info(`所有在线数据源均失败，返回空构建数据 (champion=${championId})`);
    return this.generateLocalBuilds(championId, normalizedRole);
  }

  async getChampionCounters(championId: number, role?: string): Promise<ChampionCounters> {
    const normalizedRole = role ?? 'mid';

    // 1. 查询缓存
    const cached = await this.storage.getChampionCounters(championId, normalizedRole);
    if (cached) {
      logger.info(`英雄克制缓存命中 (champion=${championId}, role=${normalizedRole})`);
      return cached;
    }

    // 2. OP.GG
    try {
      logger.info(`从 OP.GG 获取英雄 ${championId} 克制关系...`);
      const counters = await this.opgg.getChampionCounters(championId, role);
      await this.storage.saveChampionCounters(counters);
      return counters;
    } catch (err) {
      logger.warn(`OP.GG 获取英雄 ${championId} 克制关系失败:`, err);
    }

    // 3. Lolalytics
    try {
      logger.info(`从 Lolalytics 获取英雄 ${championId} 克制关系...`);
      const counters = await this.lolalytics.getChampionCounters(championId, role);
      await this.storage.saveChampionCounters(counters);
      return counters;
    } catch (err) {
      logger.warn(`Lolalytics 获取英雄 ${championId} 克制关系也失败:`, err);
    }

    // 4. 本地静态数据
    logger.info(`所有在线数据源均失败，使用本地静态克制数据 (champion=${championId})`);
    return this.generateLocalCounters(championId, normalizedRole);
  }

  // ─── 手动操作 ──────────────────────────────────────────

  /** 手动触发全量更新 */
  async triggerUpdate(patch: string, championIds: number[], force = false): Promise<void> {
    return this.scheduler.triggerFullUpdate(patch, championIds, force);
  }

  /** 取消更新 */
  cancelUpdate(): void {
    this.scheduler.cancel();
  }

  /** 清除所有缓存数据 */
  async clearData(): Promise<void> {
    await this.storage.clearAll();
  }

  /** 清除指定英雄的缓存数据 */
  async clearChampionCache(championId: number): Promise<void> {
    await this.storage.clearChampionData(championId);
  }

  /** 销毁 */
  destroy(): void {
    this.scheduler.destroy();
  }

  // ─── 本地兜底数据生成 ──────────────────────────────────

  /** 从静态克制关系表生成基础 Tier 列表 */
  private generateLocalTierList(): ChampionTier[] {
    const tierList: ChampionTier[] = [];
    for (const champIdStr of Object.keys(CHAMPION_COUNTERS)) {
      const championId = parseInt(champIdStr, 10);
      tierList.push({
        championId,
        role: 'mid',
        tier: 'B',
        winRate: 50,
        pickRate: 5,
        banRate: 5,
      });
    }
    return tierList;
  }

  /** 生成空的本地构建数据 */
  private generateLocalBuilds(championId: number, role: string): ChampionBuilds {
    return {
      championId,
      role,
      patch: '',
      dataSource: 'local',
      runeBuilds: [],
      itemBuilds: [],
      skillOrder: [],
    };
  }

  /** 从静态克制表生成本地克制数据 */
  private generateLocalCounters(championId: number, role: string): ChampionCounters {
    const staticData = CHAMPION_COUNTERS[championId];

    if (!staticData) {
      return {
        championId,
        role,
        hardCounters: [],
        easyMatchups: [],
      };
    }

    return {
      championId,
      role,
      hardCounters: staticData.counteredBy.map((id) => ({
        championId: id,
        winRate: 55,
        sampleSize: 0,
      })),
      easyMatchups: staticData.counters.map((id) => ({
        championId: id,
        winRate: 45,
        sampleSize: 0,
      })),
    };
  }
}

// 导出其他模块
export { OPGGScraper } from './opgg';
export { LolalyticsScraper } from './lolalytics';
export { ScraperStorage } from './storage';
export { ScraperScheduler } from './scheduler';
export type { SchedulerStatus, UpdateProgress } from './scheduler';
