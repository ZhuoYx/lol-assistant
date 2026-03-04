import { useMatchStore } from '@/stores/match';
import { useSummonerStore } from '@/stores/summoner';
import type { MatchFilters } from '@lol-assistant/shared';

/**
 * 战绩历史组合式函数
 */
export function useMatchHistory() {
  const matchStore = useMatchStore();
  const summonerStore = useSummonerStore();

  async function loadMatches(puuid?: string) {
    if (puuid) {
      await summonerStore.switchPlayer(puuid);
    }
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
