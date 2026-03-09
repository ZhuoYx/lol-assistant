<template>
  <div class="team-comp" :class="side">
    <div class="comp-header">
      <span class="comp-title">{{ side === 'ally' ? '我方阵容' : '敌方阵容' }}</span>
      <span class="comp-count">{{ picks.length }}/5</span>
    </div>

    <div class="picks-list">
      <div
        v-for="(member, i) in slots"
        :key="i"
        class="pick-slot"
        :class="{ filled: member !== null, 'is-local': member?.cellId === localCellId }"
      >
        <template v-if="member && member.championId > 0">
          <ChampionIcon
            :champion-id="member.championId"
            :name="getChampName(member.championId)"
            size="sm"
          />
          <div class="pick-info">
            <span class="champ-name">{{ getChampName(member.championId) }}</span>
            <span v-if="member.assignedPosition" class="pick-role">{{ formatRole(member.assignedPosition) }}</span>
          </div>
          <span v-if="member.cellId === localCellId" class="me-tag">我</span>
        </template>
        <template v-else>
          <div class="empty-slot">
            <div class="empty-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <circle cx="12" cy="12" r="10" opacity="0.3" />
                <line x1="12" y1="8" x2="12" y2="16" opacity="0.3" />
                <line x1="8" y1="12" x2="16" y2="12" opacity="0.3" />
              </svg>
            </div>
            <span class="empty-text">等待选择</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Banned champions -->
    <div v-if="bans.length > 0" class="bans-section">
      <span class="bans-label">禁用</span>
      <div class="bans-list">
        <div v-for="banId in bans" :key="banId" class="ban-item" :title="getChampName(banId)">
          <ChampionIcon :champion-id="banId" :name="getChampName(banId)" size="xs" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChampionIcon from '../common/ChampionIcon.vue';
import { CHAMPION_ID_MAP, CHAMPION_CN_NAME_MAP } from '@lol-assistant/shared';
import type { ChampSelectMember } from '@/composables/useDraftAssistant';

const ROLE_MAP: Record<string, string> = {
  top: '上单',
  jungle: '打野',
  middle: '中单',
  bottom: '下路',
  utility: '辅助',
};

const props = defineProps<{
  picks: ChampSelectMember[];
  bans: number[];
  side: 'ally' | 'enemy';
  localCellId: number;
}>();

/** Fill to 5 slots */
const slots = computed(() => {
  const result: (ChampSelectMember | null)[] = [...props.picks];
  while (result.length < 5) {
    result.push(null);
  }
  return result.slice(0, 5);
});

function getChampName(id: number): string {
  return CHAMPION_CN_NAME_MAP[id] ?? CHAMPION_ID_MAP[id] ?? `#${id}`;
}

function formatRole(role: string): string {
  return ROLE_MAP[role] ?? role;
}
</script>

<style scoped>
.team-comp {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.team-comp.ally {
  border-left: 3px solid var(--color-win);
}

.team-comp.enemy {
  border-left: 3px solid var(--color-lose);
}

.comp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comp-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.comp-count {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  font-family: var(--font-mono);
}

.picks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pick-slot {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  min-height: 44px;
  transition: background var(--transition-fast);
}

.pick-slot.filled {
  background: var(--color-bg-hover);
}

.pick-slot.is-local {
  background: rgba(0, 113, 227, 0.06);
  border: 1px solid rgba(0, 113, 227, 0.12);
}

.pick-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.champ-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pick-role {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.me-tag {
  font-size: 10px;
  font-weight: var(--font-bold);
  color: var(--color-accent);
  background: rgba(0, 113, 227, 0.1);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.empty-slot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.empty-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.empty-text {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* Bans */
.bans-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-divider);
}

.bans-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.bans-list {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.ban-item {
  opacity: 0.5;
  position: relative;
}

.ban-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, var(--color-lose) 40%, var(--color-lose) 44%, transparent 44%);
  border-radius: var(--radius-sm);
  pointer-events: none;
}
</style>
