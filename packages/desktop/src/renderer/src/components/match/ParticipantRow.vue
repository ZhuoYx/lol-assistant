<template>
  <div
    class="participant-row"
    :class="{ 'is-me': isMe }"
    @click="$emit('clickPlayer', participant.puuid)"
  >
    <div class="pr-champ">
      <ChampionIcon :champion-id="participant.championId" :name="participant.championName" size="sm" />
      <div class="pr-name-col">
        <span class="pr-name" :class="{ me: isMe }">{{ participant.summonerName }}</span>
        <span class="pr-lane">{{ laneLabel }}</span>
      </div>
    </div>
    <div class="pr-kda">
      <span class="kda-numbers">{{ participant.kills }}/{{ participant.deaths }}/{{ participant.assists }}</span>
      <span class="kda-ratio" :class="kdaClass">{{ kdaValue }}</span>
    </div>
    <div class="pr-damage">
      <span class="damage-value">{{ formatNumber(participant.totalDamageDealt) }}</span>
      <div class="damage-bar-bg">
        <div class="damage-bar-fill" :style="{ width: damagePercent + '%' }" />
      </div>
    </div>
    <div class="pr-gold">
      <span class="gold-value">{{ formatNumber(participant.goldEarned) }}</span>
    </div>
    <div class="pr-vision">
      <span class="vision-value">{{ participant.visionScore }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Participant } from '@lol-assistant/shared';
import { calculateKDA, formatNumber } from '@lol-assistant/shared';
import { ChampionIcon } from '@/components/common';

const props = defineProps<{
  participant: Participant;
  isMe?: boolean;
  maxDamage?: number;
}>();

defineEmits<{
  clickPlayer: [puuid: string];
}>();

const kdaValue = computed(() =>
  calculateKDA(props.participant.kills, props.participant.deaths, props.participant.assists).toFixed(2),
);

const kdaClass = computed(() => {
  const kda = parseFloat(kdaValue.value);
  if (kda >= 5) return 'excellent';
  if (kda >= 3) return 'good';
  if (kda < 1.5) return 'poor';
  return '';
});

const laneLabel = computed(() => {
  const map: Record<string, string> = {
    TOP: '上路',
    JUNGLE: '打野',
    MIDDLE: '中路',
    BOTTOM: '下路',
    UTILITY: '辅助',
  };
  return map[props.participant.lane] ?? '';
});

const damagePercent = computed(() => {
  if (!props.maxDamage || props.maxDamage === 0) return 0;
  return Math.min(100, (props.participant.totalDamageDealt / props.maxDamage) * 100);
});
</script>

<style scoped>
.participant-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 0.6fr;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.participant-row:hover {
  background: var(--color-bg-hover);
}

.participant-row.is-me {
  background: rgba(0, 113, 227, 0.04);
}

.pr-champ {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.pr-name-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pr-name {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pr-name.me {
  font-weight: var(--font-semibold);
  color: var(--color-accent);
}

.pr-lane {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.pr-kda {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.kda-numbers {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.kda-ratio {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.kda-ratio.excellent { color: var(--color-gold); }
.kda-ratio.good { color: var(--color-win); }
.kda-ratio.poor { color: var(--color-text-placeholder); }

.pr-damage {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.damage-value {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.damage-bar-bg {
  height: 3px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  width: 80px;
}

.damage-bar-fill {
  height: 100%;
  background: var(--color-lose);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.pr-gold {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-gold);
}

.pr-vision {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}
</style>
