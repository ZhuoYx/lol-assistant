import { ref } from 'vue';
import type { CacheStats } from '@lol-assistant/shared';

/**
 * 缓存管理组合式函数
 */
export function useCache() {
  const stats = ref<CacheStats | null>(null);
  const loading = ref(false);

  async function fetchStats() {
    loading.value = true;
    try {
      stats.value = await window.electronAPI.getCacheStats();
    } catch {
      stats.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function clearCache() {
    loading.value = true;
    try {
      await window.electronAPI.clearCache();
      stats.value = { totalSize: 0, entryCount: 0 };
    } finally {
      loading.value = false;
    }
  }

  return {
    stats,
    loading,
    fetchStats,
    clearCache,
  };
}
