import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useMatchStore } from '@/stores/match';
import type { GamePhase } from '@lol-assistant/shared';

/**
 * 游戏通知组合式函数
 * 监听主进程推送的游戏阶段变化和对局结束事件
 * 实现：
 *  - 选人阶段自动跳转到选人助手
 *  - 对局开始自动跳转到对局分析
 *  - 对局结束自动刷新战绩
 */
export function useGameNotification() {
  const appStore = useAppStore();
  const matchStore = useMatchStore();
  const router = useRouter();

  let unsubPhase: (() => void) | null = null;
  let unsubMatchEnded: (() => void) | null = null;

  function handlePhaseChange(phase: string) {
    const gamePhase = phase as GamePhase;
    appStore.setGamePhase(gamePhase);

    const currentRoute = router.currentRoute.value;

    // 进入选人阶段 -> 跳转到选人助手
    if (gamePhase === 'ChampSelect') {
      if (currentRoute.name !== 'DraftAssistant') {
        router.push({ name: 'DraftAssistant' });
      }
    }

    // 对局开始 -> 跳转到对局分析
    if (gamePhase === 'InProgress' || gamePhase === 'GameStart') {
      if (currentRoute.name === 'DraftAssistant' || currentRoute.name === 'Home') {
        router.push({ name: 'LiveGame' });
      }
    }

    // 对局结束 -> 可选跳转回首页
    if (gamePhase === 'EndOfGame') {
      // 保留在当前页面，通知会在 match-ended handler 中处理
    }
  }

  function handleMatchEnded() {
    // 自动刷新战绩列表
    matchStore.fetchMatchList(true).catch(() => {
      // 静默失败
    });
  }

  onMounted(() => {
    unsubPhase = window.electronAPI.onGamePhaseChange(handlePhaseChange);
    unsubMatchEnded = window.electronAPI.onMatchEnded(handleMatchEnded);
  });

  onUnmounted(() => {
    unsubPhase?.();
    unsubMatchEnded?.();
  });
}
