<template>
  <div class="champion-detail">
    <div v-if="stat" class="detail-content">
      <!-- Header -->
      <div class="detail-header">
        <ChampionIcon :champion-id="stat.championId" :name="stat.championName" size="lg" />
        <div class="header-info">
          <h3 class="champion-name">{{ stat.championName }}</h3>
          <span class="champion-games">{{ stat.gamesPlayed }} 场对局</span>
        </div>
      </div>

      <!-- Stats Grid -->
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

      <!-- Win/Loss Bar -->
      <div class="winloss-section">
        <div class="winloss-bar">
          <div class="win-part" :style="{ width: (stat.winRate * 100) + '%' }">
            <span v-if="stat.wins > 0" class="wl-count">{{ stat.wins }}W</span>
          </div>
          <div class="loss-part" :style="{ width: ((1 - stat.winRate) * 100) + '%' }">
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
</script>

<style scoped>
.champion-detail {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
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
  margin-bottom: var(--space-5);
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

.wins-color { color: var(--color-win); }
.losses-color { color: var(--color-lose); }
.deaths-color { color: var(--color-lose); }
.kda-excellent { color: var(--color-gold); }
.kda-good { color: var(--color-win); }

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
  background: var(--color-win);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.loss-part {
  background: var(--color-lose);
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
</style>
