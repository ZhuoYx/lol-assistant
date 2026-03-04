import { useMatchStore } from '@/stores/match';
import type { MatchFilters } from '@lol-assistant/shared';

/**
 * 战绩历史组合式函数
 */
export function useMatchHistory() {
  const matchStore = useMatchStore();

  async function loadMatches(puuid?: string) {
    matchStore.setPUUID(puuid);
    await matchStore.fetchMatchList(true);
  }

  async function loadMore() {
    if (matchStore.hasMore && !matchStore.loading) {
      await matchStore.fetchMatchList(false);
    }
  }

  async function refresh() {
    await matchStore.fetchMatchList(true);
  }

  async function loadDetail(gameId: number) {
    await matchStore.fetchMatchDetail(gameId);
  }

  function applyFilters(filters: MatchFilters) {
    matchStore.setFilters(filters);
    matchStore.fetchMatchList(true);
  }

  return {
    matchList: matchStore.matchList,
    loading: matchStore.loading,
    hasMore: matchStore.hasMore,
    loadMatches,
    loadMore,
    refresh,
    loadDetail,
    applyFilters,
  };
}
