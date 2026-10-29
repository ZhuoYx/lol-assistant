<template>
  <div class="champion-detail glass-panel">
    <div v-if="stat" class="detail-content">
      <!-- Header -->
      <div class="detail-header">
        <ChampionIcon :champion-id="stat.championId" :name="stat.championName" size="lg" />
        <div class="header-info">
          <h3 class="champion-name">{{ stat.championName }}</h3>
          <span class="champion-games">{{ stat.gamesPlayed }} 场对局</span>
        </div>
      </div>

      <!-- Core Stats Grid -->
      <div class="detail-stats">
        <div class="detail-stat">
          <span class="ds-value" :class="winRateClass">{{ winRateText }}</span>
          <span class="ds-label">胜率</span>
        </div>
        <div class="detail-stat">
          <span class="ds-value" :class="kdaClass">{{ stat.avgKDA.toFixed(2) }}</span>
          <span class="ds-label">平均KDA</span>
        </div>
        <div class="detail-stat">
          <span class="ds-value">{{ stat.avgKills.toFixed(1) }}</span>
          <span class="ds-label">平均击杀</span>
        </div>
        <div class="detail-stat">
          <span class="ds-value deaths-color">{{ stat.avgDeaths.toFixed(1) }}</span>
          <span class="ds-label">平均死亡</span>
        </div>
        <div class="detail-stat">
          <span class="ds-value">{{ stat.avgAssists.toFixed(1) }}</span>
          <span class="ds-label">平均助攻</span>
        </div>
      </div>

      <!-- Extra Stats -->
      <div class="extra-stats">
        <div class="extra-stat-item">
          <span class="extra-icon mvp-icon">★</span>
          <span class="extra-label">MVP</span>
          <span class="extra-value mvp-value">{{ stat.mvpCount }} 次</span>
        </div>
        <div class="extra-stat-item">
          <span class="extra-icon svp-icon">☆</span>
          <span class="extra-label">SVP</span>
          <span class="extra-value svp-value">{{ stat.svpCount }} 次</span>
        </div>
        <div class="extra-stat-item">
          <span class="extra-icon">📅</span>
          <span class="extra-label">最近使用</span>
          <span class="extra-value">{{ lastPlayedText }}</span>
        </div>
      </div>

      <!-- Win/Loss Bar -->
      <div class="winloss-section">
        <div class="winloss-bar">
          <div class="win-part" :style="{ width: stat.winRate * 100 + '%' }">
            <span v-if="stat.wins > 0" class="wl-count">{{ stat.wins }}W</span>
          </div>
          <div class="loss-part" :style="{ width: (1 - stat.winRate) * 100 + '%' }">
            <span v-if="stat.losses > 0" class="wl-count">{{ stat.losses }}L</span>
          </div>
        </div>
      </div>
    </div>
    <EmptyState v-else title="选择一个英雄" description="点击左侧列表查看详细统计" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChampionStats } from '@lol-assistant/shared';
import { formatPercent } from '@lol-assistant/shared';
import { ChampionIcon, EmptyState } from '@/components/common';

const props = defineProps<{
  stat: ChampionStats | null;
}>();

const winRateText = computed(() => {
  if (!props.stat) return '0%';
  return formatPercent(props.stat.winRate);
});

const winRateClass = computed(() => {
  if (!props.stat) return '';
  if (props.stat.winRate >= 0.6) return 'wins-color';
  if (props.stat.winRate <= 0.4) return 'losses-color';
  return '';
});

const kdaClass = computed(() => {
  if (!props.stat) return '';
  if (props.stat.avgKDA >= 4) return 'kda-excellent';
  if (props.stat.avgKDA >= 2.5) return 'kda-good';
  return '';
});

const lastPlayedText = computed(() => {
  if (!props.stat || !props.stat.lastPlayed) return '-';
  const now = Date.now();
  const diff = now - props.stat.lastPlayed;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return `${Math.floor(days / 30)} 个月前`;
});
</script>

<style scoped>
.champion-detail {
  padding: var(--space-5);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-divider);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.champion-name {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.champion-games {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.detail-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.ds-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.ds-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.wins-color {
  color: var(--color-win-text);
}
.losses-color {
  color: var(--color-lose-text);
}
.deaths-color {
  color: var(--color-lose-text);
}
.kda-excellent {
  color: var(--color-highlight-text);
}
.kda-good {
  color: var(--color-win-text);
}

/* Extra Stats */
.extra-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-3) 0;
  margin-bottom: var(--space-3);
  border-top: 1px solid var(--color-divider);
}

.extra-stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
}

.extra-icon {
  font-size: 12px;
  opacity: 0.7;
}

.extra-label {
  color: var(--color-text-tertiary);
}

.extra-value {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.mvp-icon {
  color: var(--color-highlight-text);
  opacity: 1;
}
.mvp-value {
  color: var(--color-highlight-text);
}
.svp-icon {
  color: var(--color-text-secondary);
  opacity: 1;
}
.svp-value {
  color: var(--color-text-secondary);
}

/* Win/Loss Bar */
.winloss-section {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-divider);
}

.winloss-bar {
  display: flex;
  height: 24px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.win-part {
  background-color: var(--color-win);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.loss-part {
  background-color: var(--color-lose);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.wl-count {
  font-size: 10px;
  font-weight: var(--font-bold);
  color: #ffffff;
  padding: 0 var(--space-2);
  white-space: nowrap;
}

.detail-header > .header-info {
  min-width: 0;
}
.champion-name {
  overflow-wrap: anywhere;
}
.detail-stats {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
@container workspace (max-width: 480px) {
  .detail-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 16px;
  }
}
</style>
