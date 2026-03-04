<template>
  <div class="page champion-stats-page">
    <header class="page-header">
      <h1 class="page-title">英雄统计</h1>
      <p class="page-subtitle">查看英雄使用数据与熟练度</p>
    </header>

    <!-- Search & Sort -->
    <div class="toolbar">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索英雄..."
        />
      </div>
      <div class="sort-group">
        <button
          v-for="s in sortOptions"
          :key="s.value"
          class="sort-chip"
          :class="{ active: sortBy === s.value }"
          @click="sortBy = s.value"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="champion-layout">
      <!-- Champion List -->
      <div class="champion-list-panel">
        <LoadingSpinner v-if="loading" size="lg" text="加载英雄数据..." centered />

        <ErrorDisplay
          v-else-if="error"
          :message="error"
          retryable
          @retry="fetchData"
        />

        <div v-else-if="sortedStats.length > 0" class="champion-list">
          <ChampionStatsItem
            v-for="(stat, index) in sortedStats"
            :key="stat.championId"
            :stat="stat"
            :rank="index + 1"
            :selected="selectedChampionId === stat.championId"
            @select="onSelectChampion"
          />
        </div>

        <EmptyState
          v-else
          :title="searchQuery ? '未找到匹配的英雄' : '暂无英雄数据'"
          :description="searchQuery ? '尝试其他搜索关键词' : '连接客户端后显示英雄统计'"
        >
          <template #icon>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </template>
        </EmptyState>
      </div>

      <!-- Champion Detail -->
      <div class="champion-detail-panel">
        <ChampionDetail :stat="selectedStat" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { ChampionStats } from '@lol-assistant/shared';
import { useAppStore, useSummonerStore } from '@/stores';
import { LoadingSpinner, EmptyState, ErrorDisplay } from '@/components/common';
import ChampionStatsItem from '@/components/champion/ChampionStatsItem.vue';
import ChampionDetail from '@/components/champion/ChampionDetail.vue';

const appStore = useAppStore();
const summonerStore = useSummonerStore();

const championStats = ref<ChampionStats[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const sortBy = ref<'games' | 'winrate' | 'kda'>('games');
const selectedChampionId = ref<number | null>(null);

const sortOptions = [
  { label: '场次', value: 'games' as const },
  { label: '胜率', value: 'winrate' as const },
  { label: 'KDA', value: 'kda' as const },
];

const filteredStats = computed(() => {
  if (!searchQuery.value) return championStats.value;
  const q = searchQuery.value.toLowerCase();
  return championStats.value.filter((s) =>
    s.championName.toLowerCase().includes(q),
  );
});

const sortedStats = computed(() => {
  const list = [...filteredStats.value];
  switch (sortBy.value) {
    case 'winrate':
      return list.sort((a, b) => b.winRate - a.winRate);
    case 'kda':
      return list.sort((a, b) => b.avgKDA - a.avgKDA);
    default:
      return list.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  }
});

const selectedStat = computed(() =>
  championStats.value.find((s) => s.championId === selectedChampionId.value) ?? null,
);

function onSelectChampion(id: number) {
  selectedChampionId.value = id;
}

async function fetchData() {
  const puuid = summonerStore.activePUUID;
  if (!puuid) return;

  loading.value = true;
  error.value = null;
  try {
    const api = await import('@/api');
    championStats.value = await api.getAPIProvider().getChampionStats(puuid);
    if (championStats.value.length > 0 && !selectedChampionId.value) {
      selectedChampionId.value = championStats.value[0].championId;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取英雄统计失败';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (appStore.isConnected && summonerStore.activePUUID) {
    fetchData();
  }
});

// 用户切换时（activePUUID 变化），重新拉取英雄数据
watch(() => summonerStore.activePUUID, (newPUUID, oldPUUID) => {
  if (newPUUID && newPUUID !== oldPUUID) {
    championStats.value = [];
    selectedChampionId.value = null;
    fetchData();
  }
});
</script>

<style scoped>
.champion-stats-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-4);
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

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  flex: 1;
  max-width: 260px;
  transition: border-color var(--transition-fast);
}

.search-box:focus-within {
  border-color: var(--color-accent);
}

.search-icon {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  width: 100%;
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.sort-group {
  display: flex;
  gap: var(--space-1);
}

.sort-chip {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sort-chip:hover {
  background: var(--color-bg-hover);
}

.sort-chip.active {
  background: var(--color-accent);
  color: #ffffff;
  border-color: var(--color-accent);
}

/* Layout */
.champion-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.champion-list-panel {
  min-height: 0;
}

.champion-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  padding: var(--space-2);
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.champion-detail-panel {
  position: sticky;
  top: 0;
}

@media (max-width: 900px) {
  .champion-layout { grid-template-columns: 1fr; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .search-box { max-width: none; }
}
</style>
