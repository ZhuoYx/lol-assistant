import { onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLiveGameStore } from '@/stores/live-game';
import { useAppStore } from '@/stores/app';

/** 重试配置 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

/**
 * 对局实时分析组合式函数
 * 监听游戏阶段变化事件，在进入对局时自动获取分析数据
 * 注意：视图过渡由 useGameNotification 统一管理
 */
export function useLiveGame() {
  const liveGameStore = useLiveGameStore();
  const appStore = useAppStore();
  const { analysis, loading, error, hasData, myTeam, enemyTeam } = storeToRefs(liveGameStore);

  const refreshing = ref(false);
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let requestId = 0;

  function cancelAnalysis() {
    ++requestId;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    refreshing.value = false;
  }

  async function analyze(retryCount = 0) {
    cancelAnalysis();
    const id = requestId;
    refreshing.value = true;
    await liveGameStore.fetchLiveGame();
    if (id !== requestId) return;
    refreshing.value = false;

    // 如果获取失败且还有重试次数，延迟后重试
    if (liveGameStore.error && retryCount < MAX_RETRIES) {
      retryTimer = setTimeout(() => {
        void analyze(retryCount + 1);
      }, RETRY_DELAY_MS);
    }
  }

  watch(
    [() => appStore.isConnected, () => appStore.gamePhase],
    ([connected, phase]) => {
      cancelAnalysis();
      liveGameStore.clear();
      if (connected && (phase === 'ChampSelect' || phase === 'GameStart' || phase === 'InProgress')) {
        void analyze();
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    cancelAnalysis();
    liveGameStore.clear();
  });

  return {
    analysis,
    loading,
    error,
    hasData,
    myTeam,
    enemyTeam,
    refreshing,
    analyze,
  };
}
