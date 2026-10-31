import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import type { GamePhase } from '@lol-assistant/shared';
import type { ChampSelectSession } from './useDraftAssistant';

const CHAMP_SELECT_URI = '/lol-champ-select/v1/session';
const GAMEFLOW_URI = '/lol-gameflow/v1/session';

/**
 * 游戏通知组合式函数
 * 监听主进程推送的游戏阶段变化和对局结束事件
 * 实现：
 *  - 选人阶段自动跳转到选人助手，海克斯大乱斗选好英雄后跳转到海克斯推荐
 *  - 对局开始自动跳转到对局分析
 *  - 战绩页面进入时自行请求最新分页
 */
export function useGameNotification() {
  const appStore = useAppStore();
  const router = useRouter();

  let unsubPhase: (() => void) | null = null;
  let unsubLCU: (() => void) | null = null;
  let unsubConnection: (() => void) | null = null;
  let queueId = 0;
  let session: ChampSelectSession | null = null;
  let lastMayhemChampionId = 0;
  let requestGeneration = 0;
  let queueRevision = 0;
  let sessionRevision = 0;
  let disposed = false;

  function syncMayhemChampion() {
    if (appStore.gamePhase !== 'ChampSelect' || queueId !== 2400) return;
    const championId = session?.myTeam.find(
      (member) => member.cellId === session?.localPlayerCellId,
    )?.championId;
    if (!championId || championId <= 0 || championId === lastMayhemChampionId) return;

    // 只在本人的英雄变化时跳转，计时器和队友更新不会打断手动浏览。
    lastMayhemChampionId = championId;
    const currentRoute = router.currentRoute.value;
    const target = { name: 'MayhemAugments', query: { championId: String(championId) } };
    if (currentRoute.name === 'MayhemAugments') {
      void router.replace({ ...target, query: { ...currentRoute.query, ...target.query } });
    } else {
      void router.push(target);
    }
  }

  async function hydrateClientState() {
    const generation = ++requestGeneration;
    const initialQueueRevision = queueRevision;
    const initialSessionRevision = sessionRevision;
    const [gameflow, champSelect] = await Promise.allSettled([
      window.electronAPI.getGameflowState(),
      window.electronAPI.getChampSelectSession(),
    ]);
    if (disposed || generation !== requestGeneration) return;

    if (gameflow.status === 'fulfilled' && initialQueueRevision === queueRevision) {
      handlePhaseChange(gameflow.value?.phase ?? 'None', false);
      queueId = gameflow.value?.queueId ?? 0;
    }
    if (champSelect.status === 'fulfilled' && initialSessionRevision === sessionRevision) {
      const data = champSelect.value as ChampSelectSession | null;
      session = appStore.gamePhase === 'ChampSelect' && Array.isArray(data?.myTeam) ? data : null;
    }
    syncMayhemChampion();
  }

  function handlePhaseChange(phase: string, hydrate = true) {
    const gamePhase = phase as GamePhase;
    if (gamePhase === appStore.gamePhase) return;
    appStore.setGamePhase(gamePhase);

    if (gamePhase !== 'ChampSelect') {
      ++requestGeneration;
      session = null;
      lastMayhemChampionId = 0;
    }
    if (['None', 'Lobby', 'Matchmaking', 'ReadyCheck'].includes(gamePhase)) queueId = 0;

    const currentRoute = router.currentRoute.value;

    // 进入选人阶段 -> 跳转到选人助手
    if (gamePhase === 'ChampSelect') {
      if (currentRoute.name !== 'DraftAssistant') {
        void router.push({ name: 'DraftAssistant' });
      }
      if (hydrate) void hydrateClientState();
    }

    // 对局开始 -> 跳转到对局分析
    if (gamePhase === 'InProgress' || gamePhase === 'GameStart') {
      if (currentRoute.name !== 'LiveGame') {
        void router.push({ name: 'LiveGame' });
      }
    }
  }

  function handleLCUEvent(event: unknown) {
    const evt = event as { uri?: string; eventType?: string; data?: unknown } | null;
    if (evt?.uri === GAMEFLOW_URI) {
      ++queueRevision;
      const data = evt.data as { phase?: string; gameData?: { queue?: { id?: number } } } | null;
      if (data?.phase) handlePhaseChange(data.phase);
      queueId = evt.eventType === 'Delete' ? 0 : (data?.gameData?.queue?.id ?? 0);
    } else if (evt?.uri === CHAMP_SELECT_URI) {
      ++sessionRevision;
      const data = evt.data as ChampSelectSession | null;
      session = evt.eventType !== 'Delete' && Array.isArray(data?.myTeam) ? data : null;
      if (evt.eventType === 'Delete') {
        ++requestGeneration;
        lastMayhemChampionId = 0;
      }
    } else {
      return;
    }
    syncMayhemChampion();
  }

  onMounted(() => {
    unsubPhase = window.electronAPI.onGamePhaseChange(handlePhaseChange);
    // 主进程已全局转发 LCU 事件，不随页面切换取消底层订阅。
    unsubLCU = window.electronAPI.onLCUEvent(handleLCUEvent);
    unsubConnection = window.electronAPI.onConnectionChange((status) => {
      if (status === 'connected') {
        void hydrateClientState();
      } else if (status === 'disconnected') {
        ++requestGeneration;
        queueId = 0;
        session = null;
        lastMayhemChampionId = 0;
        appStore.setGamePhase('None');
      }
    });
    // 支持助手在选人过程中启动或刷新。
    void hydrateClientState();
  });

  onUnmounted(() => {
    disposed = true;
    ++requestGeneration;
    unsubPhase?.();
    unsubLCU?.();
    unsubConnection?.();
  });
}
