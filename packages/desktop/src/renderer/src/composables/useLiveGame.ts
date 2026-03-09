import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useLiveGameStore } from '@/stores/live-game';
import { useAppStore } from '@/stores/app';
import type { GamePhase } from '@lol-assistant/shared';

/**
 * 对局实时分析组合式函数
 * 监听游戏阶段变化事件，在进入对局时自动获取分析数据
 * 注意：视图过渡由 useGameNotification 统一管理
 */
export function useLiveGame() {
  const liveGameStore = useLiveGameStore();
  const appStore = useAppStore();

  let unsubPhase: (() => void) | null = null;
  const refreshing = ref(false);

  async function analyze() {
    refreshing.value = true;
    await liveGameStore.fetchLiveGame();
    refreshing.value = false;
  }

  function handlePhaseChange(phase: string) {
    const gamePhase = phase as GamePhase;

    // Auto-analyze when entering game
    if (gamePhase === 'InProgress' || gamePhase === 'GameStart') {
      analyze();
    }

    // Clear data when game ends
    if (gamePhase === 'EndOfGame' || gamePhase === 'None' || gamePhase === 'WaitingForStats') {
      liveGameStore.clear();
    }
  }

  onMounted(() => {
    unsubPhase = window.electronAPI.onGamePhaseChange(handlePhaseChange);

    // If already in a game, fetch immediately
    const phase = appStore.gamePhase;
    if (phase === 'InProgress' || phase === 'GameStart') {
      analyze();
    }
  });

  onUnmounted(() => {
    unsubPhase?.();
  });

  // 当页面停留在对局分析时，如果 gamePhase 变为 InProgress 也自动获取
  // 这处理了在页面已打开的状态下新对局开始的场景
  watch(() => appStore.gamePhase, (phase) => {
    if (phase === 'InProgress' || phase === 'GameStart') {
      if (!liveGameStore.hasData && !liveGameStore.loading) {
        analyze();
      }
    }
  });

  return {
    analysis: liveGameStore.analysis,
    loading: liveGameStore.loading,
    error: liveGameStore.error,
    hasData: liveGameStore.hasData,
    myTeam: liveGameStore.myTeam,
    enemyTeam: liveGameStore.enemyTeam,
    refreshing,
    analyze,
  };
}
