<template>
  <div class="match-detail">
    <div v-if="loading" class="detail-loading">
      <LoadingSpinner size="md" text="加载详情..." centered />
    </div>
    <div v-else-if="detail" class="detail-content">
      <!-- Match Header -->
      <div class="detail-header">
        <span class="detail-mode">{{ detail.gameMode }}</span>
        <span class="detail-duration">{{ formatGameDuration(detail.gameDuration) }}</span>
        <span class="detail-time">{{ formatDate(detail.gameCreation) }}</span>
      </div>

      <!-- Teams -->
      <div v-for="team in detail.teams" :key="team.teamId" class="team-section">
        <div class="team-header" :class="{ win: team.win }">
          <span class="team-label">{{ team.teamId === 100 ? '蓝色方' : '红色方' }}</span>
          <span class="team-result">{{ team.win ? '胜利' : '失败' }}</span>
        </div>

        <div class="participants-list">
          <div class="participant-header-row">
            <span class="ph-champ">英雄</span>
            <span class="ph-kda">KDA</span>
            <span class="ph-damage">伤害</span>
            <span class="ph-gold">经济</span>
            <span class="ph-vision">视野</span>
          </div>
          <ParticipantRow
            v-for="p in getTeamParticipants(team.teamId)"
            :key="p.puuid"
            :participant="p"
            :is-me="p.puuid === currentPUUID"
            @click-player="$emit('viewPlayer', p.puuid)"
          />
        </div>
      </div>
    </div>
    <div v-else>
      <EmptyState title="选择一场对局" description="点击左侧战绩查看详情" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MatchDetail as MatchDetailType } from '@lol-assistant/shared';
import { formatGameDuration, formatDate } from '@lol-assistant/shared';
import { LoadingSpinner, EmptyState } from '@/components/common';
import ParticipantRow from './ParticipantRow.vue';

const props = defineProps<{
  detail: MatchDetailType | null;
  loading: boolean;
  currentPUUID?: string;
}>();

defineEmits<{
  viewPlayer: [puuid: string];
}>();

function getTeamParticipants(teamId: number) {
  if (!props.detail) return [];
  return props.detail.participants.filter((p) => p.teamId === teamId);
}
</script>

<style scoped>
.match-detail {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
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
  background: var(--color-bg-hover);
}

.team-header.win .team-result { color: var(--color-win); font-weight: var(--font-semibold); }
.team-header:not(.win) .team-result { color: var(--color-lose); font-weight: var(--font-semibold); }

.team-label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.participant-header-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 0.6fr;
  padding: var(--space-1) var(--space-4);
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border-light);
}
</style>
