<template>
  <div
    class="lg-player-card"
    :class="[premadeColorClass, { 'is-me': isMe, clickable }]"
    @click="handleClick"
  >
    <!-- Premade group tag (small badge, no "N人" text) -->
    <span v-if="premadeTag" class="premade-tag" :class="premadeTag.colorClass">
      组队
    </span>

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

    <!-- Recent matches detail strip: show each match's result, champion, and KDA -->
    <div v-if="recentMatchList.length > 0" class="recent-matches">
      <div class="recent-header">
        <span class="recent-label">最近{{ recentMatchList.length }}场</span>
        <span class="recent-summary">
          <span class="recent-wins">{{ recentWins }}胜</span>
          <span class="recent-losses">{{ recentMatchList.length - recentWins }}负</span>
          <span class="recent-wr">{{ recentWinRateText }}</span>
        </span>
      </div>
      <div class="match-list">
        <div
          v-for="(m, idx) in recentMatchList"
          :key="idx"
          class="match-item"
          :class="m.win ? 'win' : 'lose'"
        >
          <ChampionIcon
            :champion-id="m.championId"
            size="xs"
            class="match-champ-icon"
          />
          <span class="match-kda">{{ m.kills }}/{{ m.deaths }}/{{ m.assists }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LiveGamePlayer, RecentMatchSummary } from '@lol-assistant/shared';
import TierIcon from '../common/TierIcon.vue';
import ChampionIcon from '../common/ChampionIcon.vue';

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

/** 预组队颜色方案 - 用于卡片背景色 */
const PREMADE_COLORS = [
  { label: '组队A', colorClass: 'premade-a' },
  { label: '组队B', colorClass: 'premade-b' },
  { label: '组队C', colorClass: 'premade-c' },
];

const props = withDefaults(defineProps<{
  player: LiveGamePlayer;
  isMe?: boolean;
  clickable?: boolean;
  /** 该队伍的预组队分组（从 TeamPanel 传入） */
  premadeGroups?: string[][];
}>(), {
  isMe: false,
  clickable: false,
  premadeGroups: () => [],
});

const emit = defineEmits<{
  click: [puuid: string];
}>();

const positionLabel = computed(() => {
  const pos = props.player.position;
  if (!pos) return '';
  return POSITION_LABEL[pos] ?? POSITION_LABEL[pos.toUpperCase()] ?? '';
});

/** 预组队标记：查找该玩家所在的预组队分组 */
const premadeTag = computed(() => {
  if (!props.premadeGroups || props.premadeGroups.length === 0) return null;
  for (let i = 0; i < props.premadeGroups.length; i++) {
    if (props.premadeGroups[i].includes(props.player.puuid)) {
      const scheme = PREMADE_COLORS[i % PREMADE_COLORS.length];
      return {
        colorClass: scheme.colorClass,
      };
    }
  }
  return null;
});

/** 预组队背景色 CSS class */
const premadeColorClass = computed(() => {
  if (!premadeTag.value) return '';
  return `bg-${premadeTag.value.colorClass}`;
});

/** 近期战绩列表 */
const recentMatchList = computed<RecentMatchSummary[]>(() => props.player.recentMatches ?? []);

/** 近期胜场数 */
const recentWins = computed(() => recentMatchList.value.filter((m: RecentMatchSummary) => m.win).length);

/** 近期胜率文本 */
const recentWinRateText = computed(() => {
  if (recentMatchList.value.length === 0) return '';
  return `${((recentWins.value / recentMatchList.value.length) * 100).toFixed(0)}%`;
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

/* Premade group background colors - soft pastels */
.lg-player-card.bg-premade-a {
  background: rgba(186, 135, 240, 0.08);
  border-color: rgba(186, 135, 240, 0.2);
}

.lg-player-card.bg-premade-b {
  background: rgba(102, 204, 153, 0.08);
  border-color: rgba(102, 204, 153, 0.2);
}

.lg-player-card.bg-premade-c {
  background: rgba(255, 179, 102, 0.08);
  border-color: rgba(255, 179, 102, 0.2);
}

/* Override is-me when also has premade */
.lg-player-card.is-me.bg-premade-a {
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.03) 0%, rgba(186, 135, 240, 0.08) 100%);
}
.lg-player-card.is-me.bg-premade-b {
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.03) 0%, rgba(102, 204, 153, 0.08) 100%);
}
.lg-player-card.is-me.bg-premade-c {
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.03) 0%, rgba(255, 179, 102, 0.08) 100%);
}

/* Premade tag */
.premade-tag {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 9px;
  font-weight: var(--font-bold);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  z-index: 1;
  line-height: 1.4;
}

.premade-tag.premade-a {
  color: #9b59b6;
  background: rgba(186, 135, 240, 0.15);
}

.premade-tag.premade-b {
  color: #27ae60;
  background: rgba(102, 204, 153, 0.15);
}

.premade-tag.premade-c {
  color: #e67e22;
  background: rgba(255, 179, 102, 0.15);
}

.card-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
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

/* ─── Recent matches detail ─── */
.recent-matches {
  padding: var(--space-2) var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recent-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

.recent-summary {
  display: flex;
  gap: 6px;
  font-size: 10px;
  font-family: var(--font-mono);
}

.recent-wins {
  color: var(--color-win);
  font-weight: var(--font-semibold);
}

.recent-losses {
  color: var(--color-lose);
  font-weight: var(--font-semibold);
}

.recent-wr {
  color: var(--color-text-tertiary);
}

.match-list {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.match-item {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 5px 2px 2px;
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--font-mono);
  line-height: 1.4;
}

.match-champ-icon {
  flex-shrink: 0;
}

.match-champ-icon :deep(.icon-img),
.match-champ-icon :deep(.icon-placeholder) {
  width: 16px !important;
  height: 16px !important;
  font-size: 8px !important;
  border-radius: 3px !important;
}

.match-item.win {
  background: rgba(52, 199, 89, 0.1);
}

.match-item.lose {
  background: rgba(255, 59, 48, 0.1);
}

.match-kda {
  color: var(--color-text-secondary);
  font-size: 10px;
}
</style>
