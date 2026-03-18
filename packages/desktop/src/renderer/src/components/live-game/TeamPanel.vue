<template>
  <div class="team-panel" :class="side">
    <div class="team-header">
      <div class="team-title-row">
        <span class="team-dot" />
        <span class="team-name">{{ side === 'blue' ? '蓝色方' : '红色方' }}</span>
        <span v-if="loadedCount < team.players.length" class="loading-hint">
          ({{ loadedCount }}/{{ team.players.length }} 已加载)
        </span>
      </div>
      <div v-if="teamStats" class="team-stats">
        <span class="ts-item">
          <span class="ts-label">平均段位</span>
          <span class="ts-value">{{ teamStats.avgTierLabel }}</span>
        </span>
        <span class="ts-divider" />
        <span class="ts-item">
          <span class="ts-label">平均胜率</span>
          <span class="ts-value" :class="winRateClass(teamStats.avgWinRate)">{{ formatPct(teamStats.avgWinRate) }}</span>
        </span>
        <span class="ts-divider" />
        <span class="ts-item">
          <span class="ts-label">平均KDA</span>
          <span class="ts-value" :class="kdaClass(teamStats.avgKDA)">{{ teamStats.avgKDA.toFixed(2) }}</span>
        </span>
      </div>
      <!-- Premade groups summary -->
      <div v-if="premadeGroupsSummary.length > 0" class="premade-summary">
        <svg class="premade-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span
          v-for="(group, idx) in premadeGroupsSummary"
          :key="idx"
          class="premade-group-tag"
        >
          {{ group }}
        </span>
      </div>
    </div>

    <div class="player-list">
      <LiveGamePlayerCard
        v-for="player in team.players"
        :key="player.puuid"
        :player="player"
        :is-me="player.puuid === myPuuid"
        :clickable="true"
        :premade-groups="team.premadeGroups"
        @click="$emit('player-click', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LiveGameTeam } from '@lol-assistant/shared';
import LiveGamePlayerCard from './LiveGamePlayerCard.vue';

const TIER_ORDER: Record<string, number> = {
  IRON: 1, BRONZE: 2, SILVER: 3, GOLD: 4,
  PLATINUM: 5, EMERALD: 6, DIAMOND: 7,
  MASTER: 8, GRANDMASTER: 9, CHALLENGER: 10,
};

const TIER_NAMES: Record<string, string> = {
  IRON: '黑铁', BRONZE: '黄铜', SILVER: '白银', GOLD: '黄金',
  PLATINUM: '铂金', EMERALD: '翡翠', DIAMOND: '钻石',
  MASTER: '大师', GRANDMASTER: '宗师', CHALLENGER: '王者',
};

const props = defineProps<{
  team: LiveGameTeam;
  side: 'blue' | 'red';
  myPuuid?: string;
}>();

defineEmits<{
  'player-click': [puuid: string];
}>();

const loadedCount = computed(() =>
  props.team.players.filter((p) => p.dataStatus === 'loaded').length
);

const teamStats = computed(() => {
  const loaded = props.team.players.filter((p) => p.dataStatus === 'loaded');
  if (loaded.length === 0) return null;

  const avgWinRate = loaded.reduce((s, p) => s + p.recentWinRate, 0) / loaded.length;
  const avgKDA = loaded.reduce((s, p) => s + p.recentKDA, 0) / loaded.length;

  const tierValues = loaded
    .map((p) => TIER_ORDER[p.tier.toUpperCase()] ?? 0)
    .filter((v) => v > 0);
  let avgTierLabel = '-';
  if (tierValues.length > 0) {
    const avg = tierValues.reduce((s, v) => s + v, 0) / tierValues.length;
    const rounded = Math.round(avg);
    const entry = Object.entries(TIER_ORDER).find(([, v]) => v === rounded);
    if (entry) avgTierLabel = TIER_NAMES[entry[0]] ?? entry[0];
  }

  return { avgWinRate, avgKDA, avgTierLabel };
});

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function winRateClass(rate: number): string {
  if (rate >= 0.55) return 'high';
  if (rate <= 0.45) return 'low';
  return '';
}

function kdaClass(kda: number): string {
  if (kda >= 3.5) return 'high';
  if (kda >= 2) return '';
  return 'low';
}

/** 预组队摘要文本 */
const premadeGroupsSummary = computed(() => {
  const groups = props.team.premadeGroups;
  if (!groups || groups.length === 0) return [];
  return groups.map((group) => {
    const names = group
      .map((puuid) => {
        const player = props.team.players.find((p) => p.puuid === puuid);
        return player?.summonerName ?? '???';
      })
      .join(' + ');
    return `组队: ${names}`;
  });
});
</script>

<style scoped>
.team-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.team-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-1);
}

.team-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.team-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.blue .team-dot { background: var(--color-win); }
.red .team-dot { background: var(--color-lose); }

.team-name {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.loading-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.team-stats {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.ts-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.ts-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

.ts-value {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.ts-value.high { color: var(--color-win); }
.ts-value.low { color: var(--color-lose); }

.ts-divider {
  width: 1px;
  height: 12px;
  background: var(--color-divider);
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Premade groups summary */
.premade-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: rgba(230, 126, 34, 0.06);
  border-radius: var(--radius-md);
  border: 1px solid rgba(230, 126, 34, 0.12);
  flex-wrap: wrap;
}

.premade-icon {
  color: #e67e22;
  flex-shrink: 0;
}

.premade-group-tag {
  font-size: 10px;
  color: #e67e22;
  font-weight: var(--font-semibold);
}
</style>
