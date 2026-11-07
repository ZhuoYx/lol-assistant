/**
 * 静态资源缓存管理器
 *
 * 负责从 Data Dragon / CommunityDragon 下载资源并缓存到本地。
 * 缓存策略：
 * - 首次请求时从远程下载并缓存到本地文件系统
 * - 后续请求直接读取本地缓存
 * - 版本更新时清除旧版本缓存
 * - 元数据 JSON 也会缓存（英雄/装备/符文列表数据）
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import https from 'https';
import http from 'http';
import { createHash } from 'crypto';
import type { AssetCacheIndex, AssetCacheEntry } from '@lol-assistant/shared';
import {
  getDDragonVersionsUrl,
  extractMajorVersion,
  getAssetCacheKey,
  isMayhemItemIconUrl,
} from '@lol-assistant/shared';

/** 资源缓存目录 */
const ASSETS_CACHE_DIR = path.join(app.getPath('userData'), 'assets-cache');
/** 缓存索引文件路径 */
const CACHE_INDEX_PATH = path.join(ASSETS_CACHE_DIR, 'index.json');
/** 元数据缓存目录 */
const METADATA_CACHE_DIR = path.join(ASSETS_CACHE_DIR, 'metadata');
/** 图片缓存目录 */
const IMAGES_CACHE_DIR = path.join(ASSETS_CACHE_DIR, 'images');
/** 缓存最大总大小 200MB */
const MAX_CACHE_SIZE = 200 * 1024 * 1024;
/** 元数据缓存有效期 24 小时 */
const METADATA_TTL = 24 * 60 * 60 * 1000;

export class AssetCacheManager {
  private cacheIndex: AssetCacheIndex | null = null;
  private currentVersion: string = '';
  private initPromise: Promise<void> | null = null;
  private downloads = new Map<string, Promise<string>>();
  private writes = Promise.resolve();

  /**
   * 初始化资源缓存管理器
   * - 创建缓存目录
   * - 加载缓存索引
   * - 获取最新游戏版本
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    // 创建缓存目录
    await fs.mkdir(ASSETS_CACHE_DIR, { recursive: true });
    await fs.mkdir(METADATA_CACHE_DIR, { recursive: true });
    await fs.mkdir(IMAGES_CACHE_DIR, { recursive: true });

    // 加载缓存索引
    this.cacheIndex = await this.loadCacheIndex();

    // 获取最新游戏版本
    try {
      this.currentVersion = await this.fetchLatestVersion();
    } catch {
      // 如果获取失败，使用缓存中的版本
      this.currentVersion = this.cacheIndex?.version ?? '';
    }

    // 如果版本变化，标记需要更新
    if (this.cacheIndex && this.cacheIndex.version !== this.currentVersion && this.currentVersion) {
      await this.onVersionChanged();
    }
  }

  /**
   * 获取当前游戏版本
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * 获取当前主版本号
   */
  getMajorVersion(): string {
    return this.currentVersion ? extractMajorVersion(this.currentVersion) : 'latest';
  }

  /**
   * 下载并缓存图片资源，返回本地文件路径
   * @param remoteUrl 远程资源 URL
   * @param assetType 资源类型
   * @param assetId 资源 ID
   * @returns 本地缓存文件路径，失败则返回原始远程 URL
   */
  async getCachedAsset(
    remoteUrl: string,
    assetType: string,
    assetId: string | number,
  ): Promise<string> {
    await this.init();

    // The URL includes patch and origin. An ID alone can reuse an obsolete icon.
    assetType = assetType.replace(/[^a-zA-Z0-9_-]/g, '_');
    const version =
      new URL(remoteUrl).hostname === 'arammayhem.com' || isMayhemItemIconUrl(remoteUrl)
        ? this.currentVersion
        : '';
    assetId = createHash('sha256')
      .update(remoteUrl + version)
      .digest('hex');
    const cacheKey = getAssetCacheKey(assetType, assetId);

    // 检查缓存
    const cached = this.cacheIndex?.entries[cacheKey];
    if (cached && existsSync(cached.localPath)) {
      return cached.localPath;
    }

    const existing = this.downloads.get(cacheKey);
    if (existing) return existing;
    const task = this.downloadAndCache(remoteUrl, assetType, assetId)
      .catch(() => remoteUrl)
      .finally(() => this.downloads.delete(cacheKey));
    this.downloads.set(cacheKey, task);
    return task;
  }

