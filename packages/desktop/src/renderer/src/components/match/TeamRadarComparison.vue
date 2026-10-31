<template>
  <section class="radar-comparison" aria-label="队伍六维对比">
    <p class="radar-explanation">
      两队共用量尺：参团外圈为
      100%，其余维度以全场最高值为外圈。平均线始终保留，可勾选队员叠加个人表现。
    </p>
    <div class="radar-teams">
      <article
        v-for="team in model.teams"
        :key="team.teamId"
        class="radar-team glass-surface"
        :aria-label="`${teamName(team.teamId)}六维面板`"
      >
        <header class="radar-team-header">
          <div>
            <h3 :style="{ color: teamColor(team.teamId) }">{{ teamName(team.teamId) }}</h3>
            <span>{{ team.players.length }} 人平均</span>
          </div>
          <span class="average-legend" :style="{ color: teamColor(team.teamId) }"
            ><i />团队平均</span
          >
        </header>
        <svg
          class="radar-chart"
          viewBox="0 0 420 314"
          role="img"
          :aria-label="`${teamName(team.teamId)}输出、承伤、经济、参团、视野、控制对比图`"
        >
          <g class="radar-grid">
            <polygon
              v-for="level in [0.25, 0.5, 0.75, 1]"
              :key="level"
              :points="gridPoints(level)"
            />
            <line
              v-for="(_, index) in axes"
              :key="index"
              x1="210"
              y1="152"
              :x2="point(index, 1).x"
              :y2="point(index, 1).y"
            />
          </g>
          <g
            v-for="series in teamSeries(team)"
            :key="series.id"
            class="radar-series"
            :style="{ color: series.color }"
          >
            <title>{{ series.name }}：{{ valuesText(series.values) }}</title>
            <polygon
              v-if="series.values.every((value) => value !== null)"
              :points="seriesPoints(series.values)"
              :fill-opacity="series.average ? 0.16 : 0.04"
              :stroke-width="series.average ? 2.8 : 2"
            />
            <template v-else>
              <template v-for="(_, index) in axes" :key="index">
                <line
                  v-if="series.values[index] !== null && series.values[(index + 1) % 6] !== null"
                  :x1="valuePoint(index, series.values[index]).x"
                  :y1="valuePoint(index, series.values[index]).y"
                  :x2="valuePoint((index + 1) % 6, series.values[(index + 1) % 6]).x"
                  :y2="valuePoint((index + 1) % 6, series.values[(index + 1) % 6]).y"
                />
              </template>
            </template>
            <template v-for="(value, index) in series.values" :key="index">
              <circle
                v-if="value !== null"
                :cx="valuePoint(index, value).x"
                :cy="valuePoint(index, value).y"
                :r="series.average ? 3.2 : 2.4"
              >
                <title>
                  {{ series.name }} · {{ axes[index].description }}：{{ valueText(value, index) }}
                </title>
              </circle>
            </template>
          </g>
          <g
            v-for="(axis, index) in axes"
            :key="axis.key"
            class="radar-axis"
            :class="{ 'axis-missing': team.average[index] === null }"
          >
            <text :x="point(index, 1.32).x" :y="point(index, 1.32).y" text-anchor="middle">
              {{ axis.label }}
            </text>
            <text
              class="axis-value"
              :x="point(index, 1.32).x"
              :y="point(index, 1.32).y + 16"
              text-anchor="middle"
            >
              {{ valueText(team.average[index], index) }}
            </text>
          </g>
        </svg>
        <div class="radar-selection-header">
          <span>叠加队员 · 可多选</span
          ><button
            :disabled="!team.players.some((player) => selected.includes(player.participantId))"
            :aria-label="`清空${teamName(team.teamId)}勾选`"
            @click="clearTeam(team.teamId)"
          >
            清空
          </button>
        </div>
        <div class="radar-player-options">
          <label
            v-for="(player, index) in team.players"
            :key="player.participantId"
            class="radar-player-option"
            :class="{ selected: selected.includes(player.participantId) }"
            :style="{ '--player-color': playerColor(index) }"
            :title="`${player.summonerName}：${valuesText(model.players[player.participantId])}`"
          >
            <input
              v-model="selected"
              type="checkbox"
              :value="player.participantId"
              :aria-label="`叠加${teamName(team.teamId)} ${player.championName}（${player.summonerName}）`"
            />
            <ChampionIcon :champion-id="player.championId" :name="player.championName" size="xs" />
            <span class="player-option-text"
              ><strong>{{ player.championName }}</strong
              ><span>{{ player.summonerName }}</span></span
            >
            <span class="player-line-key" aria-hidden="true" />
          </label>
        </div>
        <p
          v-if="team.coverage.some((count) => count < team.players.length)"
          class="radar-missing-note"
        >
          部分维度未完整返回（显示“—”），对应数据不填零、不连接。
        </p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MatchDetail, MatchRadarValues } from '@lol-assistant/shared';
import { buildMatchRadar, MATCH_RADAR_AXES, formatNumber } from '@lol-assistant/shared';
import { ChampionIcon } from '@/components/common';

const props = defineProps<{ detail: MatchDetail }>();
const axes = MATCH_RADAR_AXES;
const model = computed(() => buildMatchRadar(props.detail.participants));
const selected = ref<number[]>([]);
watch(
  () => props.detail.gameId,
  () => {
    selected.value = [];
  },
);

