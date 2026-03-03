import type { CacheEntry } from '../types/common';

/**
 * 创建缓存条目
 */
export function createCacheEntry<T>(data: T, ttl: number): CacheEntry<T> {
  const now = Date.now();
  return {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  };
}

/**
 * 检查缓存条目是否过期
 */
export function isCacheExpired<T>(entry: CacheEntry<T> | null | undefined): boolean {
  if (!entry) return true;
  return Date.now() > entry.expiresAt;
}

/**
 * 从缓存条目中获取有效数据，过期则返回 null
 */
export function getCacheData<T>(entry: CacheEntry<T> | null | undefined): T | null {
  if (isCacheExpired(entry)) return null;
  return entry!.data;
}
