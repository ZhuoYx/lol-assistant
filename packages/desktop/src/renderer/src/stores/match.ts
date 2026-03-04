import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MatchSummary, MatchDetail, MatchFilters, MatchListParams } from '@lol-assistant/shared';
import { useSummonerStore } from './summoner';

export const useMatchStore = defineStore('match', () => {
  const matchList = ref<MatchSummary[]>([]);
  const currentMatch = ref<MatchDetail | null>(null);
  const totalGames = ref(0);
  const loading = ref(false);
  const loadingDetail = ref(false);
  const error = ref<string | null>(null);

  const filters = ref<MatchFilters>({});

  const PAGE_SIZE = 50;
  const hasMore = computed(() => matchList.value.length < totalGames.value);

  let fetchId = 0;

  async function fetchMatchList(reset = false) {
    if (!reset && loading.value) return;
    loading.value = true;
    error.value = null;
    const currentFetchId = ++fetchId;

    // reset 时立即清空旧数据，防止切换用户时短暂展示旧用户战绩
    if (reset) {
      matchList.value = [];
      totalGames.value = 0;
    }

    try {
      const summonerStore = useSummonerStore();
      const begIndex = reset ? 0 : matchList.value.length;
      const params: MatchListParams = {
        puuid: summonerStore.activePUUID,
        begIndex,
        endIndex: begIndex + PAGE_SIZE,
        championId: filters.value.championId,
        queue: filters.value.queue,
      };

      const result = await window.electronAPI.getMatchList(params);

      if (currentFetchId !== fetchId) return;

      if (reset) {
        matchList.value = result.matches ?? [];
      } else {
        matchList.value.push(...(result.matches ?? []));
      }
      totalGames.value = result.totalGames ?? 0;
    } catch (e) {
      if (currentFetchId !== fetchId) return;
      error.value = e instanceof Error ? e.message : '获取战绩失败';
    } finally {
      if (currentFetchId === fetchId) {
        loading.value = false;
      }
    }
  }

  async function fetchMatchDetail(gameId: number) {
    loadingDetail.value = true;
    try {
      const result = await window.electronAPI.getMatchDetail(gameId);
      console.log('[matchStore] fetchMatchDetail result:', gameId, result);
      console.log('[matchStore] participants count:', result?.participants?.length ?? 0);
      if (result?.participants?.length > 0) {
        console.log('[matchStore] first participant:', JSON.stringify(result.participants[0]));
      }
      currentMatch.value = result;
    } catch (e) {
      console.error('[matchStore] fetchMatchDetail error:', e);
      error.value = e instanceof Error ? e.message : '获取战绩详情失败';
    } finally {
      loadingDetail.value = false;
    }
  }

  function setFilters(newFilters: MatchFilters) {
    filters.value = newFilters;
  }

  function clear() {
    matchList.value = [];
    currentMatch.value = null;
    totalGames.value = 0;
    error.value = null;
    filters.value = {};
  }

  return {
    matchList,
    currentMatch,
    totalGames,
    loading,
    loadingDetail,
    error,
    filters,
    hasMore,
    fetchMatchList,
    fetchMatchDetail,
    setFilters,
    clear,
  };
});
