<template>
  <div class="page live-game-page">
    <PageHeader title="对局分析" subtitle="双方阵容一览，掌握每位玩家的近期表现"
      ><template #actions
        ><DataSourceSelect /><span v-if="analysis" class="load-status" role="status"
          ><span
            class="load-dot"
            :class="{ active: loadedPlayerCount === totalPlayerCount, pending: hasLoadingPlayers }"
          />{{ hasLoadingPlayers ? '数据加载中' : '玩家数据' }} · {{ loadedPlayerCount }}/{{
            totalPlayerCount
          }}</span
        ></template
      ></PageHeader
    >

    <div class="live-game-content">
      <!-- Not connected -->
      <EmptyState
        class="glass-panel"
        v-if="!appStore.isConnected"
        title="未连接客户端"
        description="请启动英雄联盟客户端以使用对局分析功能"
      >
        <template #icon>
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </template>
      </EmptyState>

      <!-- Not in game -->
      <EmptyState
        class="glass-panel"
        v-else-if="!isInGame && !analysis"
        title="当前不在对局中"
        description="进入对局后将自动开始分析双方玩家数据"
      >
        <template #icon>
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
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
        class="glass-panel"
        v-else-if="error && !analysis"
        :message="error"
        :retryable="true"
        @retry="analyze()"
      />

      <!-- Analysis view -->
      <div v-else-if="analysis" class="analysis-view">
        <!-- Game info panel -->
        <LiveGamePanel :analysis="analysis" :refreshing="refreshing" @refresh="analyze()" />

        <div v-if="error" class="refresh-error" role="alert">
          {{ error }}，当前保留上次成功加载的数据。
        </div>

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

        <p class="analysis-note">
          点击玩家卡片查看战绩 · 悬停或聚焦近期对局查看英雄与 KDA · 组队标记由共同对局推测
        </p>

        <ChampionInsights
          v-if="analysis.gameMode === 'CLASSIC'"
          :champion-ids="
            [...(blueTeam?.players ?? []), ...(redTeam?.players ?? [])]
              .map((p) => p.championId)
              .filter((id) => id > 0)
          "
        />

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
import PageHeader from '@/components/common/PageHeader.vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore, useSummonerStore } from '@/stores';
import { useLiveGameStore } from '@/stores/live-game';
import { useLiveGame } from '@/composables/useLiveGame';
import { EmptyState, LoadingSpinner, ErrorDisplay } from '@/components/common';
import LiveGamePanel from '@/components/live-game/LiveGamePanel.vue';
import TeamPanel from '@/components/live-game/TeamPanel.vue';
import SpellCooldowns from '@/components/live-game/SpellCooldowns.vue';
import ChampionInsights from '@/components/live-game/ChampionInsights.vue';
import DataSourceSelect from '@/components/common/DataSourceSelect.vue';

const appStore = useAppStore();
const summonerStore = useSummonerStore();
const liveGameStore = useLiveGameStore();
const router = useRouter();

const { analysis, loading, error, refreshing, analyze } = useLiveGame();

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
  let me = blueTeam.value.players.find((p) => p.puuid === myPuuid.value);
  if (!me && redTeam.value) {
    me = redTeam.value.players.find((p) => p.puuid === myPuuid.value);
  }
  return me?.championId ?? 0;
});

/** 我的位置 */
const myPosition = computed(() => {
  if (!blueTeam.value || !myPuuid.value) return '';
  let me = blueTeam.value.players.find((p) => p.puuid === myPuuid.value);
  if (!me && redTeam.value) {
    me = redTeam.value.players.find((p) => p.puuid === myPuuid.value);
  }
  return me?.position ?? '';
});

/** 我在哪个队伍 */
const myTeamId = computed(() => {
  if (blueTeam.value?.players.some((p) => p.puuid === myPuuid.value)) return 100;
  if (redTeam.value?.players.some((p) => p.puuid === myPuuid.value)) return 200;
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
      .filter((p) => BOT_POSITIONS.has((p.position ?? '').toUpperCase()))
      .map((p) => p.championId)
      .filter((id) => id > 0);
  }

  // 其他位置：只显示对位
  const opponent = enemyTeam.players.find((p) => (p.position ?? '').toUpperCase() === myPos);
  return opponent?.championId ? [opponent.championId] : [];
});

/** 对位标签（与 enemyLaneChampIds 一一对应） */
const POSITION_CN: Record<string, string> = {
  TOP: '上路',
  JUNGLE: '打野',
  MIDDLE: '中路',
  BOTTOM: '下路',
  UTILITY: '辅助',
};

const enemyLaneLabels = computed<string[]>(() => {
  if (!myPosition.value || !myTeamId.value) return [];
  const enemyTeam = myTeamId.value === 100 ? redTeam.value : blueTeam.value;
  if (!enemyTeam) return [];

  const myPos = myPosition.value.toUpperCase();

  if (BOT_POSITIONS.has(myPos)) {
    return enemyTeam.players
      .filter((p) => BOT_POSITIONS.has((p.position ?? '').toUpperCase()))
      .map((p) => POSITION_CN[(p.position ?? '').toUpperCase()] ?? '对位');
  }

  return ['对位'];
});
</script>

<style scoped>
.live-game-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.load-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  padding: 0 2px;
  border-radius: var(--radius-full);
}

.load-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-warning);
}

.load-dot.pending {
  animation: pulse-dot 1.2s ease infinite;
}

.load-dot.active {
  background-color: var(--color-success);
  animation: none;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.live-game-content {
  min-height: 300px;
}

.live-game-content > .empty-state,
.live-game-content > .loading-spinner,
.live-game-content > .error-display {
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
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
  gap: 16px;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.analysis-note {
  color: var(--color-text-tertiary);
  font-size: 11px;
  text-align: center;
  line-height: 1.7;
}
.refresh-error {
  border: 1px solid color-mix(in srgb, var(--color-error) 25%, transparent);
  border-radius: 12px;
  padding: 12px 16px;
  color: var(--color-error);
  background-color: var(--color-lose-bg);
  font-size: 12px;
}

@container workspace (max-width: 780px) {
  .teams-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
}
</style>
