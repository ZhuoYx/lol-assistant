<template>
  <div
    class="match-item"
    :class="{ win: match.win, lose: !match.win, expanded: isExpanded }"
    @click="$emit('click', match.gameId)"
  >
    <div class="result-bar" />
    <ChampionIcon :champion-id="match.championId" :name="match.championName" size="md" />
    <div class="match-info">
      <span class="champion-name">{{ match.championName || '未知英雄' }}</span>
      <div class="meta-row">
        <span class="result-text">{{ match.win ? '胜利' : '失败' }}</span>
        <span class="mode-tag" :class="queueTagClass">{{ queueName }}</span>
        <span v-if="isRanked && laneName" class="lane-tag">{{ laneName }}</span>
      </div>
      <div v-if="summaryStats.length" class="summary-stats">{{ summaryStats.join(' · ') }}</div>
    </div>
    <div class="kda-section">
      <div class="kda-row">
        <span v-if="match.isMVP" class="badge badge-mvp">MVP</span>
        <span v-if="match.isSVP" class="badge badge-svp">SVP</span>
        <span class="kda-numbers">{{ match.kills }}/{{ match.deaths }}/{{ match.assists }}</span>
      </div>
      <span class="kda-ratio" :class="kdaColorClass">{{ kdaValue }} KDA</span>
    </div>
    <span class="match-time">{{ formatRelativeTime(match.gameCreation) }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MatchSummary } from '@lol-assistant/shared';
import {
  calculateKDA,
  formatRelativeTime,
  getQueueNameById,
  formatNumber,
} from '@lol-assistant/shared';
import { ChampionIcon } from '@/components/common';

const props = defineProps<{
  match: MatchSummary;
  isExpanded?: boolean;
}>();

const summaryStats = computed(() => {
  const match = props.match;
  return [
    match.totalDamageDealtToChampions !== undefined
      ? `伤害 ${formatNumber(match.totalDamageDealtToChampions)}`
      : '',
    match.totalDamageTaken !== undefined ? `承伤 ${formatNumber(match.totalDamageTaken)}` : '',
    match.goldEarned !== undefined ? `金币 ${formatNumber(match.goldEarned)}` : '',
  ].filter(Boolean);
});

defineEmits<{
  click: [gameId: number];
}>();

const kdaValue = computed(() =>
  calculateKDA(props.match.kills, props.match.deaths, props.match.assists).toFixed(1),
);

const kdaColorClass = computed(() => {
  if (props.match.isMVP || props.match.isSVP) return 'gold';
  const kda = calculateKDA(props.match.kills, props.match.deaths, props.match.assists);
  if (kda >= 1) return 'good';
  return 'poor';
});

const queueName = computed(() => {
  const name = getQueueNameById(props.match.queueId);
  if (name !== '其他模式') return name;
  const modeMap: Record<string, string> = {
    CLASSIC: '匹配模式',
    ARAM: '极地大乱斗',
    URF: '无限火力',
    CHERRY: '竞技场',
  };
  return modeMap[props.match.gameMode] || props.match.gameMode || '其他模式';
});

const queueTagClass = computed(() => {
  const queueId = props.match.queueId;
  const ranked = [420, 440];
  const aram = [450, 720, 2400];
  const fun = [900, 1020, 1300, 1400, 1700, 1710, 1900];
  const bot = [830, 840, 850, 870, 880, 890];
  if (ranked.includes(queueId) || [700, 720].includes(queueId)) return 'tag-ranked';
  if (aram.includes(queueId) || props.match.gameMode === 'ARAM') return 'tag-aram';
  if (fun.includes(queueId) || props.match.gameMode === 'URF' || props.match.gameMode === 'CHERRY')
    return 'tag-fun';
  if (bot.includes(queueId)) return 'tag-bot';
  return 'tag-normal';
});

const LANE_NAME_MAP: Record<string, string> = {
  TOP: '上路',
  JUNGLE: '打野',
  MIDDLE: '中路',
  MID: '中路',
  BOTTOM: '下路',
  ADC: '下路',
  UTILITY: '辅助',
  SUPPORT: '辅助',
};

const isRanked = computed(() => {
  const queueId = props.match.queueId;
  return queueId === 420 || queueId === 440;
});

const laneName = computed(() => {
  const lane = props.match.lane?.toUpperCase() ?? '';
  return LANE_NAME_MAP[lane] ?? '';
});
</script>

<style scoped>
.match-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
}

.summary-stats {
  font-size: 11px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin-top: 3px;
  white-space: normal;
}

.match-item.win {
  background-color: rgba(52, 199, 89, 0.06);
}

.match-item.lose {
  background-color: rgba(255, 59, 48, 0.06);
}

.match-item.win:hover,
.match-item.win.expanded {
  background-color: rgba(52, 199, 89, 0.12);
}

.match-item.lose:hover,
.match-item.lose.expanded {
  background-color: rgba(255, 59, 48, 0.12);
}

.result-bar {
  width: 3px;
  height: 36px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.win .result-bar {
  background-color: var(--color-win);
}
.lose .result-bar {
  background-color: var(--color-lose);
}

.match-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.champion-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.result-text {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.win .result-text {
  color: var(--color-win-text);
}
.lose .result-text {
  color: var(--color-lose-text);
}

.mode-tag {
  font-size: 12px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

.tag-ranked {
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}

.tag-aram {
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
  color: var(--color-success-text);
}

.tag-fun {
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
  color: var(--color-warning);
}

.tag-normal {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

.tag-bot {
  background-color: rgba(162, 132, 94, 0.12);
  color: var(--color-text-secondary);
}

.lane-tag {
  font-size: 12px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
  background-color: rgba(120, 120, 140, 0.12);
  color: var(--color-text-secondary);
}

.kda-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  margin-left: auto;
  flex-shrink: 0;
}

.kda-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.4;
  flex-shrink: 0;
}

.badge-mvp {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(255, 180, 0, 0.12));
  color: var(--color-highlight-text);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.badge-svp {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.18), rgba(160, 160, 180, 0.12));
  color: var(--color-text-secondary);
  border: 1px solid rgba(192, 192, 192, 0.3);
}

.kda-numbers {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.kda-ratio {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.kda-ratio.gold {
  color: var(--color-highlight-text);
  font-weight: var(--font-semibold);
}
.kda-ratio.good {
  color: var(--color-win-text);
}
.kda-ratio.poor {
  color: var(--color-text-secondary);
}

.match-time {
  font-size: 12px;
  color: var(--color-text-secondary);
  min-width: 70px;
  text-align: right;
  flex-shrink: 0;
}
</style>
