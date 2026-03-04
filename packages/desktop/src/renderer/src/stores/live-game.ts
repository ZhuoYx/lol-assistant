import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LiveGameAnalysis } from '@lol-assistant/shared';

export const useLiveGameStore = defineStore('live-game', () => {
  const analysis = ref<LiveGameAnalysis | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const hasData = computed(() => analysis.value !== null);
  const myTeam = computed(() => analysis.value?.teams?.find((t) => t.teamId === 100) ?? null);
  const enemyTeam = computed(() => analysis.value?.teams?.find((t) => t.teamId === 200) ?? null);

  async function fetchLiveGame() {
    loading.value = true;
    error.value = null;
    try {
      analysis.value = await window.electronAPI.analyzeLiveGame();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取对局分析失败';
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    analysis.value = null;
    error.value = null;
  }

  return {
    analysis,
    loading,
    error,
    hasData,
    myTeam,
    enemyTeam,
    fetchLiveGame,
    clear,
  };
});
