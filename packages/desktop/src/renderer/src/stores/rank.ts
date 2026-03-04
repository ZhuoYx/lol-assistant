import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RankStats } from '@lol-assistant/shared';

export const useRankStore = defineStore('rank', () => {
  const rankStats = ref<RankStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchRankStats(puuid: string) {
    loading.value = true;
    error.value = null;
    try {
      rankStats.value = await window.electronAPI.getRankStats(puuid);
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取排位信息失败';
    } finally {
      loading.value = false;
    }
  }

  function clear() {
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
