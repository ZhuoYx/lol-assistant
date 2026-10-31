<template>
  <n-config-provider
    :theme="appStore.isDarkTheme ? darkTheme : undefined"
    :theme-overrides="appStore.isDarkTheme ? darkThemeOverrides : lightThemeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-global-style />
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <!-- Mini Mode Layout -->
          <div v-if="appStore.isMiniMode" class="mini-layout" :style="wallpaperStyle">
            <div class="app-backdrop" aria-hidden="true" />
            <div class="mini-titlebar">
              <span class="mini-title">LOL 助手</span>
              <div class="mini-controls">
                <button class="mini-btn" title="退出迷你模式" @click="exitMiniMode">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
                <button class="mini-btn" title="最小化到托盘" @click="minimizeToTray">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="mini-content">
              <router-view />
            </div>
          </div>

          <!-- Normal Mode Layout -->
          <div v-else class="app-layout" :style="wallpaperStyle">
            <div class="app-backdrop" aria-hidden="true" />
            <!-- Sidebar -->
            <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
              <div class="sidebar-header">
                <div class="sidebar-logo" @click="appStore.toggleSidebar">
                  <img class="brand-mascot" :src="poroIcon" alt="魄罗助手" />
                  <transition name="fade">
                    <span v-if="!appStore.sidebarCollapsed" class="logo-text">LOL 助手</span>
                  </transition>
                </div>
              </div>

              <!-- Search Box -->
              <div v-if="!appStore.sidebarCollapsed" class="sidebar-search">
                <div
                  class="search-wrapper"
                  :class="{ focused: searchFocused, loading: searchLoading }"
                >
                  <svg
                    class="search-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    ref="searchInputRef"
                    v-model="searchQuery"
                    class="search-input"
                    placeholder="搜索召唤师..."
                    @focus="searchFocused = true"
                    @blur="onSearchBlur"
                    @keydown.enter="handleSearch"
                  />
                  <svg
                    v-if="searchLoading"
                    class="search-spinner"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
                <div v-if="searchError" class="search-error">{{ searchError }}</div>
              </div>
              <div v-else class="sidebar-search-collapsed">
                <div class="nav-item" title="搜索召唤师" @click="expandAndFocusSearch">
                  <span class="nav-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </span>
                </div>
              </div>

              <nav class="sidebar-nav">
                <div
                  v-for="item in menuItems"
                  :key="item.path"
                  class="nav-item"
                  :class="{ active: currentRoute === item.path }"
                  :title="item.label"
                  @click="router.push(item.path)"
                >
                  <span class="nav-icon" v-html="item.icon" />
                  <transition name="fade">
                    <span v-if="!appStore.sidebarCollapsed" class="nav-label">{{
                      item.label
                    }}</span>
                  </transition>
                  <span v-if="item.badge && !appStore.sidebarCollapsed" class="nav-badge">
                    {{ item.badge }}
                  </span>
                </div>
              </nav>

              <div class="sidebar-footer">
                <div
                  class="nav-item"
                  :class="{ active: currentRoute === '/settings' }"
                  title="设置"
                  @click="router.push('/settings')"
                >
                  <span class="nav-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path
                        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                      />
                    </svg>
                  </span>
                  <transition name="fade">
                    <span v-if="!appStore.sidebarCollapsed" class="nav-label">设置</span>
                  </transition>
                </div>
              </div>
            </aside>

            <!-- Main Content -->
            <main class="main-area">
              <div class="content-wrapper">
                <router-view v-slot="{ Component }">
                  <component
                    :is="Component"
                    :key="recommendationPage ? appStore.championDataSource : undefined"
                  />
                </router-view>
              </div>

              <!-- Status Bar -->
              <footer class="status-bar">
                <div class="status-left">
                  <span class="status-indicator" :class="connectionClass" />
                  <span class="status-text">{{ connectionLabel }}</span>
                  <span v-if="summonerStore.currentSummoner" class="status-summoner">
                    {{ summonerStore.currentSummoner.displayName }}
                  </span>
                </div>
                <div class="status-right">
                  <span
                    v-if="appStore.updateAvailable && !appStore.updateDownloaded"
                    class="status-update"
                    @click="router.push('/settings')"
                  >
                    新版本 v{{ appStore.updateVersion }}
                  </span>
                  <span
                    v-if="appStore.updateDownloaded"
                    class="status-update status-update-ready"
                    @click="router.push('/settings')"
                  >
                    更新就绪，点击安装
                  </span>
                  <span v-if="appStore.gamePhase !== 'None'" class="status-phase">
                    {{ gamePhaseLabel }}
                  </span>
                </div>
              </footer>
            </main>
          </div>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NConfigProvider,
  NGlobalStyle,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
  darkTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui';