  /**
   * 获取缓存的元数据 JSON
   * @param url 远程 JSON URL
   * @param metaKey 元数据 key（用于缓存文件名）
   * @returns 解析后的 JSON 数据
   */
  async getCachedMetadata<T>(url: string, metaKey: string): Promise<T> {
    await this.init();

    const localPath = path.join(METADATA_CACHE_DIR, `${metaKey}.json`);

    // 检查本地缓存是否存在且未过期
    try {
      const stat = await fs.stat(localPath);
      if (Date.now() - stat.mtimeMs < METADATA_TTL) {
        const data = await fs.readFile(localPath, 'utf-8');
        return JSON.parse(data) as T;
      }
    } catch {
      // 缓存不存在或读取失败，继续下载
    }

    // 从远程下载
    const data = await this.fetchJson<T>(url);

    // 写入本地缓存
    try {
      await fs.writeFile(localPath, JSON.stringify(data), 'utf-8');
    } catch {
      // 写缓存失败不影响返回
    }

    return data;
  }

  /**
   * 读取磁盘缓存并返回 data URL，兼容开发与打包环境
   * 用于渲染进程中的 img src
   */
  async getAssetFileUrl(
    remoteUrl: string,
    assetType: string,
    assetId: string | number,
  ): Promise<string> {
    const localPath = await this.getCachedAsset(remoteUrl, assetType, assetId);
    if (localPath === remoteUrl) {
      return remoteUrl;
    }
    // Data URLs also work in the Vite renderer; http pages cannot load file://.
    try {
      const bytes = await fs.readFile(localPath);
      const ext = path.extname(localPath).toLowerCase();
      const mime =
        ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.webp'
              ? 'image/webp'
              : 'image/png';
      return `data:${mime};base64,${bytes.toString('base64')}`;
    } catch {
      return remoteUrl;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{ totalSize: number; entryCount: number; version: string }> {
    await this.init();
    return {
      totalSize: this.cacheIndex?.totalSize ?? 0,
      entryCount: this.cacheIndex ? Object.keys(this.cacheIndex.entries).length : 0,
      version: this.currentVersion,
    };
  }

  /**
   * 清除所有资源缓存
   */
  async clearCache(): Promise<void> {
    try {
      await fs.rm(ASSETS_CACHE_DIR, { recursive: true, force: true });
      await fs.mkdir(ASSETS_CACHE_DIR, { recursive: true });
      await fs.mkdir(METADATA_CACHE_DIR, { recursive: true });
      await fs.mkdir(IMAGES_CACHE_DIR, { recursive: true });
      this.cacheIndex = {
        version: this.currentVersion,
        lastUpdated: Date.now(),
        entries: {},
        totalSize: 0,
      };
      await this.saveCacheIndex();
    } catch {
      // 清除失败不影响运行
    }
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 获取最新游戏版本号
   */
  private async fetchLatestVersion(): Promise<string> {
    const url = getDDragonVersionsUrl();
    const versions = await this.fetchJson<string[]>(url);
    return versions[0] ?? '';
  }

  /**
   * 版本变化时的处理
   */
  private async onVersionChanged(): Promise<void> {
    // 清除旧的元数据缓存（图片资源保留，因为大多数不会变化）
    try {
      const metaFiles = await fs.readdir(METADATA_CACHE_DIR);
      for (const file of metaFiles) {
        await fs.unlink(path.join(METADATA_CACHE_DIR, file)).catch(() => {});
      }
    } catch {
      // 忽略错误
    }

    // 更新索引版本
    if (this.cacheIndex) {
      this.cacheIndex.version = this.currentVersion;
      this.cacheIndex.lastUpdated = Date.now();
      await this.saveCacheIndex();
    }
  }

  /**
   * 下载资源并缓存到本地
   */
  private async downloadAndCache(
    remoteUrl: string,
    assetType: string,
    assetId: string | number,
  ): Promise<string> {
    // 构建本地缓存路径
    const ext = path.extname(new URL(remoteUrl).pathname) || '.png';
    const safeId = String(assetId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeId}${ext}`;
    const typeDir = path.join(IMAGES_CACHE_DIR, assetType);
    await fs.mkdir(typeDir, { recursive: true });
    const localPath = path.join(typeDir, fileName);

    // Download concurrently; serialize filesystem/index mutations afterwards.
    const buffer = await this.downloadFile(remoteUrl);
    const write = this.writes.then(async () => {
      // 检查缓存大小限制
      await this.ensureCacheSize(buffer.length);

      // 写入本地文件
      await fs.writeFile(localPath, buffer);

      // 更新缓存索引
      const cacheKey = getAssetCacheKey(assetType, assetId);
      const entry: AssetCacheEntry = {
        remoteUrl,
        localPath,
        cachedAt: Date.now(),
        size: buffer.length,
        version: this.currentVersion,
      };

      if (!this.cacheIndex) {
        this.cacheIndex = {
          version: this.currentVersion,
          lastUpdated: Date.now(),
          entries: {},
          totalSize: 0,
        };
      }

      this.cacheIndex.entries[cacheKey] = entry;
      this.cacheIndex.totalSize += buffer.length;
      this.cacheIndex.lastUpdated = Date.now();
      await this.saveCacheIndex();
    });
    this.writes = write.catch(() => {});
    await write;

    return localPath;
  }

  /**
   * 确保缓存大小不超过限制，超出时删除最旧的条目
   */
  private async ensureCacheSize(newFileSize: number): Promise<void> {
    if (!this.cacheIndex) return;

    while (this.cacheIndex.totalSize + newFileSize > MAX_CACHE_SIZE) {
      // 找到最旧的缓存条目
      const entries = Object.entries(this.cacheIndex.entries);
      if (entries.length === 0) break;

      let oldestKey = entries[0][0];
      let oldestTime = entries[0][1].cachedAt;

      for (const [key, entry] of entries) {
        if (entry.cachedAt < oldestTime) {
          oldestKey = key;
          oldestTime = entry.cachedAt;
        }
      }

      // 删除最旧的条目
      const oldEntry = this.cacheIndex.entries[oldestKey];
      if (oldEntry) {
        try {
          await fs.unlink(oldEntry.localPath);
        } catch {
          // 文件可能已被删除
        }
        this.cacheIndex.totalSize -= oldEntry.size;
        delete this.cacheIndex.entries[oldestKey];
      }
    }
  }

  /**
   * 从 URL 下载文件为 Buffer
   */
  private downloadFile(url: string, redirects = 0): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      if (
        parsed.protocol !== 'https:' ||
        (!['raw.communitydragon.org', 'ddragon.leagueoflegends.com', 'arammayhem.com'].includes(
          parsed.hostname,
        ) && !isMayhemItemIconUrl(url)) ||
        (parsed.hostname === 'arammayhem.com' &&
          (parsed.origin !== 'https://arammayhem.com' ||
            !/^\/augments\/[^/]+\.(?:png|webp|jpg)$/i.test(parsed.pathname))) ||
        redirects > 3
      ) {
        reject(new Error('Unsupported image origin'));
        return;
      }
      const client = url.startsWith('https') ? https : http;

      const request = client.get(url, { timeout: 30000 }, (response) => {
        // 处理重定向
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          this.downloadFile(new URL(response.headers.location, url).href, redirects + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 8 * 1024 * 1024) {
            request.destroy();
            reject(new Error('Image too large'));
          } else chunks.push(chunk);
        });
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Timeout downloading ${url}`));
      });
    });
  }

  /**
   * 从 URL 获取 JSON 数据
   */
  private fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;

      const request = client.get(url, { timeout: 15000 }, (response) => {
        // 处理重定向
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          this.fetchJson<T>(response.headers.location).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        let data = '';
        response.setEncoding('utf-8');
        response.on('data', (chunk: string) => (data += chunk));
        response.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e}`));
          }
        });
        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Timeout fetching ${url}`));
      });
    });
  }

  /**
   * 加载缓存索引
   */
  private async loadCacheIndex(): Promise<AssetCacheIndex> {
    try {
      const data = await fs.readFile(CACHE_INDEX_PATH, 'utf-8');
      return JSON.parse(data) as AssetCacheIndex;
    } catch {
      return {
        version: '',
        lastUpdated: 0,
        entries: {},
        totalSize: 0,
      };
    }
  }

  /**
   * 保存缓存索引
   */
  private async saveCacheIndex(): Promise<void> {
    if (!this.cacheIndex) return;
    try {
      await fs.writeFile(CACHE_INDEX_PATH, JSON.stringify(this.cacheIndex, null, 2), 'utf-8');
    } catch {
      // 保存失败不影响运行
    }
  }
}

/** 全局单例 */
export const assetCacheManager = new AssetCacheManager();
