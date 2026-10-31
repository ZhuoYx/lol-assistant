<template>
  <article class="lg-player-card glass-surface" :class="{ 'is-me': isMe, clickable }">
    <button
      v-if="clickable"
      class="player-link"
      :aria-label="`查看 ${player.summonerName}${player.tagLine ? '#' + player.tagLine : ''} 的战绩`"
      :title="`查看 ${player.summonerName}${player.tagLine ? '#' + player.tagLine : ''} 的战绩`"
      @click="handleClick"
    />
    <div class="identity-row">
      <div class="portrait">
        <ChampionIcon :champion-id="player.championId" :name="player.championName" size="md" />
        <span v-if="positionLabel" class="position-tag">{{ positionLabel }}</span>
      </div>
      <div class="player-info">
        <div class="name-row">
          <strong
            class="player-name"
            :title="`${player.summonerName}${player.tagLine ? '#' + player.tagLine : ''}`"
            >{{ player.summonerName || '未知召唤师' }}</strong
          >
          <span v-if="player.tagLine" class="player-tag">#{{ player.tagLine }}</span>
          <span v-if="isMe" class="me-badge">我</span>
          <span
            v-if="premadeTag"
            class="premade-tag"
            :class="premadeTag.colorClass"
            :title="premadeTag.title"
            >{{ premadeTag.label }}</span
          >
        </div>
        <span class="champion-name">{{ player.championName || '英雄未确定' }}</span>
      </div>
      <div class="rank-info">
        <template v-if="player.dataStatus === 'loaded'">
          <TierIcon
            :tier="player.tier || 'UNRANKED'"
            :division="player.tier ? player.division : ''"
            size="sm"
          />
          <span v-if="player.tier" class="lp-text">{{ player.leaguePoints }} LP</span>
        </template>
        <span v-else-if="player.dataStatus === 'loading'" class="status-text"
          ><i class="loading-dot" />加载中</span
        >
        <span v-else class="status-text failed">获取失败</span>
      </div>
    </div>

    <div v-if="player.dataStatus === 'loaded'" class="player-stats">
      <div class="stat-block">
        <span class="stat-label">本英雄胜率</span>
        <div class="stat-main">
          <strong
            :class="player.championGamesPlayed > 0 ? winRateClass(player.championWinRate) : ''"
            >{{
              player.championGamesPlayed > 0 ? formatWinRate(player.championWinRate) : '—'
            }}</strong
          >
          <small>{{
            player.championGamesPlayed > 0 ? `${player.championGamesPlayed} 场` : '暂无场次'
          }}</small>
        </div>
      </div>
      <div class="stat-block">
        <span class="stat-label">近期 KDA</span>
        <div class="stat-main">
          <strong :class="recentMatchList.length ? kdaClass(player.recentKDA) : ''">{{
            recentMatchList.length ? player.recentKDA.toFixed(2) : '—'
          }}</strong>
          <small v-if="recentMatchList.length"
            >胜率 {{ formatWinRate(player.recentWinRate) }}</small
          >
        </div>
      </div>
      <div class="stat-block">
        <span class="stat-label">英雄熟练度</span>
        <div class="stat-main">
          <strong class="mastery">{{
            player.championMasteryLevel > 0 ? `Lv.${player.championMasteryLevel}` : '—'
          }}</strong>
        </div>
      </div>
    </div>
    <div v-else class="stats-placeholder" :class="{ skeleton: player.dataStatus === 'loading' }">
      {{
        player.dataStatus === 'loading'
          ? '正在获取段位与近期表现…'
          : '暂时无法获取玩家统计，可刷新后重试'
      }}
    </div>

    <div class="recent-matches">
      <div class="recent-header">
        <span
          >近期战绩<span v-if="recentMatchList.length" class="recent-count">
            · {{ recentMatchList.length }} 场</span
          ></span
        >
        <span v-if="recentMatchList.length" class="recent-summary"
          ><b class="high">{{ recentWins }}胜</b
          ><b class="low">{{ recentMatchList.length - recentWins }}负</b></span
        >
        <span v-else class="no-matches">{{
          player.dataStatus === 'loading' ? '等待加载' : '暂无记录'
        }}</span>
      </div>
      <div v-if="recentMatchList.length" class="match-list">
        <div
          v-for="m in recentMatchList"
          :key="m.gameId"
          class="match-item"
          :class="m.win ? 'win' : 'lose'"
          :title="matchTitle(m)"
          :aria-label="matchTitle(m)"
          tabindex="0"
        >
          <ChampionIcon :champion-id="m.championId" size="xs" class="match-champ-icon" />
          <span class="match-result">{{ m.win ? '胜' : '负' }}</span>
          <span class="match-tooltip" role="tooltip">{{ matchTitle(m) }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  getChampionDisplayName,
  type LiveGamePlayer,
  type RecentMatchSummary,
} from '@lol-assistant/shared';
import TierIcon from '../common/TierIcon.vue';
import ChampionIcon from '../common/ChampionIcon.vue';

