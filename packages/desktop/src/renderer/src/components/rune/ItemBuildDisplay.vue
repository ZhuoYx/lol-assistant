<template>
  <div class="item-build glass-panel">
    <!-- Header: selector for multiple item builds -->
    <div class="item-header">
      <h3 class="section-title">出装推荐</h3>
      <div v-if="itemBuilds.length > 1" class="item-selector-wrap">
        <select
          class="item-selector"
          aria-label="出装方案"
          :value="selectedIndex"
          @change="$emit('select', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="(build, idx) in itemBuilds" :key="idx" :value="idx">
            {{ build.name || `配置 ${idx + 1}` }}
            {{ build.winRate ? `(${formatPercent(build.winRate)})` : '' }}
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

    <!-- Empty state -->
    <div v-if="itemBuilds.length === 0" class="item-empty">
      <span class="empty-text">暂无出装数据</span>
    </div>

    <!-- Item content -->
    <div v-else-if="currentBuild" class="item-content">
      <!-- Stats bar -->
      <div class="build-stats">
        <div class="stat-item">
          <span class="stat-label">胜率</span>
          <span class="stat-value win-rate">{{ formatPercent(currentBuild.winRate) }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-label">使用率</span>
          <span class="stat-value">{{ formatPercent(currentBuild.pickRate) }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-label">样本</span>
          <span class="stat-value">{{ formatSample(currentBuild.sampleSize) }}</span>
        </div>
      </div>

      <!-- Starting items -->
      <div class="build-section">
        <div class="section-label">
          <span class="label-text">出门装</span>
          <span class="label-line" />
        </div>
        <div class="items-row">
          <div
            v-for="itemId in currentBuild.startingItems"
            :key="itemId"
            class="item-slot"
            :title="getItemName(itemId)"
          >
            <div class="item-icon starting">
              <img
                v-if="getItemImgUrl(itemId)"
                class="item-img"
                v-cached-src="getItemImgUrl(itemId)"
                :alt="getItemName(itemId)"
                @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else class="item-id">{{ itemId }}</span>
            </div>
          </div>
          <div v-if="currentBuild.startingItems.length === 0" class="no-items">—</div>
        </div>
      </div>

      <!-- Core items -->
      <div class="build-section">
        <div class="section-label">
          <span class="label-text">核心装备</span>
          <span class="label-line" />
        </div>
        <div class="items-row core">
          <template v-for="(itemId, idx) in currentBuild.items" :key="itemId">
            <div class="item-slot" :title="getItemName(itemId)">
              <div class="item-icon core">
                <img
                  v-if="getItemImgUrl(itemId)"
                  class="item-img"
                  v-cached-src="getItemImgUrl(itemId)"
                  :alt="getItemName(itemId)"
                  @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
                <span v-else class="item-id">{{ itemId }}</span>
              </div>
            </div>
            <svg
              v-if="idx < currentBuild.items.length - 1"
              class="arrow-icon"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </template>
          <div v-if="currentBuild.items.length === 0" class="no-items">—</div>
        </div>
      </div>

      <!-- Boots -->
      <div v-if="currentBuild.boots" class="build-section">
        <div class="section-label">
          <span class="label-text">鞋子</span>
          <span class="label-line" />
        </div>
        <div class="items-row">
          <div class="item-slot" :title="getItemName(currentBuild.boots)">
            <div class="item-icon boots">
              <img
                v-if="getItemImgUrl(currentBuild.boots)"
                class="item-img"
                v-cached-src="getItemImgUrl(currentBuild.boots)"
                :alt="getItemName(currentBuild.boots)"
                @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else class="item-id">{{ currentBuild.boots }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ItemBuild } from '@lol-assistant/shared';
import { ITEM_ID_MAP, getItemIconUrl } from '@lol-assistant/shared';

const DDRAGON_VERSION = '16.5.1';

const props = withDefaults(
  defineProps<{
    itemBuilds: ItemBuild[];
    selectedIndex?: number;
  }>(),
  {
    selectedIndex: 0,
  },
);

defineEmits<{
  (e: 'select', index: number): void;
}>();

const currentBuild = computed(() => {
  const idx = Math.min(props.selectedIndex, props.itemBuilds.length - 1);
  return props.itemBuilds[idx] ?? null;
});

function getItemName(id: number): string {
  return ITEM_ID_MAP[id] ?? '';
}

function getItemImgUrl(id: number): string {
  if (!id || id <= 0) return '';
  return getItemIconUrl(id, DDRAGON_VERSION);
}

function formatPercent(v: number): string {
  if (!v) return '—';
  // 值大于1视为已经是百分比（如 52.3），否则视为小数（如 0.523）
  const pct = v > 1 ? v : v * 100;
  return `${pct.toFixed(1)}%`;
}

function formatSample(v: number): string {
  if (!v) return '—';
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}
</script>

<style scoped>
.item-build {
  overflow: hidden;
  min-width: 0; /* 防止 grid 子项溢出 */
  display: flex;
  flex-direction: column;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-light);
  min-width: 0;
}

.section-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  letter-spacing: -0.2px;
  flex-shrink: 0;
}

.item-selector-wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.item-selector {
  appearance: none;
  -webkit-appearance: none;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px 28px 4px 10px;
  font-size: 11px;
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
  font-family: var(--font-family);
  transition: all var(--transition-fast);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-selector:hover {
  border-color: var(--color-accent);
}

.item-selector:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.12);
}

.selector-arrow {
  position: absolute;
  right: 8px;
  pointer-events: none;
  color: var(--color-text-tertiary);
}

.item-empty {
  padding: var(--space-10) var(--space-4);
  text-align: center;
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* Stats */
.build-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-bg-secondary);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.stat-label {
  font-size: 9px;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.stat-value {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.stat-value.win-rate {
  color: var(--color-win-text);
}

.stat-divider {
  width: 1px;
  height: 20px;
  background-color: var(--color-border);
  flex-shrink: 0;
}

/* Build sections */
.item-content {
  padding: var(--space-3) var(--space-4) var(--space-4);
  flex: 1;
}

.build-section {
  margin-top: var(--space-3);
}

.build-section:first-child {
  margin-top: var(--space-2);
}

.section-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.label-text {
  font-size: 10px;
  font-weight: var(--font-medium);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.label-line {
  flex: 1;
  height: 1px;
  background-color: var(--color-border-light);
}

.items-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-width: 0;
}

.items-row.core {
  gap: var(--space-1);
}

.item-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-bg-tertiary), var(--color-bg-secondary));
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.item-icon.core {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-lg);
  border-color: var(--color-gold);
  border-width: 1.5px;
}

.item-icon.starting {
  width: 32px;
  height: 32px;
}

.item-icon.boots {
  width: 36px;
  height: 36px;
  border-color: var(--color-accent);
  border-style: dashed;
}

.item-id {
  font-size: 8px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.arrow-icon {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.no-items {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}
</style>
