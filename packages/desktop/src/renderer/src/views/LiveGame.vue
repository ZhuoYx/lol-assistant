<template>
  <div class="page live-game-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">对局分析</h1>
        <p class="page-subtitle">实时查看双方玩家数据</p>
      </div>
      <div v-if="analysis" class="header-right">
        <span class="load-status">
          <span class="load-dot" :class="{ active: !hasLoadingPlayers }" />
          {{ loadedPlayerCount }}/{{ totalPlayerCount }} 已加载
        </span>
      </div>
    </header>

    <div class="live-game-content">
      <!-- Not connected -->
      <EmptyState
        v-if="!appStore.isConnected"
        title="未连接客户端"
        description="请启动英雄联盟客户端以使用对局分析功能"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </template>
      </EmptyState>

      <!-- Not in game -->
      <EmptyState
        v-else-if="!isInGame && !analysis"
        title="当前不在对局中"
        description="进入对局后将自动开始分析双方玩家数据"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </template>
      </EmptyState>

      <!-- Loading initial data -->
      <LoadingSpinner
        v-else-if="loading && !analysis"
        size="lg"
        text="正在获取对局数据..."
        :centered="true"
      />

      <!-- Error state -->
      <ErrorDisplay
        v-else-if="error && !analysis"
        :message="error"
        :retryable="true"
        @retry="analyze"
      />

      <!-- Analysis view -->
      <div v-else-if="analysis" class="analysis-view">
        <!-- Game info panel -->
        <LiveGamePanel
          :analysis="analysis"
          :refreshing="refreshing"
          @refresh="analyze"
        />

        <!-- Two-team layout -->
        <div class="teams-grid">
          <TeamPanel
            v-if="blueTeam"
            :team="blueTeam"
            side="blue"
            :my-puuid="myPuuid"
            @player-click="handlePlayerClick"
          />
          <TeamPanel
            v-if="redTeam"
            :team="redTeam"
            side="red"
            :my-puuid="myPuuid"
            @player-click="handlePlayerClick"
          />
        </div>

        <!-- Spell Cooldowns -->
        <SpellCooldowns
          v-if="myChampId"
          :my-champ-id="myChampId"
          :enemy-champ-ids="enemyLaneChampIds"
          :enemy-labels="enemyLaneLabels"
        />


      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore, useSummonerStore } from '@/stores';
import { useLiveGameStore } from '@/stores/live-game';
import { useLiveGame } from '@/composables/useLiveGame';
import { EmptyState, LoadingSpinner, ErrorDisplay } from '@/components/common';
import LiveGamePanel from '@/components/live-game/LiveGamePanel.vue';
import TeamPanel from '@/components/live-game/TeamPanel.vue';
import SpellCooldowns from '@/components/live-game/SpellCooldowns.vue';

const appStore = useAppStore();
const summonerStore = useSummonerStore();
const liveGameStore = useLiveGameStore();
const router = useRouter();

const {
  analysis,
  loading,
  error,
  refreshing,
  analyze,
} = useLiveGame();

const blueTeam = computed(() => liveGameStore.blueTeam);
const redTeam = computed(() => liveGameStore.redTeam);
const loadedPlayerCount = computed(() => liveGameStore.loadedPlayerCount);
const totalPlayerCount = computed(() => liveGameStore.totalPlayerCount);
const hasLoadingPlayers = computed(() => liveGameStore.hasLoadingPlayers);

const isInGame = computed(() => {
  const phase = appStore.gamePhase;
  return phase === 'InProgress' || phase === 'GameStart' || phase === 'ChampSelect';
});

const myPuuid = computed(() => summonerStore.currentSummoner?.puuid ?? '');



function handlePlayerClick(puuid: string) {
  router.push({
    path: '/',
    query: { puuid },
  });
}

/** 我方英雄 ID */
const myChampId = computed(() => {
  if (!blueTeam.value || !myPuuid.value) return 0;
  // 先在蓝队找
  let me = blueTeam.value.players.find(p => p.puuid === myPuuid.value);
  if (!me && redTeam.value) {
    me = redTeam.value.players.find(p => p.puuid === myPuuid.value);
  }
  return me?.championId ?? 0;
});

/** 我的位置 */
const myPosition = computed(() => {
  if (!blueTeam.value || !myPuuid.value) return '';
  let me = blueTeam.value.players.find(p => p.puuid === myPuuid.value);
  if (!me && redTeam.value) {
    me = redTeam.value.players.find(p => p.puuid === myPuuid.value);
  }
  return me?.position ?? '';
});

/** 我在哪个队伍 */
const myTeamId = computed(() => {
  if (blueTeam.value?.players.some(p => p.puuid === myPuuid.value)) return 100;
  if (redTeam.value?.players.some(p => p.puuid === myPuuid.value)) return 200;
  return 0;
});

/** 对位敌方英雄 ID 列表：下路/辅助同时显示两者 */
const BOT_POSITIONS = new Set(['BOTTOM', 'UTILITY']);

const enemyLaneChampIds = computed<number[]>(() => {
  if (!myPosition.value || !myTeamId.value) return [];
  const enemyTeam = myTeamId.value === 100 ? redTeam.value : blueTeam.value;
  if (!enemyTeam) return [];

  const myPos = myPosition.value.toUpperCase();

  // 下路/辅助：同时显示对面下路和辅助
  if (BOT_POSITIONS.has(myPos)) {
    return enemyTeam.players
      .filter(p => BOT_POSITIONS.has((p.position ?? '').toUpperCase()))
      .map(p => p.championId)
      .filter(id => id > 0);
  }

  // 其他位置：只显示对位
  const opponent = enemyTeam.players.find(p =>
    (p.position ?? '').toUpperCase() === myPos
  );
  return opponent?.championId ? [opponent.championId] : [];
});

/** 对位标签（与 enemyLaneChampIds 一一对应） */
const POSITION_CN: Record<string, string> = {
  TOP: '上路', JUNGLE: '打野', MIDDLE: '中路', BOTTOM: '下路', UTILITY: '辅助',
};

const enemyLaneLabels = computed<string[]>(() => {
  if (!myPosition.value || !myTeamId.value) return [];
  const enemyTeam = myTeamId.value === 100 ? redTeam.value : blueTeam.value;
  if (!enemyTeam) return [];

  const myPos = myPosition.value.toUpperCase();

  if (BOT_POSITIONS.has(myPos)) {
    return enemyTeam.players
      .filter(p => BOT_POSITIONS.has((p.position ?? '').toUpperCase()))
      .map(p => POSITION_CN[(p.position ?? '').toUpperCase()] ?? '对位');
  }

  return ['对位'];
});
</script>

<style scoped>
.live-game-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.header-left {
  display: flex;
  flex-direction: column;
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

.header-right {
  flex-shrink: 0;
}

.load-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
}

.load-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-warning);
  animation: pulse-dot 1.2s ease infinite;
}

.load-dot.active {
  background: var(--color-success);
  animation: none;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.live-game-content {
  min-height: 300px;
}

.live-game-content > .empty-state,
.live-game-content > .loading-spinner,
.live-game-content > .error-display {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analysis-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}


</style>