const props = withDefaults(
  defineProps<{
    player: LiveGamePlayer;
    isMe?: boolean;
    clickable?: boolean;
    premadeGroups?: string[][];
  }>(),
  { isMe: false, clickable: false, premadeGroups: () => [] },
);
const emit = defineEmits<{ click: [puuid: string] }>();
const POSITION_LABEL: Record<string, string> = {
  TOP: '上',
  JUNGLE: '野',
  MIDDLE: '中',
  MID: '中',
  BOTTOM: '下',
  ADC: '下',
  UTILITY: '辅',
  SUPPORT: '辅',
  SUP: '辅',
};
const positionLabel = computed(
  () => POSITION_LABEL[props.player.position?.toUpperCase() ?? ''] ?? '',
);
const premadeTag = computed(() => {
  const index = props.premadeGroups.findIndex((group) => group.includes(props.player.puuid));
  if (index < 0) return null;
  return {
    colorClass: `premade-${index % 3}`,
    label: `组队 ${index + 1}`,
    title: `疑似组队 ${index + 1}，根据共同对局推测`,
  };
});
const recentMatchList = computed(() => props.player.recentMatches ?? []);
const recentWins = computed(() => recentMatchList.value.filter((m) => m.win).length);
function handleClick() {
  emit('click', props.player.puuid);
}
function formatWinRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}
function winRateClass(rate: number) {
  return rate >= 0.6 ? 'high' : rate <= 0.4 ? 'low' : '';
}
function kdaClass(kda: number) {
  return kda >= 4 ? 'high' : kda < 2.5 ? 'low' : '';
}
function matchTitle(m: RecentMatchSummary) {
  return `${getChampionDisplayName(m.championId)} · ${m.win ? '胜利' : '失败'} · ${m.kills}/${m.deaths}/${m.assists}`;
}
</script>

