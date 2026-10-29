<template>
  <div class="lp-chart glass-panel">
    <h3 class="chart-title">{{ title }}</h3>
    <div v-if="data.length > 1" class="chart-container">
      <svg :viewBox="`0 0 ${width} ${height}`" class="chart-svg">
        <!-- Grid lines -->
        <line
          v-for="(y, i) in gridLines"
          :key="'grid-' + i"
          :x1="padding"
          :y1="y"
          :x2="width - padding"
          :y2="y"
          class="grid-line"
        />

        <!-- Line path -->
        <path :d="linePath" class="chart-line" />

        <!-- Area fill -->
        <path :d="areaPath" class="chart-area" />

        <!-- Data points -->
        <circle
          v-for="(point, i) in points"
          :key="'point-' + i"
          :cx="point.x"
          :cy="point.y"
          r="3.5"
          class="chart-point"
          :class="{ latest: i === points.length - 1 }"
        />

        <!-- Y-axis labels -->
        <text
          v-for="(label, i) in yLabels"
          :key="'ylabel-' + i"
          :x="padding - 6"
          :y="gridLines[i] + 3"
          class="axis-label"
          text-anchor="end"
        >
          {{ label }}
        </text>
      </svg>
    </div>
    <div v-else class="chart-empty">
      <span class="empty-text">暂无足够数据绘制图表</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    data: number[];
  }>(),
  {
    title: '胜点走势',
  },
);

const width = 400;
const height = 160;
const padding = 40;

const chartWidth = computed(() => width - padding * 2);
const chartHeight = computed(() => height - padding * 1.5);

const minVal = computed(() => Math.min(...props.data) - 10);
const maxVal = computed(() => Math.max(...props.data) + 10);
const range = computed(() => maxVal.value - minVal.value || 1);

const points = computed(() =>
  props.data.map((val, i) => ({
    x: padding + (i / Math.max(props.data.length - 1, 1)) * chartWidth.value,
    y: padding + (1 - (val - minVal.value) / range.value) * chartHeight.value,
  })),
);

const linePath = computed(() => {
  if (points.value.length < 2) return '';
  return points.value.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
});

const areaPath = computed(() => {
  if (points.value.length < 2) return '';
  const bottomY = padding + chartHeight.value;
  const first = points.value[0];
  const last = points.value[points.value.length - 1];
  return `${linePath.value} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
});

const gridLines = computed(() => {
  const count = 4;
  return Array.from({ length: count }, (_, i) => padding + (i / (count - 1)) * chartHeight.value);
});

const yLabels = computed(() => {
  const count = 4;
  return Array.from({ length: count }, (_, i) =>
    Math.round(maxVal.value - (i / (count - 1)) * range.value),
  );
});
</script>

<style scoped>
.lp-chart {
  padding: var(--space-4);
}

.chart-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-3);
}

.chart-container {
  width: 100%;
}

.chart-svg {
  width: 100%;
  height: auto;
}

.grid-line {
  stroke: var(--color-border-light);
  stroke-width: 1;
  stroke-dasharray: 4, 4;
}

.chart-line {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-area {
  fill: url(#gradient);
  fill: rgba(0, 113, 227, 0.08);
}

.chart-point {
  fill: var(--color-bg-card);
  stroke: var(--color-accent);
  stroke-width: 2;
  transition: r var(--transition-fast);
}

.chart-point.latest {
  fill: var(--color-accent);
  r: 4.5;
}

.chart-point:hover {
  r: 5;
}

.axis-label {
  font-size: 9px;
  fill: var(--color-text-placeholder);
  font-family: var(--font-mono);
}

.chart-empty {
  display: flex;
  justify-content: center;
  padding: var(--space-6);
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}
</style>
