import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useLiveGameStore } from '@/stores/live-game';
import { useAppStore } from '@/stores/app';
import { useRouter } from 'vue-router';

/**
 * 对局实时分析组合式函数
 * 自动订阅 LCU 游戏流程事件，在进入对局时自动获取分析数据
 * 支持从选人阶段到对局阶段的自动视图过渡
 */
export function useLiveGame() {
  const liveGameStore = useLiveGameStore();
  const appStore = useAppStore();
  const router = useRouter();

  let unsubLCU: (() => void) | null = null;
  let unsubPhase: (() => void) | null = null;
  const refreshing = ref(false);

  async function analyze() {
    refreshing.value = true;
    await liveGameStore.fetchLiveGame();
    refreshing.value = false;
  }

  function subscribeToGameFlow() {
    window.electronAPI.lcuSubscribe('/lol-gameflow/v1/session');

    unsubLCU = window.electronAPI.onLCUEvent((event: unknown) => {
      const evt = event as { uri?: string; data?: { phase?: string } };
      if (evt.uri === '/lol-gameflow/v1/session' && evt.data?.phase) {
        const phase = evt.data.phase;
        appStore.setGamePhase(phase as import('@lol-assistant/shared').GamePhase);

        if (phase === 'InProgress' || phase === 'GameStart') {
          analyze();
        }
      }
    });

    // Listen for game phase changes for auto-transition
    unsubPhase = window.electronAPI.onGamePhaseChange((phase: string) => {
      appStore.setGamePhase(phase as import('@lol-assistant/shared').GamePhase);

      // Auto-navigate to live game page when entering game
      if (phase === 'InProgress' || phase === 'GameStart') {
        const currentRoute = router.currentRoute.value;
        if (currentRoute.name === 'DraftAssistant') {
          router.push({ name: 'LiveGame' });
        }
        analyze();
      }

      // Clear data when game ends
      if (phase === 'EndOfGame' || phase === 'None' || phase === 'WaitingForStats') {
        liveGameStore.clear();
      }
    });
  }

  onMounted(() => {
    subscribeToGameFlow();

    // If already in a game, fetch immediately
    const phase = appStore.gamePhase;
    if (phase === 'InProgress' || phase === 'GameStart') {
      analyze();
    }
  });

  onUnmounted(() => {
    unsubLCU?.();
    unsubPhase?.();
    window.electronAPI.lcuUnsubscribe('/lol-gameflow/v1/session');
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
