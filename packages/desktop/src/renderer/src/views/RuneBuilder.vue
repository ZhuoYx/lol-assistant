<template>
  <div class="page rune-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">符文与出装</h1>
        <p class="page-subtitle">热门配置推荐 · 一键应用</p>
      </div>
      <div v-if="buildConfig" class="header-right">
        <div class="source-badge" :class="buildConfig.dataSource ?? 'local'">
          <span class="source-label">{{ sourceLabel }}</span>
          <span v-if="buildConfig.patch" class="source-version">v{{ buildConfig.patch }}</span>
        </div>
      </div>
    </header>

    <div class="rune-content">
      <!-- Not connected -->
      <EmptyState
        v-if="!appStore.isConnected"
        title="未连接客户端"
        description="请启动英雄联盟客户端以使用符文推荐"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </template>
      </EmptyState>

      <!-- Champion search -->
      <div v-else class="rune-main">
        <!-- Search bar -->
        <div class="search-section">
          <div class="search-bar">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="输入英雄名称搜索..."
              @focus="showDropdown = true"
            />
            <button v-if="searchQuery" class="search-clear" @click="clearSearch">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Dropdown results -->
          <div v-if="showDropdown && filteredChampions.length > 0" class="search-dropdown">
            <button
              v-for="champ in filteredChampions.slice(0, 8)"
              :key="champ.id"
              class="dropdown-item"
              @click="selectChampion(champ.id)"
            >
              <ChampionIcon :champion-id="champ.id" :name="champ.cnName" size="sm" />
              <div class="champ-info">
                <span class="champ-label">{{ champ.cnName || champ.name }}</span>
                <span v-if="champ.title" class="champ-title">{{ champ.title }}</span>
              </div>
            </button>
          </div>

          <!-- Click overlay to close dropdown -->
          <div v-if="showDropdown" class="dropdown-overlay" @click="showDropdown = false" />
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-section">
          <LoadingSpinner />
          <span class="loading-text">正在获取 {{ loadingChampName }} 的配置数据...</span>
        </div>

        <!-- Error -->
        <div v-else-if="error && !buildConfig" class="error-section">
          <div class="error-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span class="error-text">{{ error }}</span>
          </div>
        </div>

        <!-- No champion selected -->
        <div v-else-if="!buildConfig" class="start-screen">
          <!-- Favorite champions -->
          <div v-if="favoriteChampions.length > 0" class="favorites-section">
            <h3 class="section-title">收藏英雄</h3>
            <div class="favorites-grid">
              <div
                v-for="champ in favoriteChampions"
                :key="champ.id"
                class="favorite-item"
                @click="selectChampion(champ.id)"
              >
                <ChampionIcon :champion-id="champ.id" :name="champ.name" size="md" />
                <span class="favorite-name">{{ champ.name }}</span>
                <button class="favorite-remove" title="取消收藏" @click.stop="removeFavorite(champ.id)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty hint -->
          <EmptyState
            title="选择一个英雄"
            description="搜索或从选人阶段自动获取英雄配置"
          >
            <template #icon>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </template>
          </EmptyState>
        </div>

        <!-- Build content -->
        <div v-else class="build-layout">
          <!-- Champion header -->
          <div class="champion-header">
            <ChampionIcon
              :champion-id="buildConfig.championId"
              :name="buildConfig.championName"
              size="lg"
            />
            <div class="champion-info">
              <h2 class="champion-name">{{ buildConfig.championName }}</h2>
              <div class="champion-meta">
                <span v-if="buildConfig.role" class="meta-tag role-tag">{{ roleLabel(buildConfig.role) }}</span>
                <span class="meta-tag source-tag" :class="buildConfig.dataSource ?? 'local'">{{ sourceLabel }}</span>
              </div>
            </div>
            <button class="refresh-btn" :disabled="refreshing" :title="'刷新数据'" @click="refreshBuilds">
              <svg :class="{ spin: refreshing }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              class="favorite-btn"
              :class="{ 'is-fav': isFavorite(buildConfig.championId) }"
              :title="isFavorite(buildConfig.championId) ? '取消收藏' : '收藏英雄'"
              @click="toggleFavorite(buildConfig.championId)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" :fill="isFavorite(buildConfig.championId) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <div v-if="buildConfig.skillOrder?.length" class="skill-order">
              <span class="skill-label">技能加点</span>
              <div class="skill-keys">
                <span
                  v-for="(skill, idx) in buildConfig.skillOrder.slice(0, 4)"
                  :key="idx"
                  class="skill-key"
                  :class="{ primary: idx === 0 }"
                >{{ skill }}</span>
              </div>
            </div>
          </div>

          <!-- Two-column layout -->
          <div class="build-columns">
            <RuneDisplay
              :rune-builds="buildConfig.runeBuilds"
              :selected-index="selectedRuneIndex"
              :applying="applying"
              :apply-success="applySuccess"
              :apply-error="applyError"
              @select="selectRune"
              @apply="applyRune"
            />
            <ItemBuildDisplay
              :item-builds="buildConfig.itemBuilds"
              :selected-index="selectedItemIndex"
              @select="selectItem"
            />
          </div>

          <!-- Footer -->
          <div class="build-footer">
            <span class="footer-note">
              数据来源：
              <template v-if="buildConfig.dataSource === 'opgg'">OP.GG</template>
              <template v-else-if="buildConfig.dataSource === 'lolalytics'">Lolalytics</template>
              <template v-else>本地默认</template>
              <template v-if="buildConfig.patch"> · 版本 {{ buildConfig.patch }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '@/stores';
import { EmptyState, ChampionIcon, LoadingSpinner } from '@/components/common';
import RuneDisplay from '@/components/rune/RuneDisplay.vue';
import ItemBuildDisplay from '@/components/rune/ItemBuildDisplay.vue';
import { useRuneBuilder } from '@/composables/useRuneBuilder';
import { useFavoriteChampions } from '@/composables/useFavoriteChampions';
import { CHAMPION_ID_MAP, CHAMPION_CN_NAME_MAP, CHAMPION_TITLE_MAP, getChampionDisplayName } from '@lol-assistant/shared';

const route = useRoute();
const appStore = useAppStore();
const { isFavorite, toggleFavorite, favoriteIds, removeFavorite } = useFavoriteChampions();

const favoriteChampions = computed(() => {
  return favoriteIds.value.map((id) => ({
    id,
    name: getChampionDisplayName(id),
  }));
});

const {
  buildConfig,
  loading,
  refreshing,
  error,
  applying,
  applySuccess,
  applyError,
  selectedRuneIndex,
  selectedItemIndex,
  sourceLabel,
  currentChampionId,
  fetchBuilds,
  refreshBuilds,
  applyRune,
  selectRune,
  selectItem,
} = useRuneBuilder();

// Search
const searchQuery = ref('');
const showDropdown = ref(false);

// Champion list
const allChampions = computed(() => {
  return Object.entries(CHAMPION_ID_MAP)
    .map(([id, name]) => ({
      id: Number(id),
      name,
      cnName: CHAMPION_CN_NAME_MAP[Number(id)] ?? '',
      title: CHAMPION_TITLE_MAP[Number(id)] ?? '',
      displayName: getChampionDisplayName(Number(id)),
    }))
    .sort((a, b) => a.cnName.localeCompare(b.cnName, 'zh-CN'));
});

const filteredChampions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return allChampions.value;
  return allChampions.value.filter((c) =>
    c.name.toLowerCase().includes(q)
    || c.cnName.includes(q)
    || c.title.includes(q),
  );
});

