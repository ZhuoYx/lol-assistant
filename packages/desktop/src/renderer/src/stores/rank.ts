import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RankStats } from '@lol-assistant/shared';

export const useRankStore = defineStore('rank', () => {
  const rankStats = ref<RankStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let fetchId = 0;

  async function fetchRankStats(puuid: string) {
    loading.value = true;
    error.value = null;
    const currentFetchId = ++fetchId;

    // 立即清空旧数据，避免切换用户时短暂展示旧数据
    rankStats.value = null;

    try {
      const result = await window.electronAPI.getRankStats(puuid);
      // 竞态保护：如果在请求期间又发起了新请求，丢弃旧结果
      if (currentFetchId !== fetchId) return;
      rankStats.value = result;
    } catch (e) {
      if (currentFetchId !== fetchId) return;
      error.value = e instanceof Error ? e.message : '获取排位信息失败';
    } finally {
      if (currentFetchId === fetchId) {
        loading.value = false;
      }
    }
  }

  function clear() {
    fetchId++;
    rankStats.value = null;
    error.value = null;
  }

  return {
    rankStats,
    loading,
    error,
    fetchRankStats,
    clear,
  };
});
