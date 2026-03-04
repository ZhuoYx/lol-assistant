import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ChampionBuilds, ChampionCounters } from '@lol-assistant/shared';

export const useChampionStore = defineStore('champion', () => {
  const championBuilds = ref<ChampionBuilds | null>(null);
  const championCounters = ref<ChampionCounters | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const selectedChampionId = ref<number | null>(null);

  const hasData = computed(() => championBuilds.value !== null || championCounters.value !== null);

  async function fetchChampionBuilds(championId: number) {
    loading.value = true;
    error.value = null;
    selectedChampionId.value = championId;
    try {
      championBuilds.value = await window.electronAPI.getChampionBuilds(championId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取英雄构建数据失败';
    } finally {
      loading.value = false;
    }
  }

  async function fetchChampionCounters(championId: number) {
    try {
      championCounters.value = await window.electronAPI.getChampionCounters(championId);
    } catch {
      championCounters.value = null;
    }
  }

  function clear() {
    championBuilds.value = null;
    championCounters.value = null;
    selectedChampionId.value = null;
    error.value = null;
  }

  return {
    championBuilds,
    championCounters,
    loading,
    error,
    selectedChampionId,
    hasData,
    fetchChampionBuilds,
    fetchChampionCounters,
    clear,
  };
});
