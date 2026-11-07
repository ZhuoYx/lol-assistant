import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LiveGameAnalysis, LiveGameTeam } from '@lol-assistant/shared';

export const useLiveGameStore = defineStore('live-game', () => {
  const analysis = ref<LiveGameAnalysis | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let requestId = 0;

  const hasData = computed(() => analysis.value !== null);

  const blueTeam = computed<LiveGameTeam | null>(() =>
    analysis.value?.teams?.find((t) => t.teamId === 100) ?? null
  );

  const redTeam = computed<LiveGameTeam | null>(() =>
    analysis.value?.teams?.find((t) => t.teamId === 200) ?? null
  );

  // Alias for backward compat
  const myTeam = blueTeam;
  const enemyTeam = redTeam;

  /** Total loaded player count across both teams */
  const loadedPlayerCount = computed(() => {
    if (!analysis.value) return 0;
    return analysis.value.teams.reduce(
      (sum, team) => sum + team.players.filter((p) => p.dataStatus === 'loaded').length,
      0,
    );
  });

  /** Total player count */
  const totalPlayerCount = computed(() => {
    if (!analysis.value) return 0;
    return analysis.value.teams.reduce((sum, team) => sum + team.players.length, 0);
  });

  /** Whether any player data is still loading */
  const hasLoadingPlayers = computed(() => {
    if (!analysis.value) return false;
    return analysis.value.teams.some((team) =>
      team.players.some((p) => p.dataStatus === 'loading'),
    );
  });

  async function fetchLiveGame() {
    const id = ++requestId;
    loading.value = true;
    error.value = null;
    try {
      const result = await window.electronAPI.analyzeLiveGame();
      if (id === requestId) analysis.value = result;
    } catch (e) {
      if (id === requestId) error.value = e instanceof Error ? e.message : '获取对局分析失败';
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function clear() {
    ++requestId;
    analysis.value = null;
    error.value = null;
    loading.value = false;
  }

  return {
    analysis,
    loading,
    error,
    hasData,
    blueTeam,
    redTeam,
    myTeam,
    enemyTeam,
    loadedPlayerCount,
    totalPlayerCount,
    hasLoadingPlayers,
    fetchLiveGame,
    clear,
  };
});
