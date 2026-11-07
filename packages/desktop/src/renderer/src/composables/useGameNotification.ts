import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import type { GamePhase } from '@lol-assistant/shared';

/**
 * 游戏通知组合式函数
 * 监听主进程推送的游戏阶段变化和对局结束事件
 * 实现：
 *  - 选人阶段自动跳转到选人助手
 *  - 对局开始自动跳转到对局分析
 *  - 战绩页面进入时自行请求最新分页
 */
export function useGameNotification() {
  const appStore = useAppStore();
  const router = useRouter();

  let unsubPhase: (() => void) | null = null;
  let unsubConnection: (() => void) | null = null;
  let requestGeneration = 0;

  async function hydrateClientState() {
    const generation = ++requestGeneration;
    try {
      const gameflow = await window.electronAPI.getGameflowState();
      if (generation === requestGeneration) handlePhaseChange(gameflow?.phase ?? 'None');
    } catch {
      // 客户端尚未连接时，等连接事件再读取。
    }
  }

  function handlePhaseChange(phase: string) {
    ++requestGeneration;
    const gamePhase = phase as GamePhase;
    if (gamePhase === appStore.gamePhase) return;
    appStore.setGamePhase(gamePhase);

    const currentRoute = router.currentRoute.value;

    // 进入选人阶段 -> 跳转到选人助手
    if (gamePhase === 'ChampSelect') {
      if (currentRoute.name !== 'DraftAssistant') {
        void router.push({ name: 'DraftAssistant' });
      }
    }

    // 对局开始 -> 跳转到对局分析
    if (gamePhase === 'InProgress' || gamePhase === 'GameStart') {
      if (currentRoute.name !== 'LiveGame') {
        void router.push({ name: 'LiveGame' });
      }
    }
  }

  onMounted(() => {
    unsubPhase = window.electronAPI.onGamePhaseChange(handlePhaseChange);
    unsubConnection = window.electronAPI.onConnectionChange((status) => {
      if (status === 'connected') {
        void hydrateClientState();
      } else if (status === 'disconnected') {
        handlePhaseChange('None');
      }
    });
    // 支持助手在选人过程中启动或刷新。
    void hydrateClientState();
  });

  onUnmounted(() => {
    ++requestGeneration;
    unsubPhase?.();
    unsubConnection?.();
  });
}
