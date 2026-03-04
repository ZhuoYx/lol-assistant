<template>
  <div class="live-game-panel">
    <div class="panel-header">
      <div class="game-info">
        <span class="game-mode">{{ gameModeName }}</span>
        <span class="game-separator">&middot;</span>
        <span class="game-id">对局 #{{ analysis.gameId }}</span>
      </div>
      <div class="panel-actions">
        <button class="refresh-btn" :class="{ spinning: refreshing }" @click="$emit('refresh')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>

    <div class="teams-summary">
      <div class="team-summary blue">
        <span class="team-label">蓝色方</span>
        <span class="team-avg-tier">{{ blueAvgTier }}</span>
      </div>
      <div class="vs-badge">VS</div>
      <div class="team-summary red">
        <span class="team-label">红色方</span>
        <span class="team-avg-tier">{{ redAvgTier }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LiveGameAnalysis } from '@lol-assistant/shared';

const props = defineProps<{
  analysis: LiveGameAnalysis;
  refreshing?: boolean;
}>();

defineEmits<{
  refresh: [];
}>();

const gameModeName = computed(() => {
  const map: Record<string, string> = {
    CLASSIC: '经典模式',
    ARAM: '极地大乱斗',
    URF: '无限火力',
    PRACTICETOOL: '训练模式',
  };
  return map[props.analysis.gameMode] ?? props.analysis.gameMode;
});

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

function getAvgTierLabel(teamId: number): string {
  const team = props.analysis.teams.find((t) => t.teamId === teamId);
  if (!team) return '-';
  const loaded = team.players.filter((p) => p.dataStatus === 'loaded' && p.tier);
  if (loaded.length === 0) return '-';
  const avg = loaded.reduce((sum, p) => sum + (TIER_ORDER[p.tier.toUpperCase()] ?? 0), 0) / loaded.length;
  const rounded = Math.round(avg);
  const entry = Object.entries(TIER_ORDER).find(([, v]) => v === rounded);
  if (!entry) return '-';
  return TIER_NAMES[entry[0]] ?? entry[0];
}

const blueAvgTier = computed(() => getAvgTierLabel(100));
const redAvgTier = computed(() => getAvgTierLabel(200));
</script>

<style scoped>
.live-game-panel {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  padding: var(--space-4) var(--space-5);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.game-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.game-mode {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.game-separator {
  color: var(--color-text-placeholder);
}

.game-id {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--color-bg-hover);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-btn:hover {
  background: var(--color-bg-active);
  color: var(--color-accent);
}

.refresh-btn.spinning svg {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.teams-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.team-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  flex: 1;
  justify-content: center;
}

.team-summary.blue {
  background: var(--color-win-bg);
}

.team-summary.red {
  background: var(--color-lose-bg);
}

.team-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.team-avg-tier {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.vs-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--color-text-placeholder);
  letter-spacing: 1px;
  flex-shrink: 0;
}
</style>
