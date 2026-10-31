<template>
  <section class="match-stats-chart" aria-label="对局统计图表">
    <aside class="metric-picker glass-surface" aria-label="统计指标">
      <div class="metric-picker-heading">
        <h3>统计指标</h3>
        <span>{{ metrics.length }} 项可用</span>
      </div>
      <div class="metric-groups">
        <fieldset v-for="group in groups" :key="group.name" class="metric-group">
          <legend>{{ group.name }}</legend>
          <label
            v-for="metric in group.metrics"
            :key="metric.key"
            class="metric-option"
            :class="{ selected: selectedMetric?.key === metric.key }"
          >
            <input v-model="selectedKey" type="radio" :name="inputName" :value="metric.key" />
            <span>{{ metric.label }}</span>
          </label>
        </fieldset>
        <p v-if="!metrics.length" class="metric-empty">本场暂无可用统计数据</p>
      </div>
    </aside>

    <div v-if="selectedMetric && chart" class="chart-main glass-surface">
      <header class="chart-heading">
        <div>
          <h3>{{ selectedMetric.label }}</h3>
          <p>{{ selectedMetric.description }}</p>
        </div>
        <div class="chart-legend" aria-label="队伍颜色">
          <span v-for="team in chart.teams" :key="team.teamId" :class="teamClass(team.teamId)">
            <i />{{ teamName(team.teamId) }}
          </span>
        </div>
      </header>
      <div class="comparison-plot" :aria-label="`${selectedMetric.label}，双方队员对比`">
        <div class="plot-grid" aria-hidden="true">
          <i v-for="tick in chart.ticks" :key="tick.value" :style="{ left: `${tick.percent}%` }" />
        </div>
        <div
          v-for="team in chart.teams"
          :key="team.teamId"
          class="bar-team"
          :class="teamClass(team.teamId)"
          :aria-label="`${teamName(team.teamId)}${selectedMetric.label}`"
        >
          <div
            v-for="row in team.rows"
            :key="row.participant.participantId"
            class="chart-player"
            :class="{ 'is-me': currentPUUID && row.participant.puuid === currentPUUID }"
            :title="`${row.participant.championName} · ${playerName(row.participant)}：${valueText(row.value)}`"
          >
            <ChampionIcon
              :champion-id="row.participant.championId"
              :name="row.participant.championName"
              size="sm"
            />
            <div
              class="bar-track"
              role="img"
              :aria-label="`${row.participant.championName}（${playerName(row.participant)}）：${valueText(row.value)}`"
            >
              <div
                v-if="row.value !== null"
                class="player-bar"
                :style="{ width: `${row.percent}%` }"
              />
              <span v-else class="bar-missing">未返回数据</span>
            </div>
            <span class="chart-value" :class="{ missing: row.value === null }">{{
              valueText(row.value)
            }}</span>
          </div>
        </div>
        <div class="plot-axis" aria-hidden="true">
          <span
            v-for="tick in chart.ticks"
            :key="tick.value"
            :style="{ left: `${tick.percent}%` }"
            >{{ tickText(tick.value) }}</span
          >
        </div>
      </div>
      <p class="chart-footnote" role="status">
        数据来自客户端战绩详情 · 双方使用同一刻度
        <template v-if="chart.available < detail.participants.length">
          ·
          {{ detail.participants.length - chart.available }}
          位玩家未返回该项数据，以“—”显示</template
        >
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import type { MatchDetail, Participant } from '@lol-assistant/shared';
import { availableMatchMetrics, buildMatchComparison, formatNumber } from '@lol-assistant/shared';
import ChampionIcon from '@/components/common/ChampionIcon.vue';

const props = defineProps<{ detail: MatchDetail; currentPUUID?: string }>();
const inputName = `match-chart-${useId()}`;
const selectedKey = ref('totalDamageDealtToChampions');
const metrics = computed(() =>
  availableMatchMetrics(props.detail.participants, props.detail.gameDuration),
);
const groups = computed(() =>
  [...new Set(metrics.value.map((metric) => metric.group))].map((name) => ({
    name,
    metrics: metrics.value.filter((metric) => metric.group === name),
  })),
);
const selectedMetric = computed(
  () => metrics.value.find((metric) => metric.key === selectedKey.value) ?? metrics.value[0],
);
const chart = computed(() =>
  selectedMetric.value
    ? buildMatchComparison(
        props.detail.participants,
        selectedMetric.value,
        props.detail.gameDuration,
      )
    : null,
);
watch(
  () => props.detail.gameId,
  () => {
    selectedKey.value =
      metrics.value.find((metric) => metric.key === 'totalDamageDealtToChampions')?.key ??
      metrics.value[0]?.key ??
      '';
  },
);
watch(
  metrics,
  (available) => {
    if (!available.some((metric) => metric.key === selectedKey.value))
      selectedKey.value = available[0]?.key ?? '';
  },
  { immediate: true },
);

