<template>
  <div class="page home-page">
    <header class="page-header">
      <h1 class="page-title">首页</h1>
      <p class="page-subtitle">欢迎回来</p>
    </header>

    <div class="home-grid">
      <!-- Summoner Card -->
      <SummonerCard
        :summoner="summoner"
        :is-connected="appStore.isConnected"
      />

      <!-- Solo/Duo Rank -->
      <RankCard
        title="单排/双排"
        :queue="soloQueue"
      />

      <!-- Flex Rank -->
      <RankCard
        title="灵活组排"
        :queue="flexQueue"
      />

      <!-- Recent Matches Quick View -->
      <div class="card recent-card">
        <h3 class="card-section-title">最近战绩</h3>
        <div v-if="matchStore.matchList?.length > 0" class="recent-matches">
          <div
            v-for="match in recentMatches"
            :key="match.gameId"
            class="recent-match-item"
            :class="{ win: match.win, lose: !match.win }"
            @click="goToMatch(match.gameId)"
          >
            <ChampionIcon :champion-id="match.championId" :name="match.championName" size="sm" />
            <div class="match-info">
              <span class="match-result">{{ match.win ? '胜利' : '失败' }}</span>
              <span class="match-mode">{{ getQueueName(match) }}</span>
            </div>
            <div class="match-kda">
              <span class="kda-text">{{ match.kills }}/{{ match.deaths }}/{{ match.assists }}</span>
              <span class="kda-value">{{ calculateKDA(match.kills, match.deaths, match.assists).toFixed(1) }} KDA</span>
            </div>
            <span class="match-time">{{ formatRelativeTime(match.gameCreation) }}</span>
          </div>
        </div>
        <div v-else-if="appStore.isConnected && !matchStore.loading" class="card-empty">
          <span class="empty-hint">暂无战绩数据</span>
        </div>
        <div v-else-if="matchStore.loading" class="card-empty">
          <LoadingSpinner size="sm" />
        </div>
        <div v-else class="card-empty">
          <span class="empty-hint">连接客户端后显示</span>
        </div>
      </div>

      <!-- Game Status Card -->
      <div class="card status-card">
        <h3 class="card-section-title">游戏状态</h3>
        <div class="game-status-row">
          <ConnectionStatusComp :status="appStore.connectionStatus" />
        </div>
        <div v-if="appStore.gamePhase !== 'None'" class="game-phase">
          <span class="phase-dot" />
          <span class="phase-label">{{ gamePhaseLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore, useSummonerStore, useMatchStore, useRankStore } from '@/stores';
import { calculateKDA, formatRelativeTime, getQueueNameById } from '@lol-assistant/shared';
import SummonerCard from '@/components/summoner/SummonerCard.vue';
import RankCard from '@/components/rank/RankCard.vue';
import { ChampionIcon, LoadingSpinner, ConnectionStatus as ConnectionStatusComp } from '@/components/common';

const router = useRouter();
const appStore = useAppStore();
const summonerStore = useSummonerStore();
const matchStore = useMatchStore();
const rankStore = useRankStore();

const summoner = computed(() => summonerStore.currentSummoner);

const soloQueue = computed(() => rankStore.rankStats?.queueMap?.RANKED_SOLO_5x5 ?? null);
const flexQueue = computed(() => rankStore.rankStats?.queueMap?.RANKED_FLEX_SR ?? null);

const recentMatches = computed(() => matchStore.matchList.slice(0, 5));

const gamePhaseLabel = computed(() => {
  const map: Record<string, string> = {
    Lobby: '房间中',
    Matchmaking: '匹配中',
    ReadyCheck: '准备确认',
    ChampSelect: '英雄选择',
    GameStart: '对局开始',
    InProgress: '对局中',
    WaitingForStats: '等待结算',
    EndOfGame: '对局结束',
  };
  return map[appStore.gamePhase] ?? appStore.gamePhase;
});

function getQueueName(match: { gameMode: string }): string {
  return match.gameMode || '匹配';
}

function goToMatch(gameId: number) {
  router.push({ path: '/match-history', query: { gameId: String(gameId) } });
}

onMounted(async () => {
  if (appStore.isConnected && summoner.value) {
    if (!rankStore.rankStats) {
      rankStore.fetchRankStats(summoner.value.puuid);
    }
    if (matchStore.matchList.length === 0) {
      matchStore.fetchMatchList(true);
    }
  }
});
</script>

<style scoped>
.home-page {
  max-width: var(--content-max-width);
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

.home-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  border: 1px solid var(--color-border-light);
  transition: box-shadow var(--transition-normal);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-3);
}

/* Recent Matches */
.recent-card {
  grid-column: 1 / -1;
}

.recent-matches {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-match-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.recent-match-item:hover {
  background: var(--color-bg-hover);
}

.recent-match-item.win {
  border-left: 3px solid var(--color-win);
}

.recent-match-item.lose {
  border-left: 3px solid var(--color-lose);
}

.match-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 60px;
}

.match-result {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.win .match-result { color: var(--color-win); }
.lose .match-result { color: var(--color-lose); }

.match-mode {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.match-kda {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  margin-left: auto;
}

.kda-text {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.kda-value {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.match-time {
  font-size: 10px;
  color: var(--color-text-placeholder);
  min-width: 54px;
  text-align: right;
}

.card-empty {
  display: flex;
  justify-content: center;
  padding: var(--space-6) 0;
}

.empty-hint {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* Game Status */
.game-status-row {
  margin-bottom: var(--space-2);
}

.game-phase {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: rgba(0, 113, 227, 0.08);
  border-radius: var(--radius-md);
}

.phase-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  animation: pulse 1.5s ease infinite;
}

.phase-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-accent);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 800px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}
</style>