const loadingChampName = computed(() => {
  if (currentChampionId.value) {
    return getChampionDisplayName(currentChampionId.value);
  }
  return '英雄';
});

function selectChampion(championId: number) {
  showDropdown.value = false;
  searchQuery.value = getChampionDisplayName(championId);
  fetchBuilds(championId);
}

function clearSearch() {
  searchQuery.value = '';
  showDropdown.value = false;
  buildConfig.value = null;
  currentChampionId.value = null;
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    top: '上单',
    jungle: '打野',
    mid: '中单',
    middle: '中单',
    adc: 'ADC',
    bottom: 'ADC',
    support: '辅助',
    utility: '辅助',
  };
  return map[role.toLowerCase()] ?? role;
}

// Auto-detect champion from champ-select
let unsubLCU: (() => void) | null = null;

function handleChampSelectEvent(event: unknown) {
  const evt = event as { uri?: string; eventType?: string; data?: unknown };
  if (evt.uri !== '/lol-champ-select/v1/session') return;
  if (evt.eventType === 'Delete') return;

  const data = evt.data as {
    localPlayerCellId?: number;
    myTeam?: Array<{ cellId: number; championId: number }>;
  };
  if (!data?.myTeam) return;

  const me = data.myTeam.find((m) => m.cellId === data.localPlayerCellId);
  if (me && me.championId > 0 && me.championId !== currentChampionId.value) {
    searchQuery.value = getChampionDisplayName(me.championId);
    fetchBuilds(me.championId);
  }
}

