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
  const recentMatches = ref<MatchSummary[]>([]);
  const currentMatch = ref<MatchDetail | null>(null);
  const totalGames = ref(0);
  const loading = ref(false);
  const loadingRecent = ref(false);
  const loadingDetail = ref(false);
  const error = ref<string | null>(null);
  const recentError = ref<string | null>(null);
  const filters = ref<MatchFilters>({});
  const currentPage = ref(1);
  const hasMore = ref(false);
  const PAGE_SIZE = 10;
  let fetchId = 0;
  let recentFetchId = 0;
  let detailFetchId = 0;
  let queryKey = '';
  let historySource: 'lcu' | 'sgp' | undefined;
  let platformId: string | undefined;
  // Only IDs are retained for duplicate-page validation, never previous page data.
  const pageIds = new Map<number, number[]>();

  async function fetchMatchList(page = 1): Promise<boolean> {
    const puuid = useSummonerStore().activePUUID;
    const key = `${puuid}/${filters.value.queue ?? 'all'}/${filters.value.championId ?? 'all'}`;
    const changedQuery = key !== queryKey;
    if (changedQuery) {
      queryKey = key;
      matchList.value = [];
      currentPage.value = 1;
      hasMore.value = false;
    }
    if (changedQuery || page === 1) {
      pageIds.clear();
      historySource = undefined;
      platformId = undefined;
    }
    loading.value = true;
    error.value = null;
    const requestId = ++fetchId;
    const knownGameIds = [...pageIds.entries()]
      .filter(([p]) => p !== page)
      .flatMap(([, ids]) => ids);
    try {
      const begIndex = (page - 1) * PAGE_SIZE;
      const params: MatchListParams = {
        puuid,
        begIndex,
        endIndex: begIndex + PAGE_SIZE - 1,
        queue: filters.value.queue,
        championId: filters.value.championId,
        historySource,
        platformId,
        knownGameIds,
      };
      const result = await window.electronAPI.getMatchList(params);
      if (requestId !== fetchId) return false;
      const ids = result.pageGameIds ?? result.matches.map((m) => m.gameId);
      if (page > 1 && ids.length && ids.every((id) => knownGameIds.includes(id))) {
        throw new Error('战绩接口返回了重复页，已保留当前页，请重试');
      }
      matchList.value = result.matches;
      currentPage.value = page;
      hasMore.value = result.hasMore ?? ids.length === PAGE_SIZE;
      totalGames.value = result.totalGames;
      historySource = result.source;
      platformId = result.platformId;
      pageIds.set(page, ids);
      return true;
    } catch (e) {
      if (requestId === fetchId) error.value = e instanceof Error ? e.message : '获取战绩失败';
      return false;
    } finally {
      if (requestId === fetchId) loading.value = false;
    }
  }

  async function fetchRecentMatches() {
    const requestId = ++recentFetchId;
    loadingRecent.value = true;
    recentError.value = null;
    recentMatches.value = [];
    try {
      const result = await window.electronAPI.getMatchList({
        puuid: useSummonerStore().activePUUID,
        begIndex: 0,
        endIndex: 7,
      });
      if (requestId === recentFetchId) recentMatches.value = result.matches;
    } catch (e) {
      if (requestId === recentFetchId)
        recentError.value = e instanceof Error ? e.message : '获取最近战绩失败';
    } finally {
      if (requestId === recentFetchId) loadingRecent.value = false;
    }
  }

  async function fetchMatchDetail(gameId: number) {
    const requestId = ++detailFetchId;
    currentMatch.value = null;
    loadingDetail.value = true;
    try {
      const result = await window.electronAPI.getMatchDetail(gameId);
      if (requestId === detailFetchId) currentMatch.value = result;
    } catch (e) {
      if (requestId === detailFetchId)
        error.value = e instanceof Error ? e.message : '获取战绩详情失败';
    } finally {
      if (requestId === detailFetchId) loadingDetail.value = false;
    }
  }

  function setFilters(value: MatchFilters) {
    filters.value = value;
  }
  function clear() {
    ++fetchId;
    ++recentFetchId;
    ++detailFetchId;
    loading.value = loadingRecent.value = loadingDetail.value = false;
    matchList.value = [];
    recentMatches.value = [];
    currentMatch.value = null;
    totalGames.value = 0;
    currentPage.value = 1;
    hasMore.value = false;
    error.value = recentError.value = null;
    filters.value = {};
    queryKey = '';
    historySource = undefined;
    platformId = undefined;
    pageIds.clear();
  }
  return {
    matchList,
    recentMatches,
    currentMatch,
    totalGames,
    loading,
    loadingRecent,
    loadingDetail,
    error,
    recentError,
    filters,
    currentPage,
    hasMore,
    pageSize: PAGE_SIZE,
    fetchMatchList,
    fetchRecentMatches,
    fetchMatchDetail,
    setFilters,
    clear,
  };
});
