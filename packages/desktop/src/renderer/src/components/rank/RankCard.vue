<template>
  <div class="rank-card card">
    <h3 class="card-section-title">{{ title }}</h3>
    <div v-if="queue && hasTier" class="rank-body">
      <div class="rank-badge">
        <TierIcon :tier="queue.tier" :division="queue.division" size="lg" />
      </div>
      <div class="rank-stats">
        <div class="rank-lp">{{ queue.leaguePoints }} <span class="lp-label">LP</span></div>
        <div class="rank-record">
          <span class="wins">{{ queue.wins }}胜</span>
          <span class="separator">/</span>
          <span class="losses">{{ queue.losses }}负</span>
        </div>
        <div class="rank-winrate">
          胜率 <span :class="winRateColorClass">{{ winRateText }}</span>
        </div>
      </div>
      <!-- Mini Series -->
      <div v-if="queue.miniSeries" class="mini-series">
        <span class="series-label">晋级赛</span>
        <div class="series-dots">
          <span
            v-for="(ch, idx) in queue.miniSeries.progress.split('')"
            :key="idx"
            class="series-dot"
            :class="{ win: ch === 'W', loss: ch === 'L', pending: ch === 'N' }"
          />
        </div>
      </div>
    </div>
    <div v-else class="rank-empty">
      <span class="empty-text">未定级</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { QueueInfo } from '@lol-assistant/shared';
import { calculateWinRate, formatPercent } from '@lol-assistant/shared';
import { TierIcon } from '@/components/common';

const props = defineProps<{
  title: string;
  queue: QueueInfo | null | undefined;
}>();

const hasTier = computed(() => {
  if (!props.queue) return false;
  return props.queue.tier && props.queue.tier !== '' && props.queue.tier !== 'NONE';
});

const winRate = computed(() => {
  if (!props.queue) return 0;
  const total = props.queue.wins + props.queue.losses;
  return calculateWinRate(props.queue.wins, total);
});

const winRateText = computed(() => formatPercent(winRate.value));

const winRateColorClass = computed(() => {
  if (winRate.value >= 0.6) return 'high';
  if (winRate.value <= 0.4) return 'low';
  return '';
});
</script>

<style scoped>
.card-section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-3);
}

.rank-body {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.rank-badge {
  flex-shrink: 0;
}

.rank-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.rank-lp {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.lp-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-tertiary);
}

.rank-record {
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.wins { color: var(--color-win); font-weight: var(--font-medium); }
.losses { color: var(--color-lose); font-weight: var(--font-medium); }
.separator { color: var(--color-text-placeholder); }

.rank-winrate {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.rank-winrate .high { color: var(--color-win); font-weight: var(--font-semibold); }
.rank-winrate .low { color: var(--color-lose); font-weight: var(--font-semibold); }

.mini-series {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding-left: var(--space-4);
  border-left: 1px solid var(--color-divider);
}

.series-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.series-dots {
  display: flex;
  gap: var(--space-1);
}

.series-dot {
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
}

.series-dot.win { background: var(--color-win); }
.series-dot.loss { background: var(--color-lose); }
.series-dot.pending { background: var(--color-bg-tertiary); border: 1px solid var(--color-border); }

.rank-empty {
  padding: var(--space-4) 0;
  text-align: center;
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}
</style>