import { lightThemeOverrides, darkThemeOverrides } from '@/styles/theme';
import { useAppStore, useSummonerStore } from '@/stores';
import { useLCU } from '@/composables/useLCU';
import { useGameNotification } from '@/composables/useGameNotification';
import { wallpapers } from '@/styles/wallpapers';
import poroIcon from '@/assets/poro-companion.png';

const appStore = useAppStore();
const summonerStore = useSummonerStore();
const route = useRoute();
const router = useRouter();

useLCU();
useGameNotification();

let unsubUpdateAvailable: (() => void) | null = null;
let unsubUpdateStatus: (() => void) | null = null;

const currentRoute = computed(() => route.path);
const recommendationPage = computed(() =>
  ['/rune-builder', '/draft-assistant', '/live-game', '/champion-ranking'].includes(route.path),
);
const wallpaperStyle = computed(() => {
  const selected = wallpapers.find((w) => w.id === appStore.wallpaper);
  return { '--wallpaper-image': selected?.image ? `url("${selected.image}")` : 'none' };
});

// Search state
const searchQuery = ref('');
const searchFocused = ref(false);
const searchLoading = ref(false);
const searchError = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

function onSearchBlur() {
  setTimeout(() => {
    searchFocused.value = false;
    searchError.value = '';
  }, 200);
}

async function handleSearch() {
  const query = searchQuery.value.trim();
  if (!query) return;
  searchLoading.value = true;
  searchError.value = '';

  try {
    // 判断输入是否为 UUID 格式（PUUID），是则直接用 getById；否则按名称搜索
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    const summoner = isUUID
      ? await window.electronAPI.getSummonerById(query)
      : await window.electronAPI.searchSummoner(query);

    if (summoner && summoner.puuid) {
      searchQuery.value = '';
      router.push({ path: '/', query: { puuid: summoner.puuid } });
    } else {
      searchError.value = '未找到该召唤师';
    }
  } catch {
    searchError.value = '搜索失败，请检查名称格式';
  } finally {
    searchLoading.value = false;
  }
}

function expandAndFocusSearch() {
  appStore.sidebarCollapsed = false;
  nextTick(() => {
    searchInputRef.value?.focus();
  });
}

// Menu items with inline SVG icons
const menuItems = computed(() => {
  const isInGame = appStore.gamePhase === 'InProgress' || appStore.gamePhase === 'GameStart';
  const isInChampSelect = appStore.gamePhase === 'ChampSelect';

  return [
    {
      path: '/',
      label: '首页',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    },
    {
      path: '/match-history',
      label: '战绩',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>',
    },
    {
      path: '/live-game',
      label: '对局分析',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
      badge: isInGame ? 'LIVE' : undefined,
    },
    {
      path: '/draft-assistant',
      label: '选人助手',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      badge: isInChampSelect ? 'BP' : undefined,
    },
    {
      path: '/rune-builder',
      label: '符文出装',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    },
    {
      path: '/champion-ranking',
      label: '英雄排名',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17V3"/><path d="m17 8-5-5-5 5"/></svg>',
    },
    {
      path: '/mayhem-augments',
      label: '海克斯推荐',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m12 7 4 5-4 5-4-5Z"/></svg>',
    },
  ];
});

// Connection status
const connectionClass = computed(() => {
  switch (appStore.connectionStatus) {
    case 'connected':
      return 'connected';
    case 'connecting':
      return 'connecting';
    default:
      return 'disconnected';
  }
});

const connectionLabel = computed(() => {
  switch (appStore.connectionStatus) {
    case 'connected':
      return '已连接';
    case 'connecting':
      return '连接中...';
    default:
      return '未连接';
  }
});

const gamePhaseLabel = computed(() => {
  const map: Record<string, string> = {
    Lobby: '房间中',
    Matchmaking: '匹配中',
    ReadyCheck: '准备确认',
    ChampSelect: '英雄选择',
    GameStart: '对局开始',
    InProgress: '对局中',
    WaitingForStats: '等待结算',
    EndOfGame: '对局结束',
    Reconnect: '重新连接',
  };
  return map[appStore.gamePhase] ?? '';
});

function exitMiniMode() {
  appStore.updateSettings({ miniMode: false });
  window.electronAPI.setMiniMode(false);
}

