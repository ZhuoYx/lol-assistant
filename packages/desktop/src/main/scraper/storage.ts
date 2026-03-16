/**
 * 爬取数据分片存储
 * 独立 JSON 文件按 {championId}_{role} 分片，避免 electron-store 大文件性能瓶颈
 *
 * 存储结构:
 * {userData}/scraper-data/
 * ├── meta.json                    # 数据版本和更新时间信息
 * ├── tier-list/
 * │   └── ranked_solo.json         # Tier 列表
 * │   └── ranked_flex.json
 * ├── builds/
 * │   ├── {championId}_{role}.json
 * │   └── ...
 * └── counters/
 *     ├── {championId}_{role}.json
 *     └── ...
 */
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import type {
  CacheEntry,
  ChampionBuilds,
  ChampionCounters,
  ChampionTier,
  ScraperDataVersion,
} from '@lol-assistant/shared';
import { SCRAPER_CACHE } from '@lol-assistant/shared';
import { logger } from '../utils/logger';

/** 元数据信息 */
interface ScraperMeta {
  patch: string;
  lastUpdated: number;
  source: 'opgg' | 'local';
}

export class ScraperStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(app.getPath('userData'), 'scraper-data');
  }

  /** 确保目录存在 */
  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  // ─── 元数据 ──────────────────────────────────────────────

  /** 获取数据版本信息 */
  async getDataVersion(): Promise<ScraperDataVersion | null> {
    try {
      const filePath = path.join(this.baseDir, 'meta.json');
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as ScraperDataVersion;
    } catch {
      return null;
    }
  }

  /** 保存数据版本信息 */
  async saveDataVersion(meta: ScraperMeta): Promise<void> {
    await this.ensureDir(this.baseDir);
    const filePath = path.join(this.baseDir, 'meta.json');
    const version: ScraperDataVersion = {
      patch: meta.patch,
      lastUpdated: meta.lastUpdated,
      source: meta.source,
    };
    await fs.writeFile(filePath, JSON.stringify(version, null, 2), 'utf-8');
  }

  // ─── Tier 列表 ──────────────────────────────────────────

  /** 获取 Tier 列表 */
  async getTierList(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[] | null> {
    try {
      const filePath = path.join(this.baseDir, 'tier-list', `${queue}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(data) as CacheEntry<ChampionTier[]>;
      if (Date.now() > entry.expiresAt) return null;
      return entry.data;
    } catch {
      return null;
    }
  }

  /** 保存 Tier 列表 */
  async saveTierList(queue: 'ranked_solo' | 'ranked_flex', tierList: ChampionTier[]): Promise<void> {
    const dir = path.join(this.baseDir, 'tier-list');
    await this.ensureDir(dir);
    const filePath = path.join(dir, `${queue}.json`);
    const entry: CacheEntry<ChampionTier[]> = {
      data: tierList,
      timestamp: Date.now(),
      expiresAt: Date.now() + SCRAPER_CACHE.dataExpiry,
    };
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  }

  // ─── 英雄构建 ──────────────────────────────────────────

  /** 获取英雄构建数据 */
  async getChampionBuilds(championId: number, role: string): Promise<ChampionBuilds | null> {
    try {
      const filePath = path.join(this.baseDir, 'builds', `${championId}_${role}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(data) as CacheEntry<ChampionBuilds>;
      if (Date.now() > entry.expiresAt) return null;
      return entry.data;
    } catch {
      return null;
    }
  }

  /** 保存英雄构建数据 */
  async saveChampionBuilds(builds: ChampionBuilds): Promise<void> {
    const dir = path.join(this.baseDir, 'builds');
    await this.ensureDir(dir);
    const filePath = path.join(dir, `${builds.championId}_${builds.role}.json`);
    const entry: CacheEntry<ChampionBuilds> = {
      data: builds,
      timestamp: Date.now(),
      expiresAt: Date.now() + SCRAPER_CACHE.dataExpiry,
    };
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  }

  // ─── 英雄克制关系 ──────────────────────────────────────

  /** 获取英雄克制关系 */
  async getChampionCounters(championId: number, role: string): Promise<ChampionCounters | null> {
    try {
      const filePath = path.join(this.baseDir, 'counters', `${championId}_${role}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(data) as CacheEntry<ChampionCounters>;
      if (Date.now() > entry.expiresAt) return null;
      return entry.data;
    } catch {
      return null;
    }
  }

  /** 保存英雄克制关系 */
  async saveChampionCounters(counters: ChampionCounters): Promise<void> {
    const dir = path.join(this.baseDir, 'counters');
    await this.ensureDir(dir);
    const filePath = path.join(dir, `${counters.championId}_${counters.role}.json`);
    const entry: CacheEntry<ChampionCounters> = {
      data: counters,
      timestamp: Date.now(),
      expiresAt: Date.now() + SCRAPER_CACHE.dataExpiry,
    };
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  }

  // ─── 工具方法 ──────────────────────────────────────────

  /** 清除所有爬取数据 */
  async clearAll(): Promise<void> {
    try {
      await fs.rm(this.baseDir, { recursive: true, force: true });
      logger.info('已清除所有爬取数据');
    } catch (err) {
      logger.warn('清除爬取数据失败:', err);
    }
  }

  /** 清除指定英雄的缓存数据（所有角色） */
  async clearChampionData(championId: number): Promise<void> {
    const dirs = ['builds', 'counters'];
    for (const dir of dirs) {
      try {
        const dirPath = path.join(this.baseDir, dir);
        const entries = await fs.readdir(dirPath).catch(() => []);
        for (const entry of entries) {
          if (entry.startsWith(`${championId}_`)) {
            await fs.unlink(path.join(dirPath, entry)).catch(() => {});
          }
        }
      } catch {
        // 目录不存在时忽略
      }
    }
    logger.info(`已清除英雄 ${championId} 的缓存数据`);
  }

  /** 获取存储目录大小（字节） */
  async getStorageSize(): Promise<number> {
    try {
      return await this.calculateDirSize(this.baseDir);
    } catch {
      return 0;
    }
  }

  /** 递归计算目录大小 */
  private async calculateDirSize(dirPath: string): Promise<number> {
    let total = 0;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          total += await this.calculateDirSize(fullPath);
        } else {
          const stat = await fs.stat(fullPath);
          total += stat.size;
        }
      }
    } catch {
      // 目录不存在时返回 0
    }
    return total;
  }

  /** 检查上次更新是否在最短刷新间隔内 */
  async isRefreshAllowed(): Promise<boolean> {
    const meta = await this.getDataVersion();
    if (!meta) return true;
    return Date.now() - meta.lastUpdated >= SCRAPER_CACHE.minRefreshInterval;
  }
}
