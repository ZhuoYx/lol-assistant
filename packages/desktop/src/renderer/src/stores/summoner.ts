import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Summoner } from '@lol-assistant/shared';

export const useSummonerStore = defineStore('summoner', () => {
  const currentSummoner = ref<Summoner | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchCurrentSummoner() {
    loading.value = true;
    error.value = null;
    try {
      currentSummoner.value = await window.electronAPI.getCurrentSummoner();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取召唤师信息失败';
      currentSummoner.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSummonerByPUUID(puuid: string): Promise<Summoner | null> {
    try {
      return await window.electronAPI.getSummonerById(puuid);
    } catch {
      return null;
    }
  }

  function clear() {
    currentSummoner.value = null;
    error.value = null;
  }

  return {
    currentSummoner,
    loading,
    error,
    fetchCurrentSummoner,
    fetchSummonerByPUUID,
    clear,
  };
});