function minimizeToTray() {
  window.electronAPI.minimizeToTray();
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'F5') {
    e.preventDefault();
    // Reload current page data
    router.replace(route.fullPath);
  }
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    window.electronAPI.minimizeToTray();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    router.back();
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);

  // Listen for update events
  unsubUpdateAvailable = window.electronAPI.onUpdateAvailable((info) => {
    appStore.setUpdateAvailable(info.version);
  });
  unsubUpdateStatus = window.electronAPI.onUpdateStatusChange((status) => {
    if (status === 'downloaded') {
      appStore.setUpdateDownloaded();
    }
  });

  // Check first launch
  try {
    const isFirst = await window.electronAPI.getIsFirstLaunch();
    if (isFirst) {
      appStore.setFirstLaunch(true);
      router.push('/welcome');
    }
  } catch {
    // ignore
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  unsubUpdateAvailable?.();
  unsubUpdateStatus?.();
});
</script>

<style scoped>
/* ============================
   Normal Layout
   ============================ */
.app-layout {
  position: relative;
  isolation: isolate;
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--app-canvas);
}

.app-backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--wallpaper-image);
  background-size: cover;
  background-position: center right;
}
.app-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--wallpaper-veil);
}
.brand-mascot {
  width: 34px;
  height: 34px;
  object-fit: contain;
  flex-shrink: 0;
}
/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  height: 100%;
  background-color: var(--color-bg-sidebar);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid var(--color-border-light);
  transition: width var(--transition-spring);
  z-index: 10;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}
.sidebar.collapsed .sidebar-header {
  padding: 0;
}
.sidebar.collapsed .sidebar-logo {
  padding: 0;
  width: 100%;
  justify-content: center;
}

.sidebar-header {
  height: 76px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-2);
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  padding: 0 var(--space-3);
  height: 38px;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
  color: var(--color-text-primary);
}

.sidebar-logo:hover {
  background-color: var(--color-bg-hover);
}

.logo-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
  flex-shrink: 0;
}

.logo-text {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  white-space: nowrap;
  letter-spacing: -0.3px;
}

/* Search */
.sidebar-search {
  padding: 0 var(--space-2) var(--space-2);
  flex-shrink: 0;
}

.sidebar-search-collapsed {
  padding: 0 var(--space-2);
  flex-shrink: 0;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  height: 32px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-hover);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.search-wrapper.focused {
  border-color: var(--color-accent);
  background-color: var(--color-bg-primary);
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.1);
}

.search-icon {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background-color: transparent;
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.search-spinner {
  flex-shrink: 0;
  color: var(--color-accent);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.search-error {
  font-size: 10px;
  color: var(--color-error);
  padding: var(--space-1) var(--space-3) 0;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-2);
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-3);
  height: 38px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  position: relative;
  white-space: nowrap;
  cursor: pointer;
}

.nav-item:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.nav-item.active {
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
  box-shadow: inset 3px 0 0 var(--color-accent);
}

.nav-item.active:hover {
  background-color: var(--color-accent-soft);
  color: var(--color-accent-hover);
}

.nav-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  letter-spacing: -0.1px;
}

.nav-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: var(--font-bold);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-error);
  color: #ffffff;
  letter-spacing: 0.5px;
}

.sidebar-footer {
  padding: var(--space-2);
  border-top: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

/* Main Area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--page-padding);
  min-width: 0;
  min-height: 0;
  container: workspace / inline-size;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

/* Status Bar */
.status-bar {
  height: var(--statusbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background-color: var(--color-bg-sidebar);
  backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--color-border-light);
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-indicator {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.status-indicator.connected {
  background-color: var(--color-success);
  box-shadow: 0 0 6px rgba(48, 209, 88, 0.4);
}

.status-indicator.connecting {
  background-color: var(--color-warning);
  animation: pulse 1.5s ease infinite;
}

.status-indicator.disconnected {
  background-color: var(--color-text-placeholder);
}

.status-text {
  font-weight: var(--font-medium);
}

.status-summoner {
  color: var(--color-text-secondary);
  padding-left: var(--space-2);
  border-left: 1px solid var(--color-border);
}

.status-phase {
  font-weight: var(--font-medium);
  color: var(--color-accent);
}

.status-update {
  font-weight: var(--font-medium);
  color: var(--color-accent);
  cursor: pointer;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background-color: rgba(10, 132, 255, 0.1);
  transition: background var(--transition-fast);
}

.status-update:hover {
  background-color: rgba(10, 132, 255, 0.2);
}

.status-update-ready {
  color: var(--color-success);
  background-color: rgba(48, 209, 88, 0.1);
}

.status-update-ready:hover {
  background-color: rgba(48, 209, 88, 0.2);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ============================
   Mini Mode Layout
   ============================ */
.mini-layout {
  position: relative;
  isolation: isolate;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--app-canvas);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.mini-titlebar {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.mini-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  letter-spacing: -0.2px;
}

.mini-controls {
  display: flex;
  gap: var(--space-1);
}

.mini-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);
}

.mini-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.mini-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  min-height: 0;
  container: workspace / inline-size;
  padding: var(--space-2);
}
</style>
