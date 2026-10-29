<template>
  <div class="player-card glass-surface" :class="{ clickable }" @click="handleClick">
    <div class="player-left">
      <ChampionIcon
        :champion-id="player.championId"
        :name="player.championName"
        :size="compact ? 'sm' : 'md'"
      />
      <div class="player-info">
        <span class="player-name">{{ player.summonerName }}</span>
        <div v-if="player.dataStatus === 'loaded'" class="player-meta">
          <TierIcon :tier="player.tier" :division="player.division" size="sm" />
          <span class="meta-lp">{{ player.leaguePoints }} LP</span>
        </div>
        <div v-else-if="player.dataStatus === 'loading'" class="player-meta">
          <span class="meta-loading">加载中...</span>
        </div>
        <div v-else class="player-meta">
          <span class="meta-failed">数据获取失败</span>
        </div>
      </div>
    </div>

    <div v-if="player.dataStatus === 'loaded'" class="player-right">
      <div class="stat-group">
        <span class="stat-label">英雄胜率</span>
        <span class="stat-value" :class="winRateClass(player.championWinRate)">
          {{ formatWinRate(player.championWinRate) }}
        </span>
        <span class="stat-games">{{ player.championGamesPlayed }}场</span>
      </div>
      <div class="stat-group">
        <span class="stat-label">近期KDA</span>
        <span class="stat-value" :class="kdaClass(player.recentKDA)">
          {{ player.recentKDA.toFixed(2) }}
        </span>
        <span class="stat-games">{{ formatWinRate(player.recentWinRate) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiveGamePlayer } from '@lol-assistant/shared';
import TierIcon from './TierIcon.vue';
import ChampionIcon from './ChampionIcon.vue';

const props = withDefaults(
  defineProps<{
    player: LiveGamePlayer;
    compact?: boolean;
    clickable?: boolean;
  }>(),
  {
    compact: false,
    clickable: false,
  },
);

const emit = defineEmits<{
  click: [puuid: string];
}>();

function handleClick() {
  if (props.clickable) {
    emit('click', props.player.puuid);
  }
}

function formatWinRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function winRateClass(rate: number): string {
  if (rate >= 0.6) return 'high';
  if (rate <= 0.4) return 'low';
  return '';
}

function kdaClass(kda: number): string {
  if (kda >= 4) return 'high';
  if (kda >= 2.5) return '';
  return 'low';
}
</script>

<style scoped>
.player-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--color-border-light);
  transition: all var(--transition-fast);
}

.player-card.clickable {
  cursor: pointer;
}

.player-card.clickable:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.player-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex: 1;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.player-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.meta-lp {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.meta-loading {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-failed {
  font-size: var(--text-xs);
  color: var(--color-error);
  opacity: 0.8;
}

.player-right {
  display: flex;
  gap: var(--space-5);
  flex-shrink: 0;
}

.stat-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.stat-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.stat-value {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.stat-value.high {
  color: var(--color-win-text);
}
.stat-value.low {
  color: var(--color-lose-text);
}

.stat-games {
  font-size: 10px;
  color: var(--color-text-tertiary);
}
</style>