function teamName(id: number) {
  return id === 100 ? '蓝色方' : id === 200 ? '红色方' : `队伍 ${id}`;
}
function teamColor(id: number) {
  return id === 100 ? 'var(--color-win-text)' : 'var(--color-lose-text)';
}
function playerColor(index: number) {
  return `var(--radar-player-${index % 5})`;
}
function teamSeries(team: ReturnType<typeof buildMatchRadar>['teams'][number]) {
  return [
    {
      id: 'average',
      name: `${teamName(team.teamId)}平均`,
      values: team.average,
      color: teamColor(team.teamId),
      average: true,
    },
    ...team.players.flatMap((p, index) =>
      selected.value.includes(p.participantId)
        ? [
            {
              id: String(p.participantId),
              name: p.summonerName,
              values: model.value.players[p.participantId],
              color: playerColor(index),
              average: false,
            },
          ]
        : [],
    ),
  ];
}
function clearTeam(id: number) {
  const ids = new Set(
    props.detail.participants.filter((p) => p.teamId === id).map((p) => p.participantId),
  );
  selected.value = selected.value.filter((id) => !ids.has(id));
}
function point(index: number, ratio: number) {
  const angle = ((-90 + index * 60) * Math.PI) / 180;
  return { x: 210 + Math.cos(angle) * 88 * ratio, y: 152 + Math.sin(angle) * 88 * ratio };
}
function valuePoint(index: number, value: number | null) {
  const limit = model.value.limits[index];
  return point(index, value === null || limit === 0 ? 0 : Math.min(1, Math.max(0, value / limit)));
}
function gridPoints(ratio: number) {
  return axes
    .map((_, index) => {
      const p = point(index, ratio);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}
function seriesPoints(values: MatchRadarValues) {
  return values
    .map((value, index) => {
      const p = valuePoint(index, value);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}
function valueText(value: number | null, index: number) {
  if (value === null) return '—';
  return axes[index].unit
    ? `${Number(value.toFixed(1))}${axes[index].unit}`
    : formatNumber(Math.round(value));
}
function valuesText(values: MatchRadarValues) {
  return values.map((value, index) => `${axes[index].label} ${valueText(value, index)}`).join('，');
}
</script>

<style scoped>
.radar-comparison {
  padding: 18px;
  --radar-player-0: #986800;
  --radar-player-1: #137b64;
  --radar-player-2: #8241b5;
  --radar-player-3: #ba3c70;
  --radar-player-4: #236fa7;
}
:global([data-theme='dark']) .radar-comparison {
  --radar-player-0: #ffd479;
  --radar-player-1: #7fe3c5;
  --radar-player-2: #c8a4ff;
  --radar-player-3: #ff9dbd;
  --radar-player-4: #7ecbff;
}
.radar-explanation {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.8;
  margin-bottom: 16px;
}
.radar-teams {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.radar-team {
  padding: 16px;
  min-width: 0;
}
.radar-team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.radar-team-header h3 {
  font-size: 15px;
  margin-bottom: 2px;
}
.radar-team-header span {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.average-legend {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}
.average-legend i {
  display: inline-block;
  width: 20px;
  border-top: 3px solid currentColor;
}
.radar-chart {
  display: block;
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  overflow: visible;
}
.radar-grid polygon {
  fill: var(--color-bg-inset);
  stroke: var(--color-border);
  stroke-width: 1;
}
.radar-grid line {
  stroke: var(--color-border);
  stroke-width: 1;
}
.radar-series polygon {
  fill: currentColor;
  stroke: currentColor;
  stroke-linejoin: round;
}
.radar-series line {
  stroke: currentColor;
  stroke-width: 2;
}
.radar-series circle {
  fill: currentColor;
}
.radar-axis text {
  fill: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}
.radar-axis .axis-value {
  fill: var(--color-text-secondary);
  font-size: 12px;
  font-family: var(--font-mono);
  font-weight: 400;
}
.axis-missing text {
  fill: var(--color-text-placeholder);
}
.radar-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--color-divider);
  padding-top: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.radar-selection-header button {
  background-color: transparent;
  color: var(--color-accent);
  border: 0;
  padding: 4px 6px;
  font-size: 12px;
}
.radar-selection-header button:disabled {
  color: var(--color-text-placeholder);
}
.radar-player-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.radar-player-option {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background-color: var(--color-bg-inset);
  cursor: pointer;
  min-width: 0;
}
.radar-player-option.selected {
  border-color: var(--player-color);
}
.radar-player-option input {
  accent-color: var(--player-color);
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}
.radar-player-option :deep(.champion-icon) {
  flex-shrink: 0;
}
.player-option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.player-option-text strong,
.player-option-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-option-text strong {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.player-option-text span {
  font-size: 10px;
  color: var(--color-text-secondary);
}
.player-line-key {
  width: 12px;
  flex-shrink: 0;
  border-top: 2px solid var(--player-color);
}
.radar-missing-note {
  margin-top: 12px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}
@container workspace (max-width:900px) {
  .radar-teams {
    grid-template-columns: 1fr;
  }
}
@container workspace (max-width:440px) {
  .radar-player-options {
    grid-template-columns: 1fr;
  }
  .radar-comparison {
    padding: 12px;
  }
}
</style>
