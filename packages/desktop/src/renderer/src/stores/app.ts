import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { ConnectionStatus, AppSettings, GamePhase, AppError } from '@lol-assistant/shared';

export const useAppStore = defineStore('app', () => {
  // Connection state
  const connectionStatus = ref<ConnectionStatus>('disconnected');
  const gamePhase = ref<GamePhase>('None');

  // Settings
  const settings = ref<AppSettings>({
    theme: 'dark',
    language: 'zh-CN',
    cacheEnabled: true,
    lanProxyEnabled: false,
    alwaysOnTop: false,
    miniMode: false,
    autoUpdate: true,
  });

  // UI state
  const sidebarCollapsed = ref(false);
  const error = ref<AppError | null>(null);
  const isFirstLaunch = ref(false);

  // Computed
  const isConnected = computed(() => connectionStatus.value === 'connected');
  const isConnecting = computed(() => connectionStatus.value === 'connecting');
  const isDarkTheme = computed(() => {
    if (settings.value.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return settings.value.theme === 'dark';
  });
  const isMiniMode = computed(() => settings.value.miniMode);

  // Actions
  function setConnectionStatus(status: ConnectionStatus) {
    connectionStatus.value = status;
  }

  function setGamePhase(phase: GamePhase) {
    gamePhase.value = phase;
  }

  function updateSettings(partial: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...partial };
  }

  function setError(err: AppError | null) {
    error.value = err;
  }

  function clearError() {
    error.value = null;
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function setFirstLaunch(value: boolean) {
    isFirstLaunch.value = value;
  }

  // Sync theme to DOM
  watch(isDarkTheme, (dark) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, { immediate: true });

  return {
    // State
    connectionStatus,
    gamePhase,
    settings,
    sidebarCollapsed,
    error,
    isFirstLaunch,

    // Computed
    isConnected,
    isConnecting,
    isDarkTheme,
    isMiniMode,

    // Actions
    setConnectionStatus,
    setGamePhase,
    updateSettings,
    setError,
    clearError,
    toggleSidebar,
    setFirstLaunch,
  };
});
