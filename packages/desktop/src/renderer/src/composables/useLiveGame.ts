import { onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLiveGameStore } from '@/stores/live-game';
import { useAppStore } from '@/stores/app';
import type { GamePhase } from '@lol-assistant/shared';

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

  let unsubPhase: (() => void) | null = null;
  const refreshing = ref(false);
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  async function analyze(retryCount = 0) {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    refreshing.value = true;
    await liveGameStore.fetchLiveGame();
    refreshing.value = false;

    // 如果获取失败且还有重试次数，延迟后重试
    if (liveGameStore.error && retryCount < MAX_RETRIES) {
      retryTimer = setTimeout(() => {
        analyze(retryCount + 1);
      }, RETRY_DELAY_MS);
    }
  }

  function handlePhaseChange(phase: string) {
    const gamePhase = phase as GamePhase;

    // Auto-analyze when entering game (always re-fetch, clear previous data)
    if (gamePhase === 'InProgress' || gamePhase === 'GameStart') {
      liveGameStore.clear();
      analyze();
    }

    // Clear data when game ends
    if (gamePhase === 'EndOfGame' || gamePhase === 'None' || gamePhase === 'WaitingForStats') {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      liveGameStore.clear();
    }
  }

  onMounted(() => {
    unsubPhase = window.electronAPI.onGamePhaseChange(handlePhaseChange);

    // If already in a game, always fetch fresh data (even if we had old data)
    // This fixes the issue where switching tabs doesn't refresh data
    const phase = appStore.gamePhase;
    if (phase === 'InProgress' || phase === 'GameStart') {
      analyze();
    }
  });

  onUnmounted(() => {
    unsubPhase?.();
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  });

  // 当页面停留在对局分析时，如果 gamePhase 变为 InProgress 也自动获取
  // 这处理了在页面已打开的状态下新对局开始的场景
  watch(
    () => appStore.gamePhase,
    (phase, oldPhase) => {
      if (phase === 'InProgress' || phase === 'GameStart') {
        // 从 ChampSelect 进入对局，或当前没数据，都重新获取
        if (oldPhase === 'ChampSelect' || !liveGameStore.hasData) {
          liveGameStore.clear();
          analyze();
        }
      }
    },
  );

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
