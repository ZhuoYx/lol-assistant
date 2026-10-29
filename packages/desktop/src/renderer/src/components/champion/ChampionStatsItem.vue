<template>
  <div class="champion-stats-item" :class="{ selected }" @click="$emit('select', stat.championId)">
    <span class="item-rank">{{ rank }}</span>
    <ChampionIcon :champion-id="stat.championId" :name="stat.championName" size="sm" />
    <div class="item-info">
      <span class="item-name">{{ stat.championName }}</span>
      <span class="item-games">{{ stat.gamesPlayed }}场</span>
    </div>
    <div class="item-stats">
      <div class="stat-bar-group">
        <div class="stat-bar-bg">
          <div
            class="stat-bar-fill"
            :class="winRateClass"
            :style="{ width: stat.winRate * 100 + '%' }"
          />
        </div>
        <span class="stat-bar-label" :class="winRateClass">
          {{ (stat.winRate * 100).toFixed(1) }}%
        </span>
      </div>
      <span class="item-kda" :class="kdaClass"> {{ stat.avgKDA.toFixed(2) }} KDA </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChampionStats } from '@lol-assistant/shared';
import { ChampionIcon } from '@/components/common';

const props = defineProps<{
  stat: ChampionStats;
  rank: number;
  selected?: boolean;
}>();

defineEmits<{
  select: [championId: number];
}>();

const winRateClass = computed(() => {
  if (props.stat.winRate >= 0.6) return 'high';
  if (props.stat.winRate <= 0.4) return 'low';
  return 'mid';
});

const kdaClass = computed(() => {
  if (props.stat.avgKDA >= 4) return 'kda-excellent';
  if (props.stat.avgKDA >= 2.5) return 'kda-good';
  return 'kda-poor';
});
</script>

<style scoped>
.champion-stats-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.champion-stats-item:hover {
  background-color: var(--color-bg-hover);
}

.champion-stats-item.selected {
  background-color: rgba(0, 113, 227, 0.06);
  border-left: 3px solid var(--color-accent);
}

.item-rank {
  width: 22px;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--color-text-placeholder);
  text-align: center;
  flex-shrink: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 80px;
}

.item-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.item-games {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.item-stats {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stat-bar-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.stat-bar-bg {
  width: 60px;
  height: 4px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.stat-bar-fill.high {
  background-color: var(--color-win);
}
.stat-bar-fill.mid {
  background-color: var(--color-text-tertiary);
}
.stat-bar-fill.low {
  background-color: var(--color-lose);
}

.stat-bar-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
  min-width: 44px;
  text-align: right;
}

.stat-bar-label.high {
  color: var(--color-win-text);
}
.stat-bar-label.mid {
  color: var(--color-text-secondary);
}
.stat-bar-label.low {
  color: var(--color-lose-text);
}

.item-kda {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  min-width: 60px;
  text-align: right;
}

.kda-excellent {
  color: var(--color-highlight-text);
  font-weight: var(--font-semibold);
}
.kda-good {
  color: var(--color-win-text);
}
.kda-poor {
  color: var(--color-text-placeholder);
}

.item-info {
  flex: 1;
  min-width: 0;
}
.item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-stats {
  flex-shrink: 0;
}
@container workspace (max-width: 580px) {
  .stat-bar-bg {
    display: none;
  }
  .item-stats {
    gap: 10px;
  }
  .champion-stats-item {
    gap: 8px;
    padding-inline: 8px;
  }
}
</style>