onMounted(() => {
  window.electronAPI.lcuSubscribe('/lol-champ-select/v1/session');
  unsubLCU = window.electronAPI.onLCUEvent(handleChampSelectEvent);

  // 从路由查询参数加载英雄（例如从首页收藏点击进入）
  const queryChampId = route.query.championId;
  if (queryChampId) {
    const champId = Number(queryChampId);
    if (champId > 0) {
      selectChampion(champId);
    }
  }
});

onUnmounted(() => {
  unsubLCU?.();
  window.electronAPI.lcuUnsubscribe('/lol-champ-select/v1/session');
});
</script>

<style scoped>
.rune-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.header-left {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.header-right {
  flex-shrink: 0;
}

/* Source badge */
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--color-bg-secondary);
}

.source-badge.opgg {
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-win);
}

.source-badge.lolalytics {
  background: rgba(168, 85, 247, 0.08);
  color: #a855f7;
}

.source-badge.local {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.source-label {
  color: inherit;
}

.source-version {
  font-family: var(--font-mono);
  opacity: 0.7;
}

/* Content */
.rune-content {
  min-height: 300px;
}

.rune-content > .empty-state {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rune-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Search section */
.search-section {
  position: relative;
  z-index: var(--z-dropdown);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-4);
  height: 44px;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  transition: all var(--transition-normal);
}

.search-bar:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
}

.search-icon {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-family: var(--font-family);
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-clear:hover {
  background: var(--color-bg-active);
  color: var(--color-text-primary);
}

.search-dropdown {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  right: 0;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: left;
}

.dropdown-item:hover {
  background: var(--color-bg-hover);
}

.champ-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.champ-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.champ-title {
  font-size: 11px;
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: -1;
}

/* Loading */
.start-screen {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.favorites-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  padding: var(--space-5);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-3);
}

.favorites-grid {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.favorite-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
}

.favorite-item:hover {
  background: var(--color-bg-hover);
}

.favorite-name {
  font-size: 10px;
  color: var(--color-text-secondary);
  max-width: 64px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  display: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-bg-active);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.favorite-item:hover .favorite-remove {
  display: flex;
}

.favorite-remove:hover {
  background: var(--color-error);
  color: #ffffff;
}

/* Loading */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-12) 0;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Error */
.error-section {
  padding: var(--space-3) 0;
}

.error-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 69, 58, 0.06);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 69, 58, 0.12);
}

.error-card svg {
  color: var(--color-error);
  flex-shrink: 0;
}

.error-text {
  font-size: var(--text-sm);
  color: var(--color-error);
}

/* Champion header */
.build-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.champion-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
}

.champion-info {
  flex: 1;
}

.champion-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.3px;
}

.champion-meta {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.meta-tag {
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: var(--font-medium);
}

.role-tag {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.source-tag.opgg {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-win);
}

.source-tag.lolalytics {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.source-tag.local {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

/* Skill order */
.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-bg-active);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.favorite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.favorite-btn:hover {
  background: var(--color-bg-active);
  color: var(--color-gold);
  border-color: var(--color-gold);
}

.favorite-btn.is-fav {
  color: var(--color-gold);
  border-color: var(--color-gold);
  background: rgba(255, 215, 0, 0.08);
}

.skill-order {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
}

.skill-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.skill-keys {
  display: flex;
  gap: var(--space-1);
}

.skill-key {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--color-text-secondary);
}

.skill-key.primary {
  background: var(--color-accent);
  color: #ffffff;
}

/* Two-column layout */
.build-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 768px) {
  .build-columns {
    grid-template-columns: 1fr;
  }
}

/* Footer */
.build-footer {
  display: flex;
  justify-content: center;
  padding: var(--space-2) 0;
}

.footer-note {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 0.8s linear infinite;
}
</style>