<style scoped>
.player-tag {
  color: var(--color-text-secondary);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.lg-player-card {
  position: relative;
  min-width: 0;
  padding: 14px 16px 12px;
  border-radius: 15px;
  background-color: var(--color-bg-nested);
  border: 1px solid var(--color-border-light);
  box-shadow:
    0 3px 12px rgba(12, 25, 50, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}
.lg-player-card.clickable:hover {
  border-color: color-mix(in srgb, var(--team-color, var(--color-accent)) 35%, transparent);
  box-shadow: var(--shadow-md);
}
.lg-player-card.is-me {
  border-color: color-mix(in srgb, var(--color-accent) 48%, transparent);
  box-shadow: inset 3px 0 var(--color-accent);
}
.player-link {
  position: absolute;
  inset: 0;
  z-index: 1;
  border: 0;
  background-color: transparent;
  border-radius: inherit;
}
.identity-row {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.portrait {
  position: relative;
  flex-shrink: 0;
  padding-bottom: 3px;
}
.position-tag {
  position: absolute;
  right: -4px;
  bottom: -3px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  font-size: 10px;
  font-weight: 600;
}
.player-info {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.player-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 650;
}
.champion-name {
  display: block;
  color: var(--color-text-tertiary);
  font-size: 11px;
  margin-top: 4px;
}
.me-badge,
.premade-tag {
  flex-shrink: 0;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 10px;
  line-height: 1.5;
}
.me-badge {
  color: var(--color-accent);
  background-color: var(--color-accent-soft);
}
.premade-tag {
  position: relative;
  z-index: 2;
}
.premade-0 {
  color: var(--color-tier-master);
  background-color: rgba(155, 89, 182, 0.12);
}
.premade-1 {
  color: var(--color-success);
  background-color: rgba(20, 133, 93, 0.12);
}
.premade-2 {
  color: var(--color-warning);
  background-color: rgba(170, 103, 8, 0.12);
}
.rank-info {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.lp-text {
  color: var(--color-text-tertiary);
  font: 10px var(--font-mono);
}
.status-text {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--color-text-tertiary);
  font-size: 11px;
}
.failed {
  color: var(--color-error);
}
.loading-dot {
  width: 5px;
  height: 5px;
  background-color: var(--color-accent);
  border-radius: 50%;
  animation: player-pulse 1s ease infinite;
}
.player-stats {
  display: grid;
  grid-template-columns: 1.08fr 1.25fr 0.8fr;
  gap: 12px;
  min-height: 48px;
  margin-top: 12px;
}
.stat-block {
  min-width: 0;
}
.stat-block + .stat-block {
  border-left: 1px solid var(--color-divider);
  padding-left: 12px;
}
.stat-label {
  color: var(--color-text-tertiary);
  font-size: 11px;
}
.stat-main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 3px 6px;
  margin-top: 3px;
}
.stat-main strong {
  font: 600 17px var(--font-mono);
  letter-spacing: -0.5px;
}
.stat-main small {
  color: var(--color-text-tertiary);
  font-size: 10px;
  white-space: nowrap;
}
.high {
  color: var(--color-win-text);
}
.low {
  color: var(--color-lose-text);
}
.stat-main .mastery {
  font-size: 15px;
  color: var(--color-highlight-text);
}
.stats-placeholder {
  display: flex;
  align-items: center;
  min-height: 48px;
  margin-top: 12px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}
.skeleton {
  animation: player-pulse 1.5s ease infinite;
}
.recent-matches {
  min-height: 58px;
  border-top: 1px solid var(--color-divider);
  margin-top: 10px;
  padding-top: 9px;
}
.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 10px;
}
.recent-count,
.no-matches {
  color: var(--color-text-tertiary);
}
.recent-summary {
  display: flex;
  gap: 8px;
  font-weight: 500;
}
.match-list {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 4px;
  margin-top: 7px;
}
.match-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  border-radius: 5px;
  border-bottom: 2px solid;
  padding: 3px 1px 2px;
  gap: 2px;
}
.match-item.win {
  background-color: var(--color-win-bg);
  border-bottom-color: var(--color-win);
}
.match-item.lose {
  background-color: var(--color-lose-bg);
  border-bottom-color: var(--color-lose);
}
.match-result {
  font-size: 9px;
  line-height: 1;
}
.win .match-result {
  color: var(--color-win-text);
}
.lose .match-result {
  color: var(--color-lose-text);
}
.match-champ-icon :deep(.icon-img),
.match-champ-icon :deep(.icon-placeholder) {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  font-size: 9px;
}
.match-item {
  z-index: 2;
}
.match-item:hover,
.match-item:focus-visible {
  z-index: 3;
}
.match-tooltip {
  position: absolute;
  bottom: calc(100% + 7px);
  left: 0;
  z-index: 5;
  width: max-content;
  max-width: 200px;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  border-radius: 7px;
  padding: 7px 9px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  color: var(--color-text-primary);
  font-size: 11px;
}
.match-item:nth-child(n + 6) .match-tooltip {
  left: auto;
  right: 0;
}
.match-item:hover .match-tooltip,
.match-item:focus-visible .match-tooltip {
  visibility: visible;
  opacity: 1;
}
@keyframes player-pulse {
  50% {
    opacity: 0.45;
  }
}
@container team (max-width: 370px) {
  .lg-player-card {
    padding: 12px;
  }
  .stat-main strong {
    font-size: 15px;
  }
  .stat-main small {
    display: block;
    flex-basis: 100%;
  }
  .match-result {
    display: none;
  }
  .player-stats,
  .stats-placeholder {
    min-height: 58px;
  }
  .player-stats {
    gap: 8px;
  }
  .stat-block + .stat-block {
    padding-left: 8px;
  }
}
</style>
