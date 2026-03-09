<template>
  <div
    class="participant-row"
    :class="{ 'is-me': isMe }"
    @click="$emit('clickPlayer', participant.puuid)"
  >
    <div class="pr-champ">
      <ChampionIcon :champion-id="participant.championId" :name="participant.championName" size="sm" />
      <div class="pr-name-col">
        <span class="pr-name" :class="{ me: isMe }">
          {{ participant.summonerName }}
          <span v-if="participant.tagLine" class="pr-id">#{{ participant.tagLine }}</span>
        </span>
        <span v-if="showLane && laneLabel" class="pr-lane">{{ laneLabel }}</span>
      </div>
    </div>
    <div class="pr-kda">
      <div class="kda-row">
        <span v-if="participant.isMVP" class="badge badge-mvp">MVP</span>
        <span v-if="participant.isSVP" class="badge badge-svp">SVP</span>
        <span class="kda-numbers">{{ participant.kills }}/{{ participant.deaths }}/{{ participant.assists }}</span>
      </div>
      <span class="kda-ratio" :class="kdaColorClass">{{ kdaValue }} KDA</span>
    </div>
    <div class="pr-damage">
      <span class="damage-value">{{ formatNumber(participant.totalDamageDealt) }}</span>
      <div class="damage-bar-bg">
        <div class="damage-bar-fill damage-dealt" :style="{ width: damagePercent + '%' }" />
      </div>
    </div>
    <div class="pr-damage-taken">
      <span class="damage-taken-value">{{ formatNumber(participant.totalDamageTaken) }}</span>
      <div class="damage-bar-bg">
        <div class="damage-bar-fill damage-taken" :style="{ width: damageTakenPercent + '%' }" />
      </div>
    </div>
    <div class="pr-gold">
      <span class="gold-value">{{ formatNumber(participant.goldEarned) }}</span>
    </div>
    <div class="pr-items">
      <div
        v-for="(itemId, idx) in displayItems"
        :key="idx"
        class="item-slot"
        :class="{ empty: !itemId }"
      >
        <img
          v-if="itemId"
          class="item-img"
          :src="getItemIconUrl(itemId)"
          :alt="'item-' + itemId"
          loading="lazy"
          @error="onItemImgError($event)"
        />
      </div>
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
  maxDamageTaken?: number;
  showLane?: boolean;
}>();

defineEmits<{
  clickPlayer: [puuid: string];
}>();

const kdaValue = computed(() =>
  calculateKDA(props.participant.kills, props.participant.deaths, props.participant.assists).toFixed(1),
);

const kdaColorClass = computed(() => {
  if (props.participant.isMVP || props.participant.isSVP) return 'gold';
  const kda = parseFloat(kdaValue.value);
  if (kda >= 1) return 'good';
  return 'poor';
});

const laneLabel = computed(() => {
  const map: Record<string, string> = {
    TOP: '上路',
    JUNGLE: '打野',
    MIDDLE: '中路',
    MID: '中路',
    BOTTOM: '下路',
    ADC: '下路',
    UTILITY: '辅助',
    SUPPORT: '辅助',
  };
  return map[props.participant.lane] ?? '';
});

const damagePercent = computed(() => {
  if (!props.maxDamage || props.maxDamage === 0) return 0;
  return Math.min(100, (props.participant.totalDamageDealt / props.maxDamage) * 100);
});

const damageTakenPercent = computed(() => {
  if (!props.maxDamageTaken || props.maxDamageTaken === 0) return 0;
  return Math.min(100, (props.participant.totalDamageTaken / props.maxDamageTaken) * 100);
});

const displayItems = computed(() => {
  const items = props.participant.items ?? [];
  const result = items.slice(0, 7);
  while (result.length < 7) result.push(0);
  return result;
});

function getItemIconUrl(itemId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/16.5.1/img/item/${itemId}.png`;
}

function onItemImgError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}
</script>

<style scoped>
.participant-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 0.7fr 1.5fr;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.participant-row:hover {
  background: var(--color-bg-hover);
}

.participant-row.is-me {
  background: rgba(0, 113, 227, 0.05);
}

.participant-row.is-me:hover {
  background: rgba(0, 113, 227, 0.08);
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
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.pr-name.me {
  font-weight: var(--font-semibold);
  color: var(--color-accent);
}

.pr-id {
  font-size: 10px;
  color: var(--color-text-placeholder);
  font-family: var(--font-mono);
  margin-left: 3px;
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

.kda-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.4;
  flex-shrink: 0;
}

.badge-mvp {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(255, 180, 0, 0.12));
  color: #d4a017;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.badge-svp {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.18), rgba(160, 160, 180, 0.12));
  color: #8e8ea0;
  border: 1px solid rgba(192, 192, 192, 0.3);
}

.kda-numbers {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.kda-ratio {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.kda-ratio.gold { color: var(--color-gold); font-weight: var(--font-semibold); }
.kda-ratio.good { color: var(--color-win); }
.kda-ratio.poor { color: var(--color-text-placeholder); }

.pr-damage,
.pr-damage-taken {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.damage-value,
.damage-taken-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.damage-bar-bg {
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  width: 80px;
}

.damage-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.damage-bar-fill.damage-dealt {
  background: var(--color-lose);
}

.damage-bar-fill.damage-taken {
  background: #5b8def;
}

.pr-gold {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  font-family: var(--font-mono);
  color: var(--color-gold);
}

/* 装备栏 */
.pr-items {
  display: flex;
  gap: 2px;
  flex-wrap: nowrap;
}

.item-slot {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-slot.empty {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
