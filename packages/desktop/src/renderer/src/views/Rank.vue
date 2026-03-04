<template>
  <div class="page rank-page">
    <header class="page-header">
      <h1 class="page-title">排位信息</h1>
      <p class="page-subtitle">查看当前赛季排位数据</p>
    </header>

    <LoadingSpinner v-if="rankStore.loading" size="lg" text="加载排位数据..." centered />

    <ErrorDisplay
      v-else-if="rankStore.error"
      :message="rankStore.error"
      retryable
      @retry="fetchData"
    />

    <template v-else-if="rankStore.rankStats">
      <div class="rank-grid">
        <!-- Solo/Duo -->
        <RankCard title="单排/双排" :queue="soloQueue" />

        <!-- Flex -->
        <RankCard title="灵活组排" :queue="flexQueue" />
      </div>

      <!-- Stats Summary -->
      <div class="stats-section" v-if="soloQueue || flexQueue">
        <h2 class="section-title">赛季概览</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ totalGames }}</span>
            <span class="stat-label">总场次</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" :class="overallWinRateClass">{{ overallWinRateText }}</span>
            <span class="stat-label">总胜率</span>
          </div>
          <div class="stat-card">
            <span class="stat-value wins-color">{{ totalWins }}</span>
            <span class="stat-label">总胜场</span>
          </div>
          <div class="stat-card">
            <span class="stat-value losses-color">{{ totalLosses }}</span>
            <span class="stat-label">总败场</span>
          </div>
        </div>
      </div>

      <!-- LP Chart -->
      <LPChart :data="lpHistory" title="胜点走势（模拟）" />
    </template>

    <EmptyState
      v-else
      title="暂无排位数据"
      description="连接客户端后显示排位信息"
    >
      <template #icon>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRankStore, useSummonerStore, useAppStore } from '@/stores';
import { calculateWinRate, formatPercent } from '@lol-assistant/shared';
import { LoadingSpinner, EmptyState, ErrorDisplay } from '@/components/common';
import RankCard from '@/components/rank/RankCard.vue';
import LPChart from '@/components/rank/LPChart.vue';

const rankStore = useRankStore();
const summonerStore = useSummonerStore();
const appStore = useAppStore();

const soloQueue = computed(() => rankStore.rankStats?.queueMap?.RANKED_SOLO_5x5 ?? null);
const flexQueue = computed(() => rankStore.rankStats?.queueMap?.RANKED_FLEX_SR ?? null);

const totalWins = computed(() =>
  (soloQueue.value?.wins ?? 0) + (flexQueue.value?.wins ?? 0),
);

const totalLosses = computed(() =>
  (soloQueue.value?.losses ?? 0) + (flexQueue.value?.losses ?? 0),
);

const totalGames = computed(() => totalWins.value + totalLosses.value);

const overallWinRate = computed(() =>
  calculateWinRate(totalWins.value, totalGames.value),
);

const overallWinRateText = computed(() => formatPercent(overallWinRate.value));

const overallWinRateClass = computed(() => {
  if (overallWinRate.value >= 0.6) return 'wins-color';
  if (overallWinRate.value <= 0.4) return 'losses-color';
  return '';
});

const lpHistory = computed(() => {
  const currentLP = soloQueue.value?.leaguePoints ?? 0;
  const wins = soloQueue.value?.wins ?? 0;
  const losses = soloQueue.value?.losses ?? 0;
  const games = wins + losses;
  if (games < 2) return [currentLP];

  const points: number[] = [];
  let lp = Math.max(0, currentLP - (wins - losses) * 3);
  const step = (currentLP - lp) / Math.min(games, 20);
  for (let i = 0; i <= Math.min(games, 20); i++) {
    points.push(Math.round(lp));
    lp += step + (Math.random() - 0.4) * 6;
  }
  points[points.length - 1] = currentLP;
  return points;
});

async function fetchData() {
  const puuid = summonerStore.currentSummoner?.puuid;
  if (puuid) {
    await rankStore.fetchRankStats(puuid);
  }
}

onMounted(() => {
  if (appStore.isConnected && summonerStore.currentSummoner && !rankStore.rankStats) {
    fetchData();
  }
});
</script>

<style scoped>
.rank-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-3);
}

.stats-section {
  margin-bottom: var(--space-6);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}

.stat-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.wins-color { color: var(--color-win); }
.losses-color { color: var(--color-lose); }

@media (max-width: 700px) {
  .rank-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
