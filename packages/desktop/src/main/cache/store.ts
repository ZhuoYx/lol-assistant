/**
 * 缓存存储模块
 * 基于 electron-store，含 LRU 淘汰和缓存总大小 50MB 上限控制
 * 仅用于 LCU 数据缓存（召唤师、战绩、排位等）
 */
import Store from 'electron-store';
import { logger } from '../utils/logger';
import {
  CACHE_TTL,
  CACHE_MAX_ENTRIES,
  CACHE_MAX_TOTAL_SIZE,
  type CacheEntry,
  type CacheStats,
} from '@lol-assistant/shared';

/** 缓存类别 */
type CacheCategory = 'summoner' | 'matchList' | 'matchDetail' | 'rankStats';

/** 缓存 store schema */
interface CacheSchema {
  cache: {
    summoner: Record<string, CacheEntry<unknown>>;
    matchList: Record<string, CacheEntry<unknown>>;
    matchDetail: Record<string, CacheEntry<unknown>>;
    rankStats: Record<string, CacheEntry<unknown>>;
  };
  /** LRU 访问顺序（key 格式: category:subKey） */
  lruOrder: string[];
  /** 应用设置持久化 */
  settings: Record<string, unknown>;
  /** 首次启动标记 */
  firstLaunchDone: boolean;
}

const DEFAULT_CACHE: CacheSchema['cache'] = {
  summoner: {},
  matchList: {},
  matchDetail: {},
  rankStats: {},
};

/**
 * 缓存存储管理器
 */
class CacheStore {
  private store: Store<CacheSchema>;

  constructor() {
    this.store = new Store<CacheSchema>({
      name: 'lcu-cache',
      defaults: {
        cache: DEFAULT_CACHE,
        lruOrder: [],
        settings: {},
        firstLaunchDone: false,
      },
    });
  }

  // ─── 缓存读写 ────────────────────────────────────────────

  /**
   * 获取缓存数据
   */
  get<T>(category: CacheCategory, key: string): T | null {
    const entry = this.store.get(`cache.${category}.${key}`) as CacheEntry<T> | undefined;
    if (!entry) return null;

    // 过期检查
    if (Date.now() > entry.expiresAt) {
      this.delete(category, key);
      return null;
    }

    // 更新 LRU
    this.touchLRU(`${category}:${key}`);

    return entry.data;
  }

  /**
   * 设置缓存数据
   */
  set<T>(category: CacheCategory, key: string, data: T): void {
    const ttl = CACHE_TTL[category] ?? 5 * 60 * 1000;

    // 不缓存 TTL 为 0 的数据
    if (ttl === 0) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // 检查条目数限制
    this.enforceMaxEntries(category);

    // 写入缓存
    this.store.set(`cache.${category}.${key}`, entry);

    // 更新 LRU
    this.touchLRU(`${category}:${key}`);

    // 检查总大小
    this.enforceTotalSize();
  }

  /**
   * 删除单条缓存
   */
  delete(category: CacheCategory, key: string): void {
    this.store.delete(`cache.${category}.${key}` as keyof CacheSchema);
    this.removeLRU(`${category}:${key}`);
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    this.store.set('cache', DEFAULT_CACHE);
    this.store.set('lruOrder', []);
    logger.info('缓存已全部清除');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const cache = this.store.get('cache');
    let entryCount = 0;

    for (const category of Object.keys(cache) as CacheCategory[]) {
      entryCount += Object.keys(cache[category]).length;
    }

    // 估算大小（JSON 序列化后的字节数）
    const totalSize = Buffer.byteLength(JSON.stringify(cache), 'utf-8');

    return { totalSize, entryCount };
  }

  // ─── 设置持久化 ──────────────────────────────────────────

  /**
   * 获取应用设置
   */
  getSetting<T>(key: string, defaultValue?: T): T {
    return (this.store.get(`settings.${key}`) as T) ?? (defaultValue as T);
  }

  /**
   * 设置应用设置
   */
  setSetting(key: string, value: unknown): void {
    this.store.set(`settings.${key}`, value);
  }

  // ─── 首次启动 ────────────────────────────────────────────

  /**
   * 是否首次启动
   */
  isFirstLaunch(): boolean {
    return !this.store.get('firstLaunchDone');
  }

  /**
   * 标记首次启动完成
   */
  setFirstLaunchDone(): void {
    this.store.set('firstLaunchDone', true);
  }

  // ─── LRU 管理 ────────────────────────────────────────────

  /**
   * 更新 LRU 访问顺序（移到末尾表示最近使用）
   */
  private touchLRU(lruKey: string): void {
    const order = this.store.get('lruOrder');
    const idx = order.indexOf(lruKey);
    if (idx !== -1) {
      order.splice(idx, 1);
    }
    order.push(lruKey);
    this.store.set('lruOrder', order);
  }

  /**
   * 从 LRU 列表移除
   */
  private removeLRU(lruKey: string): void {
    const order = this.store.get('lruOrder');
    const idx = order.indexOf(lruKey);
    if (idx !== -1) {
      order.splice(idx, 1);
      this.store.set('lruOrder', order);
    }
  }

  /**
   * 检查并执行条目数限制淘汰
   */
  private enforceMaxEntries(category: CacheCategory): void {
    const maxEntries = (CACHE_MAX_ENTRIES as Record<string, number>)[category];
    if (!maxEntries) return;

    const entries = this.store.get(`cache.${category}`) as Record<string, unknown>;
    const keys = Object.keys(entries);

    if (keys.length < maxEntries) return;

    // 从 LRU 列表中找到该类别最旧的条目并淘汰
    const order = this.store.get('lruOrder');
    const prefix = `${category}:`;

    for (const lruKey of order) {
      if (!lruKey.startsWith(prefix)) continue;

      const subKey = lruKey.slice(prefix.length);
      this.store.delete(`cache.${category}.${subKey}` as keyof CacheSchema);
      this.removeLRU(lruKey);

      const remainingKeys = Object.keys(
        this.store.get(`cache.${category}`) as Record<string, unknown>,
      );
      if (remainingKeys.length < maxEntries) break;
    }
  }

  /**
   * 检查并执行缓存总大小限制淘汰
   */
  private enforceTotalSize(): void {
    const cache = this.store.get('cache');
    let totalSize = Buffer.byteLength(JSON.stringify(cache), 'utf-8');

    if (totalSize <= CACHE_MAX_TOTAL_SIZE) return;

    logger.warn(`缓存总大小 (${(totalSize / 1024 / 1024).toFixed(2)}MB) 超过上限，执行 LRU 淘汰`);

    const order = this.store.get('lruOrder');

    // 从最旧的开始淘汰
    while (order.length > 0 && totalSize > CACHE_MAX_TOTAL_SIZE) {
      const oldest = order.shift()!;
      const [category, ...keyParts] = oldest.split(':');
      const key = keyParts.join(':');

      if (category && key) {
        this.store.delete(`cache.${category}.${key}` as keyof CacheSchema);
      }

      const updatedCache = this.store.get('cache');
      totalSize = Buffer.byteLength(JSON.stringify(updatedCache), 'utf-8');
    }

    this.store.set('lruOrder', order);
    logger.info(`LRU 淘汰完成，当前缓存大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  }
}

/** 全局缓存存储单例 */
export const cacheStore = new CacheStore();
