<template>
  <div
    class="lg-player-card"
    :class="[strengthClass, { 'is-me': isMe, clickable }]"
    @click="handleClick"
  >
    <!-- Strength indicator bar -->
    <div class="strength-bar" :class="strengthClass" />

    <div class="card-main">
      <div class="card-left">
        <span v-if="positionLabel" class="position-tag">{{ positionLabel }}</span>
        <ChampionIcon
          :champion-id="player.championId"
          :name="player.championName"
          size="md"
        />
        <div class="player-info">
          <div class="name-row">
            <span class="player-name" :class="{ 'is-me': isMe }">
              {{ player.summonerName }}
            </span>
            <span v-if="isMe" class="me-badge">我</span>
          </div>

          <div v-if="player.dataStatus === 'loaded'" class="tier-row">
            <TierIcon :tier="player.tier || 'UNRANKED'" :division="player.tier ? player.division : ''" size="sm" />
            <span v-if="player.tier" class="lp-text">{{ player.leaguePoints }} LP</span>
          </div>
          <div v-else-if="player.dataStatus === 'loading'" class="tier-row">
            <span class="status-loading">
              <span class="dot-pulse" />
              加载中
            </span>
          </div>
          <div v-else class="tier-row">
            <span class="status-failed">数据获取失败</span>
          </div>
        </div>
      </div>

      <div v-if="player.dataStatus === 'loaded'" class="card-right">
        <div class="stat-block">
          <span class="stat-label">英雄胜率</span>
          <div class="stat-main">
            <span class="stat-value" :class="winRateClass(player.championWinRate)">
              {{ formatWinRate(player.championWinRate) }}
            </span>
            <span class="stat-sub">{{ player.championGamesPlayed }}场</span>
          </div>
          <div class="mini-bar">
            <div class="mini-bar-fill" :class="winRateBarClass(player.championWinRate)" :style="{ width: `${player.championWinRate * 100}%` }" />
          </div>
        </div>

        <div class="stat-block">
          <span class="stat-label">近期KDA</span>
          <div class="stat-main">
            <span class="stat-value" :class="kdaClass(player.recentKDA)">
              {{ player.recentKDA.toFixed(2) }}
            </span>
            <span class="stat-sub">{{ formatWinRate(player.recentWinRate) }}</span>
          </div>
          <div class="mini-bar">
            <div class="mini-bar-fill" :class="winRateBarClass(player.recentWinRate)" :style="{ width: `${player.recentWinRate * 100}%` }" />
          </div>
        </div>

        <div class="stat-block mastery">
          <span class="stat-label">熟练度</span>
          <span class="mastery-level">Lv.{{ player.championMasteryLevel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LiveGamePlayer } from '@lol-assistant/shared';
import TierIcon from '../common/TierIcon.vue';
import ChampionIcon from '../common/ChampionIcon.vue';

const TIER_ORDER: Record<string, number> = {
  IRON: 1, BRONZE: 2, SILVER: 3, GOLD: 4,
  PLATINUM: 5, EMERALD: 6, DIAMOND: 7,
  MASTER: 8, GRANDMASTER: 9, CHALLENGER: 10,
};

const POSITION_LABEL: Record<string, string> = {
  TOP: '上',
  JUNGLE: '野',
  MIDDLE: '中',
  BOTTOM: '下',
  UTILITY: '辅',
  top: '上',
  jungle: '野',
  middle: '中',
  bottom: '下',
  utility: '辅',
};

const props = withDefaults(defineProps<{
  player: LiveGamePlayer;
  myTier?: string;
  isMe?: boolean;
  clickable?: boolean;
}>(), {
  myTier: '',
  isMe: false,
  clickable: false,
});

const emit = defineEmits<{
  click: [puuid: string];
}>();

const strengthClass = computed(() => {
  // 自己不显示实力标记，避免"自己比自己高"的困惑
  if (props.isMe) return 'neutral';
  if (props.player.dataStatus !== 'loaded' || !props.myTier) return 'neutral';
  const myOrder = TIER_ORDER[props.myTier.toUpperCase()] ?? 0;
  const playerOrder = TIER_ORDER[props.player.tier.toUpperCase()] ?? 0;
  if (myOrder === 0 || playerOrder === 0) return 'neutral';
  const diff = playerOrder - myOrder;
  if (diff >= 2) return 'much-higher';
  if (diff === 1) return 'higher';
  if (diff <= -2) return 'much-lower';
  if (diff === -1) return 'lower';
  return 'even';
});

const positionLabel = computed(() => {
  const pos = props.player.position;
  if (!pos) return '';
  return POSITION_LABEL[pos] ?? POSITION_LABEL[pos.toUpperCase()] ?? '';
});

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

function winRateBarClass(rate: number): string {
  if (rate >= 0.6) return 'bar-high';
  if (rate <= 0.4) return 'bar-low';
  return 'bar-mid';
}

function kdaClass(kda: number): string {
  if (kda >= 4) return 'high';
  if (kda >= 2.5) return '';
  return 'low';
}
</script>

<style scoped>
.lg-player-card {
  position: relative;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.lg-player-card.clickable {
  cursor: pointer;
}

.lg-player-card.clickable:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.lg-player-card.is-me {
  border-color: rgba(0, 113, 227, 0.2);
  background: rgba(0, 113, 227, 0.03);
}

/* Strength indicator bar (left edge) */
.strength-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
}

.strength-bar.much-higher { background: var(--color-lose); }
.strength-bar.higher { background: var(--color-warning); }
.strength-bar.even { background: var(--color-text-placeholder); }
.strength-bar.lower { background: var(--color-success); }
.strength-bar.much-lower { background: var(--color-success); opacity: 0.6; }
.strength-bar.neutral { background: transparent; }

.card-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  padding-left: calc(var(--space-4) + 3px);
}

.card-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex: 1;
}

.position-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 10px;
  font-weight: var(--font-bold);
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.player-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-name.is-me {
  color: var(--color-accent);
}

.me-badge {
  font-size: 10px;
  font-weight: var(--font-bold);
  color: var(--color-accent);
  background: rgba(0, 113, 227, 0.1);
  padding: 0px 5px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.tier-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.lp-text {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.status-loading {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.dot-pulse {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-text-placeholder);
  animation: pulse 1.2s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.status-failed {
  font-size: var(--text-xs);
  color: var(--color-error);
  opacity: 0.8;
}

.card-right {
  display: flex;
  gap: var(--space-5);
  flex-shrink: 0;
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 64px;
}

.stat-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.3px;
}

.stat-main {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.stat-value {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.stat-value.high { color: var(--color-win); }
.stat-value.low { color: var(--color-lose); }

.stat-sub {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.mini-bar {
  width: 100%;
  height: 2px;
  background: var(--color-bg-tertiary);
  border-radius: 1px;
  overflow: hidden;
}

.mini-bar-fill {
  height: 100%;
  border-radius: 1px;
  transition: width var(--transition-normal);
}

.bar-high { background: var(--color-win); }
.bar-mid { background: var(--color-text-placeholder); }
.bar-low { background: var(--color-lose); }

.stat-block.mastery {
  justify-content: center;
  min-width: 48px;
}

.mastery-level {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-gold);
  font-family: var(--font-mono);
}
</style>
