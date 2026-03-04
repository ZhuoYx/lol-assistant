import { onMounted, onUnmounted } from 'vue';
import { useLiveGameStore } from '@/stores/live-game';
import { useAppStore } from '@/stores/app';

/**
 * 对局实时分析组合式函数
 * 自动订阅 LCU 游戏流程事件，在进入对局时自动获取分析数据
 */
export function useLiveGame() {
  const liveGameStore = useLiveGameStore();
  const appStore = useAppStore();

  let unsubLCU: (() => void) | null = null;

  async function analyze() {
    await liveGameStore.fetchLiveGame();
  }

  function subscribeToGameFlow() {
    window.electronAPI.lcuSubscribe('/lol-gameflow/v1/session');

    unsubLCU = window.electronAPI.onLCUEvent((event: unknown) => {
      const evt = event as { uri?: string; data?: { phase?: string } };
      if (evt.uri === '/lol-gameflow/v1/session' && evt.data?.phase) {
        const phase = evt.data.phase;
        if (phase === 'InProgress' || phase === 'GameStart') {
          analyze();
        }
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
    window.electronAPI.lcuUnsubscribe('/lol-gameflow/v1/session');
  });

  return {
    analysis: liveGameStore.analysis,
    loading: liveGameStore.loading,
    error: liveGameStore.error,
    analyze,
  };
}
