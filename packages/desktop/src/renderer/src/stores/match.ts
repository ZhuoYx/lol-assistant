import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  MatchSummary,
  MatchDetail,
  MatchFilters,
  MatchListParams,
} from '@lol-assistant/shared';
import { useSummonerStore } from './summoner';

export const useMatchStore = defineStore('match', () => {
  const matchList = ref<MatchSummary[]>([]);
  const currentMatch = ref<MatchDetail | null>(null);
  const totalGames = ref(0);
  const loading = ref(false);
  const loadingDetail = ref(false);
  const error = ref<string | null>(null);

  const filters = ref<MatchFilters>({});

  const PAGE_SIZE = 20;
  const hasMore = ref(false);
  const paginationNotice = ref('');
  let nextIndex = 0;
  let seenPageIds = new Set<number>();

  let fetchId = 0;

  async function fetchMatchList(reset = false): Promise<boolean> {
    if (!reset && loading.value) return false;
    loading.value = true;
    error.value = null;
    const currentFetchId = ++fetchId;

    // reset 时立即清空旧数据，防止切换用户时短暂展示旧用户战绩
    if (reset) {
      matchList.value = [];
      totalGames.value = 0;
      nextIndex = 0;
      seenPageIds = new Set();
      hasMore.value = false;
      paginationNotice.value = '';
    }

    try {
      const summonerStore = useSummonerStore();
      const begIndex = reset ? 0 : nextIndex;
      const params: MatchListParams = {
        puuid: summonerStore.activePUUID,
        begIndex,
        endIndex: begIndex + PAGE_SIZE - 1,
        championId: filters.value.championId,
        queue: filters.value.queue,
      };

      const result = await window.electronAPI.getMatchList(params);

      if (currentFetchId !== fetchId) return false;

      const pageIds = result.pageGameIds ?? (result.matches ?? []).map((m) => m.gameId);
      const repeatsPage =
        begIndex > 0 && pageIds.length > 0 && pageIds.every((id) => seenPageIds.has(id));
      for (const id of pageIds) seenPageIds.add(id);
      nextIndex = result.nextIndex ?? begIndex + pageIds.length;
      hasMore.value =
        !repeatsPage && nextIndex > begIndex && (result.hasMore ?? pageIds.length >= PAGE_SIZE);
      if (repeatsPage)
        paginationNotice.value = '客户端重复返回已加载战绩，已停止翻页；当前大区可能限制更早记录。';

      if (reset) {
        matchList.value = result.matches ?? [];
      } else {
        const loadedIds = new Set(matchList.value.map((m) => m.gameId));
        matchList.value.push(
          ...(result.matches ?? []).filter((m) => {
            if (loadedIds.has(m.gameId)) return false;
            loadedIds.add(m.gameId);
            return true;
          }),
        );
      }
      totalGames.value = result.totalGames ?? 0;
      return true;
    } catch (e) {
      if (currentFetchId !== fetchId) return false;
      error.value = e instanceof Error ? e.message : '获取战绩失败';
      return false;
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
    ++fetchId;
    loading.value = false;
    nextIndex = 0;
    seenPageIds = new Set();
    hasMore.value = false;
    paginationNotice.value = '';
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
    paginationNotice,
    pageSize: PAGE_SIZE,
    fetchMatchList,
    fetchMatchDetail,
    setFilters,
    clear,
  };
});
