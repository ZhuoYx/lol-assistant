<template>
  <div class="counter-suggestion glass-panel">
    <div class="section-header">
      <div class="header-left">
        <span class="section-title">克制推荐</span>
        <span v-if="dataSource" class="source-badge" :class="dataSource">
          {{ sourceLabel }}
        </span>
      </div>
      <span v-if="dataVersion" class="version-tag">{{ dataVersion }}</span>
    </div>

    <!-- Loading state -->
    <div v-if="fetching" class="counter-loading">
      <div class="loading-bar">
        <div class="loading-bar-fill" />
      </div>
      <span class="loading-text">正在获取克制数据...</span>
    </div>

    <!-- No enemy picks yet -->
    <div v-else-if="recommendations.length === 0 && !fetching" class="counter-empty">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span class="empty-note">等待敌方选择英雄后显示克制推荐</span>
    </div>

    <!-- Recommendations -->
    <div v-else class="recs-list">
      <div v-for="rec in recommendations" :key="rec.championId" class="rec-card glass-surface">
        <ChampionIcon :champion-id="rec.championId" :name="rec.championName" size="sm" />
        <div class="rec-info">
          <span class="rec-name">{{ rec.championName }}</span>
          <span class="rec-reason">{{ rec.reason }}</span>
        </div>
        <div v-if="rec.winRate > 0" class="rec-stats">
          <span class="rec-wr" :class="wrClass(rec.winRate)">{{ formatWr(rec.winRate) }}</span>
          <span v-if="rec.sampleSize > 0" class="rec-sample"
            >{{ formatSample(rec.sampleSize) }}局</span
          >
        </div>
        <div v-else class="rec-stats">
          <span class="rec-static">经验推荐</span>
        </div>
      </div>
    </div>

    <!-- Enemy weaknesses -->
    <div v-if="weaknesses.length > 0" class="weakness-section">
      <span class="subsection-title">敌方弱势对局</span>
      <div class="weakness-list">
        <div v-for="w in weaknesses" :key="w.championId" class="weakness-item">
          <div class="weakness-header">
            <ChampionIcon :champion-id="w.championId" :name="w.championName" size="xs" />
            <span class="weakness-champ">{{ w.championName }} 不擅长对抗</span>
          </div>
          <div class="weakness-matchups">
            <span v-for="matchup in w.easyMatchups" :key="matchup.championId" class="matchup-tag">
              {{ getChampName(matchup.championId) }}
              <span v-if="matchup.winRate > 0" class="matchup-wr">{{
                formatWr(matchup.winRate)
              }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChampionIcon from '../common/ChampionIcon.vue';
import { CHAMPION_ID_MAP, CHAMPION_CN_NAME_MAP } from '@lol-assistant/shared';
import type { CounterRecommendation } from '@/composables/useDraftAssistant';
import type { CounterInfo } from '@lol-assistant/shared';
import { computed } from 'vue';

const props = defineProps<{
  recommendations: CounterRecommendation[];
  weaknesses: { championId: number; championName: string; easyMatchups: CounterInfo[] }[];
  fetching: boolean;
  dataSource: 'opgg' | 'qq101' | null;
  dataVersion: string | null;
}>();

const sourceLabel = computed(() => {
  switch (props.dataSource) {
    case 'opgg':
      return 'OP.GG';
    case 'qq101':
      return '101.qq.com';
    default:
      return '';
  }
});

function getChampName(id: number): string {
  return CHAMPION_CN_NAME_MAP[id] ?? CHAMPION_ID_MAP[id] ?? `#${id}`;
}

function formatWr(rate: number): string {
  // 兼容两种格式：如果 rate > 1 说明已经是百分比值（如 52.3），否则是小数（如 0.523）
  const pct = rate > 1 ? rate : rate * 100;
  return `${pct.toFixed(1)}%`;
}

function formatSample(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function wrClass(rate: number): string {
  // 兼容两种格式
  const pct = rate > 1 ? rate : rate * 100;
  if (pct >= 55) return 'high';
  if (pct <= 45) return 'low';
  return '';
}
</script>

<style scoped>
.counter-suggestion {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.section-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.source-badge {
  font-size: 10px;
  font-weight: var(--font-medium);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  letter-spacing: 0.2px;
}

.source-badge.opgg {
  background-color: rgba(0, 113, 227, 0.08);
  color: var(--color-accent);
}

.source-badge.qq101 {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

.version-tag {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  font-family: var(--font-mono);
}

/* Loading */
.counter-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6) 0;
}

.loading-bar {
  width: 120px;
  height: 3px;
  background-color: var(--color-bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.loading-bar-fill {
  width: 40%;
  height: 100%;
  background-color: var(--color-accent);
  border-radius: 2px;
  animation: loading-slide 1.2s ease infinite;
}

@keyframes loading-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}

.loading-text {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* Empty */
.counter-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) 0;
  color: var(--color-text-placeholder);
}

.empty-note {
  font-size: var(--text-sm);
  text-align: center;
}

/* Recommendations */
.recs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.rec-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-hover);
  transition: all var(--transition-fast);
}

.rec-card:hover {
  background-color: var(--color-bg-active);
}

.rec-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.rec-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rec-reason {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.rec-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
}

.rec-wr {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.rec-wr.high {
  color: var(--color-win-text);
}
.rec-wr.low {
  color: var(--color-lose-text);
}

.rec-sample {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

.rec-static {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  font-style: italic;
}

/* Weaknesses */
.weakness-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-divider);
}

.subsection-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.weakness-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.weakness-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.weakness-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.weakness-champ {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.weakness-matchups {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-left: var(--space-8);
}

.matchup-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.matchup-wr {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-tertiary);
}
</style>
