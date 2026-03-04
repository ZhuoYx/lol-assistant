import { onMounted, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useSummonerStore } from '@/stores/summoner';
import type { ConnectionStatus } from '@lol-assistant/shared';

/**
 * LCU 连接管理组合式函数
 * 自动订阅连接状态变化，onUnmounted 时清理
 * 注意：游戏阶段变化由 useGameNotification 统一管理
 */
export function useLCU() {
  const appStore = useAppStore();
  const summonerStore = useSummonerStore();

  let unsubConnection: (() => void) | null = null;

  async function connect() {
    appStore.setConnectionStatus('connecting');
    try {
      await window.electronAPI.lcuConnect();
      appStore.setConnectionStatus('connected');
      await summonerStore.fetchCurrentSummoner();
    } catch {
      appStore.setConnectionStatus('disconnected');
    }
  }

  async function disconnect() {
    await window.electronAPI.lcuDisconnect();
    appStore.setConnectionStatus('disconnected');
    summonerStore.clear();
  }

  async function checkStatus() {
    try {
      const status = await window.electronAPI.lcuGetStatus();
      appStore.setConnectionStatus(status);
      if (status === 'connected') {
        await summonerStore.fetchCurrentSummoner();
      }
    } catch {
      appStore.setConnectionStatus('disconnected');
    }
  }

  onMounted(() => {
    unsubConnection = window.electronAPI.onConnectionChange((status: ConnectionStatus) => {
      appStore.setConnectionStatus(status);
      if (status === 'connected') {
        summonerStore.fetchCurrentSummoner();
      } else if (status === 'disconnected') {
        summonerStore.clear();
      }
    });

    checkStatus();
  });

  onUnmounted(() => {
    unsubConnection?.();
  });

  return {
    connect,
    disconnect,
    checkStatus,
  };
}
