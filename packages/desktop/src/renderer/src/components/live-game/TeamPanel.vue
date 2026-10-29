<template>
  <section
    class="team-panel card"
    :class="side"
    :aria-label="side === 'blue' ? '蓝色方玩家' : '红色方玩家'"
  >
    <header class="team-header">
      <div class="team-title-row">
        <div class="team-heading">
          <span class="team-mark" aria-hidden="true">{{ side === 'blue' ? '蓝' : '红' }}</span>
          <div>
            <h2>
              {{ side === 'blue' ? '蓝色方' : '红色方'
              }}<span v-if="isMyTeam" class="my-team-badge">我方</span>
            </h2>
            <p>{{ team.players.length }} 位召唤师</p>
          </div>
        </div>
        <span
          class="team-load"
          :title="failedCount ? `${failedCount} 位玩家数据未获取` : '玩家数据加载进度'"
          >{{ loadedCount }}/{{ team.players.length }} 已就绪</span
        >
      </div>

      <dl class="team-stats">
        <div>
          <dt>平均段位</dt>
          <dd>{{ teamStats.avgTierLabel }}</dd>
        </div>
        <div>
          <dt>近期平均胜率</dt>
          <dd :class="teamStats.avgWinRate === null ? '' : winRateClass(teamStats.avgWinRate)">
            {{ teamStats.avgWinRate === null ? '—' : formatPct(teamStats.avgWinRate) }}
          </dd>
        </div>
        <div>
          <dt>近期平均 KDA</dt>
          <dd>{{ teamStats.avgKDA === null ? '—' : teamStats.avgKDA.toFixed(2) }}</dd>
        </div>
      </dl>

      <div class="team-footnote">
        <template v-if="premadeGroupsSummary.length">
          <span class="group-caption">疑似组队</span>
          <span
            v-for="(group, index) in premadeGroupsSummary"
            :key="index"
            class="group-chip"
            :class="`group-${index % 3}`"
            :title="group.names"
            >组队 {{ index + 1 }} · {{ group.count }} 人</span
          >
        </template>
        <span v-else>按已获取的段位及近期战绩统计</span>
      </div>
    </header>
    <div class="player-list">
      <LiveGamePlayerCard
        v-for="player in team.players"
        :key="player.puuid"
        :player="player"
        :is-me="player.puuid === myPuuid"
        clickable
        :premade-groups="team.premadeGroups"
        @click="$emit('player-click', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LiveGameTeam } from '@lol-assistant/shared';
import LiveGamePlayerCard from './LiveGamePlayerCard.vue';

const props = defineProps<{ team: LiveGameTeam; side: 'blue' | 'red'; myPuuid?: string }>();
defineEmits<{ 'player-click': [puuid: string] }>();
const TIER_ORDER: Record<string, number> = {
  IRON: 1,
  BRONZE: 2,
  SILVER: 3,
  GOLD: 4,
  PLATINUM: 5,
  EMERALD: 6,
  DIAMOND: 7,
  MASTER: 8,
  GRANDMASTER: 9,
  CHALLENGER: 10,
};
const TIER_NAMES = [
  '—',
  '黑铁',
  '黄铜',
  '白银',
  '黄金',
  '铂金',
  '翡翠',
  '钻石',
  '大师',
  '宗师',
  '王者',
];
const loadedPlayers = computed(() => props.team.players.filter((p) => p.dataStatus === 'loaded'));
const loadedCount = computed(() => loadedPlayers.value.length);
const failedCount = computed(
  () => props.team.players.filter((p) => p.dataStatus === 'failed').length,
);
const isMyTeam = computed(
  () => !!props.myPuuid && props.team.players.some((p) => p.puuid === props.myPuuid),
);
const teamStats = computed(() => {
  const recent = loadedPlayers.value.filter((p) => p.recentMatches?.length);
  const tiers = loadedPlayers.value
    .map((p) => TIER_ORDER[p.tier.toUpperCase()] ?? 0)
    .filter(Boolean);
  return {
    avgTierLabel: tiers.length
      ? TIER_NAMES[Math.round(tiers.reduce((sum, tier) => sum + tier, 0) / tiers.length)]
      : '—',
    avgWinRate: recent.length
      ? recent.reduce((sum, p) => sum + p.recentWinRate, 0) / recent.length
      : null,
    avgKDA: recent.length ? recent.reduce((sum, p) => sum + p.recentKDA, 0) / recent.length : null,
  };
});
const premadeGroupsSummary = computed(() =>
  (props.team.premadeGroups ?? []).map((group) => ({
    count: group.length,
    names: group
      .map(
        (puuid) => props.team.players.find((p) => p.puuid === puuid)?.summonerName ?? '未知召唤师',
      )
      .join(' + '),
  })),
);
function formatPct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}
function winRateClass(rate: number) {
  return rate >= 0.55 ? 'high' : rate <= 0.45 ? 'low' : '';
}
</script>

<style scoped>
.team-panel {
  --team-color: var(--color-win);
  --team-tint: var(--color-win-bg);
  min-width: 0;
  padding: 16px;
  container: team / inline-size;
  align-self: start;
  --glass-tint: linear-gradient(180deg, var(--team-tint), transparent 240px);
}
.team-panel.red {
  --team-color: var(--color-lose);
  --team-tint: var(--color-lose-bg);
}
.team-header {
  margin-bottom: 12px;
}
.team-title-row,
.team-heading {
  display: flex;
  align-items: center;
}
.team-title-row {
  justify-content: space-between;
  gap: 12px;
}
.team-heading {
  gap: 10px;
  min-width: 0;
}
.team-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 40px;
  clip-path: polygon(0 0, 100% 0, 100% 73%, 50% 100%, 0 73%);
  background: var(--team-color);
  color: white;
  font-size: 13px;
  font-weight: 650;
  padding-bottom: 4px;
}
h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.3px;
}
.team-heading p {
  margin-top: 2px;
  color: var(--color-text-tertiary);
  font-size: 11px;
}
.my-team-badge {
  color: var(--color-accent);
  background-color: var(--color-accent-soft);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}
.team-load {
  font: 11px var(--font-mono);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
.team-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-block: 16px 12px;
}
.team-stats > div + div {
  border-left: 1px solid var(--color-divider);
  padding-left: 16px;
}
dt {
  color: var(--color-text-tertiary);
  font-size: 11px;
}
dd {
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.3;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}
.high {
  color: var(--color-win-text);
}
.low {
  color: var(--color-lose-text);
}
.team-footnote {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  color: var(--color-text-tertiary);
  font-size: 10px;
}
.group-chip {
  border-radius: 5px;
  padding: 2px 6px;
}
.group-0 {
  color: var(--color-tier-master);
  background-color: rgba(155, 89, 182, 0.1);
}
.group-1 {
  color: var(--color-success);
  background-color: rgba(20, 133, 93, 0.1);
}
.group-2 {
  color: var(--color-warning);
  background-color: rgba(170, 103, 8, 0.1);
}
.player-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
@container team (max-width: 420px) {
  .team-stats {
    gap: 8px;
  }
  .team-stats > div + div {
    padding-left: 10px;
  }
  dd {
    font-size: 16px;
  }
}
@media (max-width: 620px) {
  .team-panel {
    padding: 12px;
  }
}
</style>
