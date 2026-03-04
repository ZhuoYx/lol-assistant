<template>
  <div
    class="match-item"
    :class="{ win: match.win, lose: !match.win, expanded: isExpanded }"
    @click="$emit('click', match.gameId)"
  >
    <!-- Result indicator -->
    <div class="result-bar" />

    <!-- Champion -->
    <ChampionIcon :champion-id="match.championId" :name="match.championName" size="md" />

    <!-- Match Info -->
    <div class="match-info">
      <span class="result-text">{{ match.win ? '胜利' : '失败' }}</span>
      <span class="match-meta">{{ queueName }} · {{ formatGameDuration(match.gameDuration) }}</span>
    </div>

    <!-- KDA -->
    <div class="kda-section">
      <span class="kda-numbers">{{ match.kills }} / <span class="deaths">{{ match.deaths }}</span> / {{ match.assists }}</span>
      <span class="kda-ratio" :class="kdaColorClass">{{ kdaValue }} KDA</span>
    </div>

    <!-- Time -->
    <span class="match-time">{{ formatRelativeTime(match.gameCreation) }}</span>

    <!-- Arrow -->
    <svg class="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MatchSummary } from '@lol-assistant/shared';
import { calculateKDA, formatRelativeTime, formatGameDuration, getQueueNameById } from '@lol-assistant/shared';
import { ChampionIcon } from '@/components/common';

const props = defineProps<{
  match: MatchSummary;
  isExpanded?: boolean;
}>();

defineEmits<{
  click: [gameId: number];
}>();

const kdaValue = computed(() =>
  calculateKDA(props.match.kills, props.match.deaths, props.match.assists).toFixed(2),
);

const kdaColorClass = computed(() => {
  const kda = calculateKDA(props.match.kills, props.match.deaths, props.match.assists);
  if (kda >= 5) return 'excellent';
  if (kda >= 3) return 'good';
  if (kda < 1.5) return 'poor';
  return '';
});

const queueName = computed(() => getQueueNameById(0) || props.match.gameMode);
</script>

<style scoped>
.match-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.match-item:hover {
  background: var(--color-bg-hover);
}

.match-item.expanded {
  background: var(--color-bg-hover);
}

.result-bar {
  width: 3px;
  height: 32px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.win .result-bar { background: var(--color-win); }
.lose .result-bar { background: var(--color-lose); }

.match-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 90px;
}

.result-text {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.win .result-text { color: var(--color-win); }
.lose .result-text { color: var(--color-lose); }

.match-meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.kda-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-left: auto;
}

.kda-numbers {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.deaths {
  color: var(--color-lose);
}

.kda-ratio {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.kda-ratio.excellent { color: var(--color-gold); font-weight: var(--font-semibold); }
.kda-ratio.good { color: var(--color-win); }
.kda-ratio.poor { color: var(--color-text-placeholder); }

.match-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  min-width: 56px;
  text-align: right;
}

.arrow-icon {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.match-item:hover .arrow-icon {
  color: var(--color-text-tertiary);
  transform: translateX(2px);
}
</style>
