<template>
  <div class="page draft-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">选人助手</h1>
        <p class="page-subtitle">BP 阶段克制推荐与队伍分析</p>
      </div>
      <div v-if="isInChampSelect && session" class="header-right">
        <div class="timer-pill" :class="timerPhase.toLowerCase()">
          <span class="timer-phase">{{ phaseLabel }}</span>
          <span v-if="timeLeft > 0" class="timer-count">{{ timeLeft }}s</span>
        </div>
      </div>
    </header>

    <div class="draft-content">
      <!-- Not connected -->
      <EmptyState
        v-if="!appStore.isConnected"
        title="未连接客户端"
        description="请启动英雄联盟客户端以使用选人助手"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </template>
      </EmptyState>

      <!-- Not in champ select -->
      <EmptyState
        v-else-if="!isInChampSelect || !session"
        title="未在选人阶段"
        description="进入排位/匹配选人阶段后将自动显示推荐"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </template>
      </EmptyState>

      <!-- Active champ select -->
      <div v-else class="draft-active">
        <!-- Top: two team compositions side by side -->
        <div class="teams-row">
          <TeamComposition
            :picks="myTeamPicks"
            :bans="myBans"
            side="ally"
            :local-cell-id="localPlayerCellId"
          />
          <div class="vs-divider">
            <span class="vs-text">VS</span>
          </div>
          <TeamComposition
            :picks="enemyTeamPicks"
            :bans="enemyBans"
            side="enemy"
            :local-cell-id="-1"
          />
        </div>

        <!-- Bottom: counter suggestions -->
        <CounterSuggestion
          :recommendations="counterRecommendations"
          :weaknesses="enemyWeaknesses"
          :fetching="fetchingCounters"
          :data-source="dataSource"
          :data-version="dataVersion"
        />

        <!-- Data source footer -->
        <div class="draft-footer">
          <span class="footer-note">
            推荐基于
            <template v-if="dataSource === 'opgg'">OP.GG</template>
            <template v-else-if="dataSource === 'lolalytics'">Lolalytics</template>
            <template v-else>本地静态</template>
            数据
            <template v-if="dataVersion"> · 版本 {{ dataVersion }}</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores';
import { EmptyState } from '@/components/common';
import TeamComposition from '@/components/draft/TeamComposition.vue';
import CounterSuggestion from '@/components/draft/CounterSuggestion.vue';
import { useDraftAssistant } from '@/composables/useDraftAssistant';

const appStore = useAppStore();

const {
  session,
  isInChampSelect,
  myTeamPicks,
  enemyTeamPicks,
  bannedChampionIds,
  localPlayerCellId,
  timerPhase,
  timeLeft,
  counterRecommendations,
  enemyWeaknesses,
  fetchingCounters,
  dataSource,
  dataVersion,
} = useDraftAssistant();

const phaseLabel = computed(() => {
  switch (timerPhase.value) {
    case 'BAN_PICK': return '禁选中';
    case 'PLANNING': return '准备阶段';
    case 'FINALIZATION': return '确认选择';
    default: return '选人中';
  }
});

/** Split bans into my team and enemy team */
const myBans = computed(() => {
  if (!session.value) return [];
  return (session.value.bans.myTeamBans ?? []).filter((id) => id > 0);
});

const enemyBans = computed(() => {
  if (!session.value) return [];
  return (session.value.bans.theirTeamBans ?? []).filter((id) => id > 0);
});
</script>

<style scoped>
.draft-page {
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

/* Timer pill */
.timer-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  font-size: var(--text-xs);
}

.timer-phase {
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.timer-count {
  font-family: var(--font-mono);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  min-width: 28px;
  text-align: right;
}

.timer-pill.ban_pick .timer-count { color: var(--color-warning); }
.timer-pill.finalization .timer-count { color: var(--color-success); }

/* Content */
.draft-content {
  min-height: 300px;
}

.draft-content > .empty-state {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Active draft layout */
.draft-active {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Teams row */
.teams-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-4);
  align-items: start;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: var(--space-10);
}

.vs-text {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text-placeholder);
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* Footer */
.draft-footer {
  display: flex;
  justify-content: center;
  padding: var(--space-2) 0;
}

.footer-note {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}
</style>
