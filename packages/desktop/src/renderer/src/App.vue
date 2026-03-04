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
          <div v-if="appStore.isMiniMode" class="mini-layout">
            <div class="mini-titlebar drag-region">
              <span class="mini-title">LOL 助手</span>
              <div class="mini-controls no-drag">
                <button class="mini-btn" title="退出迷你模式" @click="exitMiniMode">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
                <button class="mini-btn" title="最小化到托盘" @click="minimizeToTray">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="mini-content">
              <router-view v-slot="{ Component }">
                <transition name="fade" mode="out-in">
                  <component :is="Component" />
                </transition>
              </router-view>
            </div>
          </div>

          <!-- Normal Mode Layout -->
          <div v-else class="app-layout">
            <!-- Sidebar -->
            <aside
              class="sidebar"
              :class="{ collapsed: appStore.sidebarCollapsed }"
            >
              <div class="sidebar-header drag-region">
                <div class="sidebar-logo no-drag" @click="appStore.toggleSidebar">
                  <div class="logo-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <transition name="fade">
                    <span v-if="!appStore.sidebarCollapsed" class="logo-text">LOL 助手</span>
                  </transition>
                </div>
              </div>

              <nav class="sidebar-nav">
                <router-link
                  v-for="item in menuItems"
                  :key="item.path"
                  :to="item.path"
                  class="nav-item no-drag"
                  :class="{ active: currentRoute === item.path }"
                  :title="item.label"
                >
                  <span class="nav-icon" v-html="item.icon" />
                  <transition name="fade">
                    <span v-if="!appStore.sidebarCollapsed" class="nav-label">{{ item.label }}</span>
                  </transition>
                  <span
                    v-if="item.badge && !appStore.sidebarCollapsed"
                    class="nav-badge"
                  >
                    {{ item.badge }}
                  </span>
                </router-link>
              </nav>

              <div class="sidebar-footer no-drag">
                <router-link
                  to="/settings"
                  class="nav-item"
                  :class="{ active: currentRoute === '/settings' }"
                  title="设置"
                >
                  <span class="nav-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </span>
                  <transition name="fade">
                    <span v-if="!appStore.sidebarCollapsed" class="nav-label">设置</span>
                  </transition>
                </router-link>
              </div>
            </aside>

            <!-- Main Content -->
            <main class="main-area">
              <div class="content-wrapper">
                <router-view v-slot="{ Component }">
                  <transition name="slide" mode="out-in">
                    <component :is="Component" />
                  </transition>
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
import { computed, onMounted, onUnmounted } from 'vue';
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

const appStore = useAppStore();
const summonerStore = useSummonerStore();
const route = useRoute();
const router = useRouter();

useLCU();

const currentRoute = computed(() => route.path);

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
      path: '/rank',
      label: '排位',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    },
    {
      path: '/champion-stats',
      label: '英雄',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
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
  ];
});

// Connection status
const connectionClass = computed(() => {
  switch (appStore.connectionStatus) {
    case 'connected': return 'connected';
    case 'connecting': return 'connecting';
    default: return 'disconnected';
  }
});

const connectionLabel = computed(() => {
  switch (appStore.connectionStatus) {
    case 'connected': return '已连接';
    case 'connecting': return '连接中...';
    default: return '未连接';
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
});
</script>

<style scoped>
/* ============================
   Normal Layout
   ============================ */
.app-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-secondary);
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  height: 100%;
  background: var(--color-bg-sidebar);
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

.sidebar-header {
  height: var(--titlebar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
  color: var(--color-text-primary);
}

.sidebar-logo:hover {
  background: var(--color-bg-hover);
}

.logo-icon {
  width: 28px;
  height: 28px;
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
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-accent);
  color: #ffffff;
}

.nav-item.active:hover {
  background: var(--color-accent-hover);
  color: #ffffff;
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
  background: var(--color-error);
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
  padding: var(--space-6);
}

/* Status Bar */
.status-bar {
  height: var(--statusbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background: var(--color-bg-primary);
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
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(48, 209, 88, 0.4);
}

.status-indicator.connecting {
  background: var(--color-warning);
  animation: pulse 1.5s ease infinite;
}

.status-indicator.disconnected {
  background: var(--color-text-placeholder);
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

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ============================
   Mini Mode Layout
   ============================ */
.mini-layout {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.mini-titlebar {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  background: var(--color-bg-secondary);
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
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);
}

.mini-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.mini-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}
</style>
