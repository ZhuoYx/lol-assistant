import { defineStore } from 'pinia';
import { ref, computed, watch, onScopeDispose } from 'vue';
import type { ConnectionStatus, AppSettings, GamePhase, AppError } from '@lol-assistant/shared';
import type { ChampionDataSource } from '@lol-assistant/shared';
import { wallpapers, type WallpaperId } from '@/styles/wallpapers';

export const useAppStore = defineStore('app', () => {
  // Connection state
  const connectionStatus = ref<ConnectionStatus>('disconnected');
  const gamePhase = ref<GamePhase>('None');

  // Settings
  const savedTheme = localStorage.getItem('lol-assistant-theme');
  const settings = ref<AppSettings>({
    theme: savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'light',
    language: 'zh-CN',
    cacheEnabled: true,
    lanProxyEnabled: false,
    alwaysOnTop: false,
    autoUpdate: true,
  });

  // UI state
  const championDataSource = ref<ChampionDataSource>('opgg');
  const savedWallpaper = localStorage.getItem('lol-assistant-wallpaper');
  const wallpaper = ref<WallpaperId>(
    wallpapers.some((w) => w.id === savedWallpaper) ? (savedWallpaper as WallpaperId) : 'anime',
  );
  watch(wallpaper, (value) => localStorage.setItem('lol-assistant-wallpaper', value));
  function readGlassSetting(key: string, fallback: number, min: number, max: number): number {
    const saved = localStorage.getItem(key);
    const value = saved === null ? fallback : Number(saved);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
  const glassTransparency = ref(readGlassSetting('lol-assistant-glass-transparency', 60, 20, 75));
  const glassBlur = ref(readGlassSetting('lol-assistant-glass-blur', 28, 12, 48));
  watch(
    [glassTransparency, glassBlur],
    ([transparency, blur]) => {
      localStorage.setItem('lol-assistant-glass-transparency', String(transparency));
      localStorage.setItem('lol-assistant-glass-blur', String(blur));
      document.documentElement.style.setProperty(
        '--glass-opacity',
        String((100 - transparency) / 100),
      );
      document.documentElement.style.setProperty('--glass-blur-radius', `${blur}px`);
    },
    { immediate: true },
  );
  const sidebarCollapsed = ref(false);
  const error = ref<AppError | null>(null);
  const isFirstLaunch = ref(false);

  // Update state
  const updateAvailable = ref(false);
  const updateVersion = ref<string | null>(null);
  const updateDownloaded = ref(false);

  // Computed
  const isConnected = computed(() => connectionStatus.value === 'connected');
  const isConnecting = computed(() => connectionStatus.value === 'connecting');
  const systemPrefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemThemeChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches;
  };
  systemThemeQuery.addEventListener('change', onSystemThemeChange);
  onScopeDispose(() => systemThemeQuery.removeEventListener('change', onSystemThemeChange));

  const isDarkTheme = computed(() =>
    settings.value.theme === 'system' ? systemPrefersDark.value : settings.value.theme === 'dark',
  );

  // Actions
  function setConnectionStatus(status: ConnectionStatus) {
    connectionStatus.value = status;
  }

  function setGamePhase(phase: GamePhase) {
    gamePhase.value = phase;
  }

  function updateSettings(partial: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...partial };
    if (partial.theme) {
      localStorage.setItem('lol-assistant-theme', partial.theme);
    }
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

  function setUpdateAvailable(version: string) {
    updateAvailable.value = true;
    updateVersion.value = version;
  }

  function setUpdateDownloaded() {
    updateDownloaded.value = true;
  }

  function clearUpdateState() {
    updateAvailable.value = false;
    updateVersion.value = null;
    updateDownloaded.value = false;
  }

  // Sync theme to DOM
  watch(
    isDarkTheme,
    (dark) => {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    },
    { immediate: true },
  );

  return {
    championDataSource,
    wallpaper,
    glassTransparency,
    glassBlur,
    // State
    connectionStatus,
    gamePhase,
    settings,
    sidebarCollapsed,
    error,
    isFirstLaunch,
    updateAvailable,
    updateVersion,
    updateDownloaded,

    // Computed
    isConnected,
    isConnecting,
    isDarkTheme,

    // Actions
    setConnectionStatus,
    setGamePhase,
    updateSettings,
    setError,
    clearError,
    toggleSidebar,
    setFirstLaunch,
    setUpdateAvailable,
    setUpdateDownloaded,
    clearUpdateState,
  };
});
