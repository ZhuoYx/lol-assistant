import { ref } from 'vue';
import type { ScraperDataVersion, ChampionBuilds, ChampionCounters } from '@lol-assistant/shared';

/**
 * 第三方爬取数据组合式函数
 */
export function useScraperData() {
  const dataVersion = ref<ScraperDataVersion | null>(null);
  const loading = ref(false);
  const updating = ref(false);

  async function fetchDataVersion() {
    try {
      dataVersion.value = await window.electronAPI.getScraperDataVersion();
    } catch {
      dataVersion.value = null;
    }
  }

  async function updateData() {
    updating.value = true;
    try {
      await window.electronAPI.updateScraperData();
      await fetchDataVersion();
    } finally {
      updating.value = false;
    }
  }

  async function getChampionBuilds(championId: number): Promise<ChampionBuilds | null> {
    loading.value = true;
    try {
      return await window.electronAPI.getChampionBuilds(championId);
    } catch {
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function getChampionCounters(championId: number): Promise<ChampionCounters | null> {
    try {
      return await window.electronAPI.getChampionCounters(championId);
    } catch {
      return null;
    }
  }

  return {
    dataVersion,
    loading,
    updating,
    fetchDataVersion,
    updateData,
    getChampionBuilds,
    getChampionCounters,
  };
}
