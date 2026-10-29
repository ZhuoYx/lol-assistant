<template>
  <div class="page ranking-page">
    <PageHeader title="英雄排名" subtitle="所选攻略来源 · 排位热度与胜率"
      ><template #actions><DataSourceSelect /></template
    ></PageHeader>

    <!-- Filters -->
    <div class="filter-bar glass-panel">
      <div class="filter-group">
        <label class="filter-label">分路</label>
        <div class="filter-selector-wrap">
          <select v-model="selectedPosition" class="filter-selector" @change="fetchData">
            <option value="">全部位置</option>
            <option v-for="pos in positions" :key="pos.value" :value="pos.value">
              {{ pos.label }}
            </option>
          </select>
          <svg
            class="selector-arrow"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">段位</label>
        <div class="filter-selector-wrap">
          <select v-model="selectedTier" class="filter-selector" @change="fetchData">
            <option v-for="t in tiers" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
          <svg
            class="selector-arrow"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div class="filter-meta">
        <span v-if="rankingData" class="meta-badge"> v{{ rankingData.patch }} </span>
        <span class="meta-count">{{ filteredRankings.length }} 英雄</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-section glass-surface">
      <LoadingSpinner size="lg" />
      <span class="loading-text">正在获取排名数据...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-section">
      <div class="error-card glass-surface">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span class="error-text">{{ error }}</span>
        <button class="retry-btn" @click="fetchData">重试</button>
      </div>
    </div>

    <!-- Ranking Table -->
    <div
      v-else-if="filteredRankings.length > 0"
      class="ranking-table-wrap glass-panel"
      tabindex="0"
      role="region"
      aria-label="英雄排名数据，可横向滚动查看完整列"
    >
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-champ">英雄</th>
            <th v-if="!selectedPosition" class="col-pos">位置</th>
            <th class="col-tier">梯队</th>
            <th
              class="col-stat sortable"
              :class="{ active: sortKey === 'winRate' }"
              @click="toggleSort('winRate')"
            >
              胜率
              <span class="sort-icon">{{
                sortKey === 'winRate' ? (sortAsc ? '↑' : '↓') : ''
              }}</span>
            </th>
            <th
              class="col-stat sortable"
              :class="{ active: sortKey === 'pickRate' }"
              @click="toggleSort('pickRate')"
            >
              登场率
              <span class="sort-icon">{{
                sortKey === 'pickRate' ? (sortAsc ? '↑' : '↓') : ''
              }}</span>
            </th>
            <th
              class="col-stat sortable"
              :class="{ active: sortKey === 'banRate' }"
              @click="toggleSort('banRate')"
            >
              禁用率
              <span class="sort-icon">{{
                sortKey === 'banRate' ? (sortAsc ? '↑' : '↓') : ''
              }}</span>
            </th>
            <th
              class="col-stat sortable"
              :class="{ active: sortKey === 'kda' }"
              @click="toggleSort('kda')"
            >
              KDA
              <span class="sort-icon">{{ sortKey === 'kda' ? (sortAsc ? '↑' : '↓') : '' }}</span>
            </th>
            <th class="col-games">场次</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in filteredRankings"
            :key="`${item.championId}-${item.position}`"
            class="ranking-row"
            @click="goToRune(item.championId)"
          >
            <td class="col-rank">
              <span class="rank-num" :class="rankClass(idx + 1)">{{ idx + 1 }}</span>
            </td>
            <td class="col-champ">
              <div class="champ-cell">
                <ChampionIcon
                  :champion-id="item.championId"
                  :name="getChampName(item.championId)"
                  size="sm"
                />
                <span class="champ-name">{{ getChampName(item.championId) }}</span>
              </div>
            </td>
            <td v-if="!selectedPosition" class="col-pos">
              <span class="pos-badge" :class="item.position">{{ posLabel(item.position) }}</span>
            </td>
            <td class="col-tier">
              <span class="tier-badge" :class="`tier-${item.tier}`">{{
                tierLabel(item.tier)
              }}</span>
            </td>
            <td class="col-stat">
              <span
                class="stat-val"
                :class="{ 'high-wr': item.winRate > 0.52, 'low-wr': item.winRate < 0.48 }"
              >
                {{ (item.winRate * 100).toFixed(1) }}%
              </span>
            </td>
            <td class="col-stat">{{ (item.pickRate * 100).toFixed(1) }}%</td>
            <td class="col-stat">{{ (item.banRate * 100).toFixed(1) }}%</td>
            <td class="col-stat">{{ item.kda > 0 ? item.kda.toFixed(2) : '—' }}</td>
            <td class="col-games">{{ item.games > 0 ? formatGames(item.games) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty -->
    <div v-else class="empty-section glass-surface">
      <span class="empty-text">暂无排名数据</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataSourceSelect from '@/components/common/DataSourceSelect.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { LoadingSpinner, ChampionIcon } from '@/components/common';
import { getChampionDisplayName } from '@lol-assistant/shared';
import type { ChampionRanking, ChampionRankingList } from '@lol-assistant/shared';

const router = useRouter();

const loading = ref(false);
const error = ref<string | null>(null);
const rankingData = ref<ChampionRankingList | null>(null);

// Filters
const selectedPosition = ref('');
const selectedTier = ref('emerald_plus');

// Sort
const sortKey = ref<'winRate' | 'pickRate' | 'banRate' | 'kda' | null>(null);
const sortAsc = ref(false);

const positions = [
  { value: 'top', label: '上单' },
  { value: 'jungle', label: '打野' },
  { value: 'mid', label: '中单' },
  { value: 'adc', label: 'ADC' },
  { value: 'support', label: '辅助' },
];

const tiers = [
  { value: 'emerald_plus', label: '翡翠+' },
  { value: 'diamond_plus', label: '钻石+' },
  { value: 'master_plus', label: '大师+' },
  { value: 'grandmaster', label: '宗师' },
  { value: 'challenger', label: '王者' },
  { value: 'platinum_plus', label: '铂金+' },
  { value: 'all', label: '全段位' },
];

const filteredRankings = computed(() => {
  if (!rankingData.value) return [];

  let list = [...rankingData.value.rankings];

  // 当选择"全部位置"时，每个英雄只保留role_rate最高的位置（即排第一条的）
  if (!selectedPosition.value) {
    const seen = new Map<number, ChampionRanking>();
    for (const item of list) {
      if (!seen.has(item.championId)) {
        seen.set(item.championId, item);
      }
    }
    list = Array.from(seen.values());
  }

  // Custom sort
  if (sortKey.value) {
    const key = sortKey.value;
    list.sort((a, b) => {
      const diff = a[key] - b[key];
      return sortAsc.value ? diff : -diff;
    });
  }

  return list;
});

function toggleSort(key: 'winRate' | 'pickRate' | 'banRate' | 'kda') {
  if (sortKey.value === key) {
    if (!sortAsc.value) {
      sortAsc.value = true;
    } else {
      sortKey.value = null;
      sortAsc.value = false;
    }
  } else {
    sortKey.value = key;
    sortAsc.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  error.value = null;

  try {
    const result = await window.electronAPI.getChampionRankings(
      selectedPosition.value || undefined,
      selectedTier.value,
    );
    rankingData.value = result;
  } catch {
    error.value = '获取排名数据失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

function getChampName(id: number): string {
  return getChampionDisplayName(id);
}

function posLabel(pos: string): string {
  const map: Record<string, string> = {
    top: '上',
    jungle: '野',
    mid: '中',
    adc: '下',
    support: '辅',
  };
  return map[pos.toLowerCase()] ?? pos;
}

function tierLabel(tier: number): string {
  const map: Record<number, string> = {
    1: 'OP',
    2: 'T1',
    3: 'T2',
    4: 'T3',
    5: 'T4',
  };
  return map[tier] ?? `T${tier}`;
}

function rankClass(rank: number): string {
  if (rank <= 3) return 'top-3';
  if (rank <= 10) return 'top-10';
  return '';
}

function formatGames(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function goToRune(championId: number) {
  router.push({ path: '/rune-builder', query: { championId: String(championId) } });
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.ranking-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

/* ─── Filter bar ─── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.filter-selector-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-selector {
  appearance: none;
  -webkit-appearance: none;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 5px 28px 5px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
  font-family: var(--font-family);
  transition: all var(--transition-fast);
}

.filter-selector:hover {
  border-color: var(--color-accent);
}

.filter-selector:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.12);
}

.selector-arrow {
  position: absolute;
  right: 8px;
  pointer-events: none;
  color: var(--color-text-tertiary);
}

.filter-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.meta-badge {
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.meta-count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* ─── Loading / Error / Empty ─── */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-12) 0;
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.error-section {
  padding: var(--space-3) 0;
}

.error-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  --glass-tint: linear-gradient(var(--color-lose-bg), var(--color-lose-bg));
  background-color: var(--color-bg-card);
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
  flex: 1;
}

.retry-btn {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.retry-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.empty-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* ─── Ranking Table ─── */
.ranking-table-wrap {
  overflow: hidden;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.ranking-table th {
  padding: var(--space-2) var(--space-3);
  font-size: 10px;
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  text-align: left;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  white-space: nowrap;
  user-select: none;
}

.ranking-table th.sortable {
  cursor: pointer;
  transition: color var(--transition-fast);
}

.ranking-table th.sortable:hover {
  color: var(--color-accent);
}

.ranking-table th.active {
  color: var(--color-accent);
}

.sort-icon {
  margin-left: 2px;
  font-size: 9px;
}

.ranking-table td {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-light);
  vertical-align: middle;
}

.ranking-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.ranking-row:hover {
  background-color: var(--color-bg-hover);
}

.ranking-row:last-child td {
  border-bottom: none;
}

/* Column widths */
.col-rank {
  width: 44px;
  text-align: center;
}
.col-champ {
  width: auto;
}
.col-pos {
  width: 48px;
  text-align: center;
}
.col-tier {
  width: 52px;
  text-align: center;
}
.col-stat {
  width: 72px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 11px;
}
.col-games {
  width: 64px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-tertiary);
}

/* Rank number */
.rank-num {
  font-size: 11px;
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.rank-num.top-3 {
  color: var(--color-highlight-text);
  font-weight: var(--font-bold);
}

.rank-num.top-10 {
  color: var(--color-accent);
}

/* Champion cell */
.champ-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.champ-name {
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Position badge */
.pos-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  font-size: 9px;
  font-weight: var(--font-bold);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.pos-badge.top {
  background-color: rgba(255, 179, 71, 0.12);
  color: #ffb347;
}
.pos-badge.jungle {
  background-color: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}
.pos-badge.mid {
  background-color: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}
.pos-badge.adc {
  background-color: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
.pos-badge.support {
  background-color: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

/* Tier badge */
.tier-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: var(--font-bold);
  font-family: var(--font-mono);
}

.tier-badge.tier-1 {
  background-color: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
}
.tier-badge.tier-2 {
  background-color: rgba(255, 149, 0, 0.12);
  color: #ff9500;
}
.tier-badge.tier-3 {
  background-color: rgba(52, 199, 89, 0.12);
  color: #34c759;
}
.tier-badge.tier-4 {
  background-color: rgba(90, 200, 250, 0.12);
  color: #5ac8fa;
}
.tier-badge.tier-5 {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

/* Win rate colors */
.stat-val.high-wr {
  color: var(--color-win-text);
}
.stat-val.low-wr {
  color: var(--color-error);
}

.ranking-table-wrap {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
.ranking-table {
  min-width: 760px;
}
.champ-cell,
.champ-name {
  min-width: 0;
}
.champ-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.filter-bar {
  gap: 12px 20px;
}
@container workspace (max-width: 580px) {
  .filter-meta {
    margin-left: 0;
    flex-basis: 100%;
  }
}
</style>