function teamName(id: number) {
  return id === 100 ? '蓝色方' : id === 200 ? '红色方' : `队伍 ${id}`;
}
function teamClass(id: number) {
  return id === 100 ? 'team-blue' : 'team-red';
}
function playerName(player: Participant) {
  return player.summonerName + (player.tagLine ? `#${player.tagLine}` : '');
}
function valueText(value: number | null) {
  if (value === null) return '—';
  return (
    new Intl.NumberFormat('zh-CN', {
      maximumFractionDigits: selectedMetric.value?.decimals ?? 0,
    }).format(value) + (selectedMetric.value?.unit ?? '')
  );
}
function tickText(value: number) {
  return value >= 1000 ? formatNumber(value) : String(Number(value.toFixed(2)));
}
</script>

<style scoped>
.match-stats-chart {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr);
  gap: 16px;
  padding: 18px;
  --chart-blue: #189bb6;
  --chart-red: #dc355c;
}
:global([data-theme='dark']) .match-stats-chart {
  --chart-blue: #28bfd5;
  --chart-red: #ff5278;
}
.metric-picker,
.chart-main {
  min-width: 0;
  border-radius: 14px;
}
.metric-picker {
  align-self: start;
}
.metric-picker-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 14px;
  border-bottom: 1px solid var(--color-divider);
  gap: 8px;
}
.metric-picker-heading h3,
.chart-heading h3 {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}
.metric-picker-heading > span {
  color: var(--color-text-secondary);
  font-size: 10px;
  white-space: nowrap;
}
.metric-groups {
  max-height: 580px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
  scrollbar-width: thin;
}
.metric-group {
  border: 0;
  margin: 0;
  padding: 6px 0 10px;
  min-width: 0;
}
.metric-group + .metric-group {
  border-top: 1px solid var(--color-divider);
}
.metric-group legend {
  padding: 7px 6px;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
}
.metric-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-primary);
  font-size: 12px;
  line-height: 1.5;
}
.metric-option:hover {
  background-color: var(--color-bg-hover);
}
.metric-option.selected {
  background-color: var(--color-accent-soft);
  border-color: var(--color-border);
  color: var(--color-accent);
  font-weight: 600;
}
.metric-option input {
  flex-shrink: 0;
  accent-color: var(--color-accent);
  width: 14px;
  height: 14px;
  margin: 0;
}
.metric-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.chart-main {
  padding: 18px;
}
.chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.chart-heading p {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 6px;
  line-height: 1.7;
}
.chart-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
}
.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  color: var(--team-color);
}
.chart-legend i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background-color: currentColor;
}
.team-blue {
  --team-color: var(--chart-blue);
}
.team-red {
  --team-color: var(--chart-red);
}
.comparison-plot {
  position: relative;
  --avatar-column: 34px;
  --value-column: 82px;
  --row-gap: 10px;
}
.plot-grid {
  position: absolute;
  top: 0;
  bottom: 28px;
  left: calc(var(--avatar-column) + var(--row-gap));
  right: calc(var(--value-column) + var(--row-gap));
  pointer-events: none;
}
.plot-grid i {
  position: absolute;
  height: 100%;
  width: 1px;
  background-color: var(--color-divider);
}
.bar-team {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bar-team + .bar-team {
  margin-top: 24px;
}
.chart-player {
  display: grid;
  grid-template-columns: var(--avatar-column) minmax(0, 1fr) var(--value-column);
  gap: var(--row-gap);
  align-items: center;
  min-width: 0;
  min-height: 36px;
}
.chart-player :deep(.icon-img),
.chart-player :deep(.icon-placeholder) {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--team-color);
}
.chart-player.is-me :deep(.icon-img),
.chart-player.is-me :deep(.icon-placeholder) {
  border-color: var(--color-highlight-text);
}
.bar-track {
  height: 28px;
  display: flex;
  align-items: center;
  min-width: 0;
}
.player-bar {
  height: 100%;
  background-color: var(--team-color);
  border-radius: 0 3px 3px 0;
  min-width: 0;
  transition: width var(--transition-fast);
}
.chart-value {
  text-align: right;
  color: var(--color-text-primary);
  font-size: 12px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.chart-value.missing,
.bar-missing {
  color: var(--color-text-tertiary);
}
.bar-missing {
  font-size: 11px;
}
.plot-axis {
  position: relative;
  margin-left: calc(var(--avatar-column) + var(--row-gap));
  margin-right: calc(var(--value-column) + var(--row-gap));
  margin-top: 10px;
  height: 18px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}
.plot-axis span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}
.chart-footnote {
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.8;
  margin-top: 16px;
}
@container workspace (max-width: 840px) {
  .match-stats-chart {
    grid-template-columns: 1fr;
  }
  .metric-groups {
    max-height: 220px;
  }
}
@container workspace (max-width: 480px) {
  .match-stats-chart {
    padding: 12px;
    gap: 12px;
  }
  .chart-main {
    padding: 12px;
  }
  .comparison-plot {
    --avatar-column: 30px;
    --value-column: 68px;
    --row-gap: 7px;
  }
  .chart-player :deep(.icon-img),
  .chart-player :deep(.icon-placeholder) {
    width: 28px;
    height: 28px;
  }
  .chart-value {
    font-size: 11px;
  }
}
</style>
