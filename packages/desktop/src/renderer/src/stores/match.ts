import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MatchSummary, MatchDetail, MatchFilters, MatchListParams } from '@lol-assistant/shared';

export const useMatchStore = defineStore('match', () => {
  const matchList = ref<MatchSummary[]>([]);
  const currentMatch = ref<MatchDetail | null>(null);
  const totalGames = ref(0);
  const loading = ref(false);
  const loadingDetail = ref(false);
  const error = ref<string | null>(null);

  const filters = ref<MatchFilters>({});
  const currentPUUID = ref<string | undefined>(undefined);

  const PAGE_SIZE = 20;
  const hasMore = computed(() => matchList.value.length < totalGames.value);

  async function fetchMatchList(reset = false) {
    if (loading.value) return;
    loading.value = true;
    error.value = null;

    try {
      const begIndex = reset ? 0 : matchList.value.length;
      const params: MatchListParams = {
        puuid: currentPUUID.value,
        begIndex,
        endIndex: begIndex + PAGE_SIZE,
        championId: filters.value.championId,
        queue: filters.value.queue,
      };

      const result = await window.electronAPI.getMatchList(params);

      if (reset) {
        matchList.value = result.matches;
      } else {
        matchList.value.push(...result.matches);
      }
      totalGames.value = result.totalGames;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取战绩失败';
    } finally {
      loading.value = false;
    }
  }

  async function fetchMatchDetail(gameId: number) {
    loadingDetail.value = true;
    try {
      currentMatch.value = await window.electronAPI.getMatchDetail(gameId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取战绩详情失败';
    } finally {
      loadingDetail.value = false;
    }
  }

  function setFilters(newFilters: MatchFilters) {
    filters.value = newFilters;
  }

  function setPUUID(puuid?: string) {
    currentPUUID.value = puuid;
  }

  function clear() {
    matchList.value = [];
    currentMatch.value = null;
    totalGames.value = 0;
    error.value = null;
    filters.value = {};
    currentPUUID.value = undefined;
  }

  return {
    matchList,
    currentMatch,
    totalGames,
    loading,
    loadingDetail,
    error,
    filters,
    currentPUUID,
    hasMore,
    fetchMatchList,
    fetchMatchDetail,
    setFilters,
    setPUUID,
    clear,
  };
});
