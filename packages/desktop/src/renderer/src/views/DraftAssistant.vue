<template>
  <div class="page draft-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">选人助手</h1>
        <p class="page-subtitle">
          <template v-if="isInChampSelect && session && isAram">{{ aramModeName }} · 英雄交换与推荐</template>
          <template v-else>BP 阶段克制推荐与队伍分析</template>
        </p>
      </div>
      <div v-if="isInChampSelect && session" class="header-right">
        <span v-if="isAram && isHextechAram" class="mode-badge hextech">海克斯大乱斗</span>
        <span v-else-if="isAram" class="mode-badge aram">大乱斗</span>
        <span v-else class="mode-badge ranked">排位/匹配</span>
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
        description="进入排位/匹配/大乱斗选人阶段后将自动显示推荐"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </template>
      </EmptyState>

      <!-- ═══════ ARAM 模式 ═══════ -->
      <div v-else-if="isAram" class="aram-active">
        <!-- 我方队伍 -->
        <div class="aram-section">
          <h2 class="section-title">我方阵容</h2>
          <div class="aram-team-grid">
            <div
              v-for="member in myTeamPicks"
              :key="member.cellId"
              class="aram-champion-card"
              :class="{ 'is-me': member.cellId === localPlayerCellId }"
            >
              <div class="aram-champ-icon">
                <img
                  v-if="member.championId"
                  :src="`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${member.championId}.png`"
                  :alt="getChampName(member.championId)"
                  class="champ-img"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                <div v-else class="champ-placeholder">?</div>
              </div>
              <span class="aram-champ-name">{{ getChampName(member.championId) }}</span>
              <div v-if="getAramTier(member.championId)" class="aram-tier-info">
                <span class="tier-badge" :class="`tier-${getAramTier(member.championId)!.tier.replace('+', 'plus').toLowerCase()}`">
                  {{ getAramTier(member.championId)!.tier }}
                </span>
                <span class="tier-winrate">{{ getAramTier(member.championId)!.winRate.toFixed(1) }}%</span>
              </div>
              <span v-if="member.cellId === localPlayerCellId" class="me-tag">我</span>
            </div>
          </div>
        </div>

        <!-- 板凳英雄 (可交换) -->
        <div v-if="benchChampions.length > 0" class="aram-section">
          <h2 class="section-title">可交换英雄 <span class="bench-hint">点击交换</span></h2>
          <div class="bench-grid">
            <div
              v-for="champId in benchChampions"
              :key="champId"
              class="bench-champion-card"
              :class="{ 'is-swapping': swappingChampionId === champId }"
              @click="benchSwapChampion(champId)"
            >
              <div class="bench-champ-icon">
                <img
                  :src="`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champId}.png`"
                  :alt="getChampName(champId)"
                  class="champ-img"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
              </div>
              <span class="bench-champ-name">{{ getChampName(champId) }}</span>
              <div v-if="getAramTier(champId)" class="bench-tier-info">
                <span class="tier-badge small" :class="`tier-${getAramTier(champId)!.tier.replace('+', 'plus').toLowerCase()}`">
                  {{ getAramTier(champId)!.tier }}
                </span>
                <span class="bench-winrate">{{ getAramTier(champId)!.winRate.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ARAM 提示 -->
        <div class="aram-tips card">
          <div class="tips-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>{{ aramModeName }}小贴士</span>
          </div>
          <p class="tips-text">
            点击板凳上的英雄可直接交换。Tier 和胜率数据来自 OP.GG ARAM 统计。
          </p>
        </div>
      </div>

      <!-- ═══════ 排位/匹配模式 ═══════ -->
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
  isAram,
  isHextechAram,
  aramModeName,
  benchChampions,
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
  getChampName,
  getAramTier,
  aramTierLoading,
  benchSwapChampion,
  swappingChampionId,
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
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Mode badge */
.mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.mode-badge.aram {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.25);
}

.mode-badge.hextech {
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
  border: 1px solid rgba(236, 72, 153, 0.25);
}

.mode-badge.ranked {
  background: rgba(0, 113, 227, 0.06);
  color: var(--color-accent);
  border: 1px solid rgba(0, 113, 227, 0.2);
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

/* ═══════ Ranked/Normal draft ═══════ */
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
  align-items: stretch;
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

/* ═══════ ARAM Mode ═══════ */
.aram-active {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.aram-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  padding: var(--space-4);
}

.section-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

/* ARAM team grid */
.aram-team-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}

.aram-champion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  position: relative;
  transition: all var(--transition-fast);
}

.aram-champion-card.is-me {
  background: rgba(0, 113, 227, 0.06);
  border: 1px solid rgba(0, 113, 227, 0.2);
}

.aram-champ-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--color-bg-hover);
}

.champ-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.champ-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  color: var(--color-text-placeholder);
}

.aram-champ-name {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-tag {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  font-size: 10px;
  font-weight: var(--font-bold);
  color: var(--color-accent);
  background: rgba(0, 113, 227, 0.1);
  padding: 0 4px;
  border-radius: var(--radius-sm);
}

/* Bench grid */
.bench-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: var(--space-2);
}

.bench-champion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.bench-champion-card:hover {
  border-color: rgba(168, 85, 247, 0.3);
  background: rgba(168, 85, 247, 0.04);
  cursor: pointer;
}

.bench-champion-card.is-swapping {
  opacity: 0.5;
  pointer-events: none;
}

.bench-champ-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--color-bg-hover);
}

.bench-champ-name {
  font-size: 11px;
  color: var(--color-text-tertiary);
  text-align: center;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ARAM Tips */
.aram-tips {
  padding: var(--space-3) var(--space-4);
}

.tips-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.tips-header svg {
  color: #a855f7;
}

.tips-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  line-height: 1.6;
}

/* ARAM Tier badges */
.aram-tier-info,
.bench-tier-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tier-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: var(--font-bold);
  letter-spacing: 0.5px;
  line-height: 1.4;
}

.tier-badge.small {
  font-size: 9px;
  padding: 0 4px;
}

.tier-splus { background: rgba(255, 0, 85, 0.12); color: #ff0055; }
.tier-s { background: rgba(255, 136, 0, 0.12); color: #ff8800; }
.tier-a { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.tier-b { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
.tier-c { background: rgba(156, 163, 175, 0.12); color: #9ca3af; }
.tier-d { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

.tier-winrate {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.bench-winrate {
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--color-text-placeholder);
}

.bench-hint {
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  color: var(--color-text-placeholder);
  margin-left: var(--space-2);
}
</style>
