<template>
  <div class="match-detail glass-panel">
    <div v-if="loading" class="detail-loading">
      <LoadingSpinner size="md" text="加载详情..." centered />
    </div>
    <div v-else-if="detail && detail.participants?.length > 0" class="detail-content">
      <!-- Match Header -->
      <div class="detail-header">
        <span class="detail-mode">{{ modeName }}</span>
        <span class="detail-duration">{{ formatGameDuration(detail.gameDuration) }}</span>
        <span class="detail-time">{{ formatDate(detail.gameCreation) }}</span>
      </div>

      <!-- Teams -->
      <div v-for="team in displayTeams" :key="team.teamId" class="team-section">
        <div
          class="team-header"
          :class="{ 'team-blue': team.teamId === 100, 'team-red': team.teamId !== 100 }"
        >
          <div class="team-left">
            <span class="team-indicator" />
            <span class="team-label">{{ team.teamId === 100 ? '蓝色方' : '红色方' }}</span>
          </div>
          <span class="team-result" :class="{ win: team.win }">{{
            team.win ? '胜利' : '失败'
          }}</span>
        </div>

        <p class="table-scroll-hint">可横向滚动查看完整装备和数据</p>
        <div
          class="participants-list"
          tabindex="0"
          role="region"
          :aria-label="`${team.teamId === 100 ? '蓝色方' : '红色方'}对局数据，可横向滚动`"
        >
          <div class="participant-header-row">
            <span class="ph-champ">英雄</span>
            <span class="ph-kda">KDA</span>
            <span class="ph-damage">输出</span>
            <span class="ph-damage-taken">承受</span>
            <span class="ph-gold">经济</span>
            <span class="ph-items">装备</span>
          </div>
          <ParticipantRow
            v-for="p in getTeamParticipants(team.teamId)"
            :key="p.puuid || p.championId"
            :participant="p"
            :is-me="p.puuid === currentPUUID"
            :max-damage="allMaxDamage"
            :max-damage-taken="allMaxDamageTaken"
            :show-lane="isRanked"
            @click-player="$emit('viewPlayer', p.puuid)"
          />
        </div>
      </div>
    </div>
    <div v-else-if="!loading" class="detail-empty">
      <div class="empty-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
      </div>
      <span class="empty-title">暂无详情数据</span>
      <span class="empty-desc">无法获取此场对局的详细信息</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MatchDetail as MatchDetailType } from '@lol-assistant/shared';
import { formatGameDuration, formatDate, getQueueNameById } from '@lol-assistant/shared';
import { LoadingSpinner } from '@/components/common';
import ParticipantRow from './ParticipantRow.vue';

const props = defineProps<{
  detail: MatchDetailType | null;
  loading: boolean;
  currentPUUID?: string;
}>();

defineEmits<{
  viewPlayer: [puuid: string];
}>();

const modeName = computed(() => {
  if (!props.detail) return '';
  const name = getQueueNameById(props.detail.queueId ?? 0);
  if (name !== '其他模式') return name;
  const modeMap: Record<string, string> = {
    CLASSIC: '匹配模式',
    ARAM: '极地大乱斗',
    URF: '无限火力',
    CHERRY: '竞技场',
  };
  return modeMap[props.detail.gameMode] || props.detail.gameMode || '对局详情';
});

// 当 teams 为空时，从 participants 推断队伍信息
const displayTeams = computed(() => {
  if (!props.detail) return [];
  if (props.detail.teams && props.detail.teams.length > 0) {
    return props.detail.teams;
  }
  // 从 participants 推断
  const teamIds = [...new Set(props.detail.participants.map((p) => p.teamId))];
  return teamIds.map((teamId) => {
    const teamParticipants = props.detail!.participants.filter((p) => p.teamId === teamId);
    const win = teamParticipants.length > 0 ? teamParticipants[0].win : false;
    return { teamId, win, bans: [], objectives: {} };
  });
});

// 全场最高伤害（用于伤害条百分比计算）
const allMaxDamage = computed(() => {
  if (!props.detail) return 1;
  return Math.max(...props.detail.participants.map((p) => p.totalDamageDealt), 1);
});

// 全场最高承受伤害
const allMaxDamageTaken = computed(() => {
  if (!props.detail) return 1;
  return Math.max(...props.detail.participants.map((p) => p.totalDamageTaken), 1);
});

const POSITION_ORDER: Record<string, number> = {
  TOP: 1,
  JUNGLE: 2,
  MIDDLE: 3,
  MID: 3,
  BOTTOM: 4,
  ADC: 4,
  UTILITY: 5,
  SUPPORT: 5,
};

const isRanked = computed(() => {
  const queueId = props.detail?.queueId ?? 0;
  return queueId === 420 || queueId === 440;
});

function getTeamParticipants(teamId: number) {
  if (!props.detail) return [];
  const players = props.detail.participants.filter((p) => p.teamId === teamId);
  // 排位赛按位置排序
  if (isRanked.value) {
    players.sort((a, b) => {
      const orderA = POSITION_ORDER[a.lane?.toUpperCase() ?? ''] ?? 99;
      const orderB = POSITION_ORDER[b.lane?.toUpperCase() ?? ''] ?? 99;
      return orderA - orderB;
    });
  }
  return players;
}
</script>

<style scoped>
.match-detail {
  overflow: hidden;
}

.detail-loading {
  padding: var(--space-8);
}

.detail-content {
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.detail-mode {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.detail-duration {
  font-family: var(--font-mono);
}

.detail-time {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.team-section {
  border-bottom: 1px solid var(--color-divider);
}

.team-section:last-child {
  border-bottom: none;
}

.team-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}

.team-header.team-blue {
  background-color: rgba(68, 133, 244, 0.06);
}

.team-header.team-red {
  background-color: rgba(234, 67, 53, 0.06);
}

.team-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.team-indicator {
  width: 3px;
  height: 14px;
  border-radius: var(--radius-full);
}

.team-blue .team-indicator {
  background-color: #4485f4;
}

.team-red .team-indicator {
  background-color: #ea4335;
}

.team-label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.team-blue .team-label {
  color: #4485f4;
}

.team-red .team-label {
  color: #ea4335;
}

.team-result {
  font-weight: var(--font-semibold);
  font-size: var(--text-xs);
  color: var(--color-lose-text);
}

.team-result.win {
  color: var(--color-win-text);
}

.participant-header-row {
  display: grid;
  grid-template-columns: var(--participant-columns);
  min-width: 820px;
  padding: var(--space-1) var(--space-4);
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border-light);
}

/* Empty state */
.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-4);
  gap: var(--space-2);
}

.empty-icon {
  color: var(--color-text-placeholder);
  opacity: 0.5;
  margin-bottom: var(--space-1);
}

.empty-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.empty-desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.participants-list {
  --participant-columns: minmax(180px, 1fr) 120px 100px 100px 80px 180px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
.detail-header {
  flex-wrap: wrap;
}
.table-scroll-hint {
  display: none;
  padding: 6px 16px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  background-color: var(--color-bg-inset);
}
@container workspace (max-width: 840px) {
  .table-scroll-hint {
    display: block;
  }
  .detail-time {
    margin-left: 0;
  }
}
</style>
