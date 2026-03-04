<template>
  <div class="page home-page">
    <header class="page-header">
      <h1 class="page-title">首页</h1>
      <p class="page-subtitle">欢迎回来</p>
    </header>

    <div class="home-grid">
      <!-- Summoner Card -->
      <div class="card summoner-card">
        <div v-if="summoner" class="summoner-info">
          <div class="summoner-avatar">
            <div class="avatar-placeholder">
              {{ summoner.displayName.charAt(0) }}
            </div>
            <span class="summoner-level">{{ summoner.summonerLevel }}</span>
          </div>
          <div class="summoner-detail">
            <h2 class="summoner-name">{{ summoner.displayName }}</h2>
            <div class="xp-bar">
              <div class="xp-fill" :style="{ width: xpPercent + '%' }" />
            </div>
            <span class="xp-text">{{ summoner.xpSinceLastLevel }} / {{ summoner.xpSinceLastLevel + summoner.xpUntilNextLevel }} XP</span>
          </div>
        </div>
        <div v-else-if="!appStore.isConnected" class="empty-state">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
            </svg>
          </div>
          <p class="empty-title">未连接客户端</p>
          <p class="empty-desc">请启动英雄联盟客户端</p>
        </div>
        <div v-else class="loading-state">
          <div class="loading-spinner" />
        </div>
      </div>

      <!-- Quick Stats Card -->
      <div class="card quick-stats-card">
        <h3 class="card-title">快速概览</h3>
        <p class="card-placeholder">连接客户端后显示段位和胜率信息</p>
      </div>

      <!-- Recent Matches Card -->
      <div class="card recent-card">
        <h3 class="card-title">最近战绩</h3>
        <p class="card-placeholder">连接客户端后显示近期战绩概览</p>
      </div>

      <!-- Game Status Card -->
      <div class="card game-status-card">
        <h3 class="card-title">游戏状态</h3>
        <div class="game-status">
          <span class="status-dot" :class="appStore.connectionStatus" />
          <span>{{ appStore.gamePhase === 'None' ? '空闲中' : gamePhaseLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore, useSummonerStore } from '@/stores';

const appStore = useAppStore();
const summonerStore = useSummonerStore();

const summoner = computed(() => summonerStore.currentSummoner);

const xpPercent = computed(() => {
  if (!summoner.value) return 0;
  const total = summoner.value.xpSinceLastLevel + summoner.value.xpUntilNextLevel;
  return total > 0 ? Math.round((summoner.value.xpSinceLastLevel / total) * 100) : 0;
});

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

.card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  letter-spacing: -0.1px;
}

.card-placeholder {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Summoner Card */
.summoner-card {
  grid-column: 1 / -1;
}

.summoner-info {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.summoner-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-accent), #5856d6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: #ffffff;
}

.summoner-level {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 10px;
  font-weight: var(--font-bold);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}

.summoner-detail {
  flex: 1;
  min-width: 0;
}

.summoner-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.3px;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.xp-bar {
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-1);
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), #5856d6);
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.xp-text {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) 0;
}

.empty-icon {
  color: var(--color-text-placeholder);
  margin-bottom: var(--space-3);
}

.empty-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Loading */
.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--space-8) 0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2.5px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Game Status */
.game-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.status-dot.connected {
  background: var(--color-success);
}

.status-dot.connecting {
  background: var(--color-warning);
}

.status-dot.disconnected {
  background: var(--color-text-placeholder);
}

@media (max-width: 800px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}
</style>
