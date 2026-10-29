<template>
  <div class="page home-page">
    <PageHeader title="概览" subtitle="账号状态、排位进度与近期战绩" />
    <!-- 查看他人数据时的返回横幅 -->
    <div v-if="viewingOther" class="other-banner">
      <button class="back-btn" @click="goBackToMine">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回我的账号
      </button>
      <span class="other-name">正在查看: {{ viewingSummonerName }}</span>
    </div>

    <div class="home-grid">
      <!-- Summoner Card -->
      <SummonerCard :summoner="displaySummoner" :is-connected="appStore.isConnected" />

      <!-- Solo/Duo Rank -->
      <RankCard
        title="单排/双排"
        :queue="soloQueue"
        :loading="rankStore.loading"
        :is-other="summonerStore.isViewingOther"
      />

      <!-- Flex Rank -->
      <RankCard
        title="灵活组排"
        :queue="flexQueue"
        :loading="rankStore.loading"
        :is-other="summonerStore.isViewingOther"
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
            <div class="match-result-bar" />
            <ChampionIcon :champion-id="match.championId" :name="match.championName" size="md" />
            <div class="match-info">
              <span class="match-champion-name">{{ match.championName || '未知英雄' }}</span>
              <div class="match-meta-row">
                <span class="match-result">{{ match.win ? '胜利' : '失败' }}</span>
                <span class="match-mode-tag" :class="getQueueTagClass(match)">{{
                  getQueueName(match)
                }}</span>
              </div>
            </div>
            <div class="match-kda">
              <div class="kda-row">
                <span v-if="match.isMVP" class="badge badge-mvp">MVP</span>
                <span v-if="match.isSVP" class="badge badge-svp">SVP</span>
                <span class="kda-text"
                  >{{ match.kills }}/{{ match.deaths }}/{{ match.assists }}</span
                >
              </div>
              <span class="kda-value" :class="getKdaClass(match)"
                >{{ calculateKDA(match.kills, match.deaths, match.assists).toFixed(1) }} KDA</span
              >
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
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue';
import { computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore, useSummonerStore, useMatchStore, useRankStore } from '@/stores';
import { calculateKDA, formatRelativeTime, getQueueNameById } from '@lol-assistant/shared';
import SummonerCard from '@/components/summoner/SummonerCard.vue';
import RankCard from '@/components/rank/RankCard.vue';
import { ChampionIcon, LoadingSpinner } from '@/components/common';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const summonerStore = useSummonerStore();
const matchStore = useMatchStore();
const rankStore = useRankStore();

const viewingOther = computed(() => summonerStore.isViewingOther);
const viewingSummonerName = computed(() => summonerStore.viewingName);
const displaySummoner = computed(() => summonerStore.displaySummoner);

const soloQueue = computed(() => rankStore.rankStats?.queueMap?.RANKED_SOLO_5x5 ?? null);
const flexQueue = computed(() => rankStore.rankStats?.queueMap?.RANKED_FLEX_SR ?? null);

const recentMatches = computed(() => matchStore.matchList.slice(0, 8));

function getQueueName(match: { queueId: number; gameMode: string }): string {
  const name = getQueueNameById(match.queueId);
  if (name !== '其他模式') return name;
  const modeMap: Record<string, string> = {
    CLASSIC: '匹配模式',
    ARAM: '极地大乱斗',
    URF: '无限火力',
    CHERRY: '竞技场',
    TUTORIAL: '新手教程',
    PRACTICETOOL: '训练模式',
  };
  return modeMap[match.gameMode] || match.gameMode || '其他模式';
}

function getQueueTagClass(match: { queueId: number; gameMode: string }): string {
  const ranked = [420, 440];
  const aram = [450, 720, 2400];
  const fun = [900, 1020, 1300, 1400, 1700, 1710, 1900];
  const bot = [830, 840, 850, 870, 880, 890];
  const clash = [700, 720];
  if (ranked.includes(match.queueId)) return 'tag-ranked';
  if (clash.includes(match.queueId)) return 'tag-ranked';
  if (aram.includes(match.queueId)) return 'tag-aram';
  if (fun.includes(match.queueId)) return 'tag-fun';
  if (bot.includes(match.queueId)) return 'tag-bot';
  if (match.gameMode === 'ARAM') return 'tag-aram';
  if (match.gameMode === 'URF') return 'tag-fun';
  if (match.gameMode === 'CHERRY') return 'tag-fun';
  return 'tag-normal';
}

function getKdaClass(match: {
  kills: number;
  deaths: number;
  assists: number;
  isMVP?: boolean;
  isSVP?: boolean;
}): string {
  if (match.isMVP || match.isSVP) return 'kda-gold';
  const kda = calculateKDA(match.kills, match.deaths, match.assists);
  if (kda >= 1) return 'kda-good';
  return 'kda-poor';
}

function goToMatch(gameId: number) {
  router.push({ path: '/match-history', query: { gameId: String(gameId) } });
}

/** 切换查看某个用户，刷新所有数据 */
async function switchToPlayer(puuid: string) {
  await summonerStore.switchPlayer(puuid);
  reloadAllData();
}

/** 回到自己的账号，刷新所有数据 */
function goBackToMine() {
  summonerStore.resetToMe();
  reloadAllData();
  router.replace('/');
}

/** 统一刷新排位 + 战绩数据 */
function reloadAllData() {
  const puuid = summonerStore.activePUUID;
  if (!puuid) return;
  rankStore.fetchRankStats(puuid);
  matchStore.fetchMatchList(true);
}

function loadHomeData() {
  const s = summonerStore.currentSummoner;
  if (!s || !appStore.isConnected) return;
  // 如果路由带了 puuid query，说明要查看他人，由 watch/onMounted 处理
  if (route.query.puuid) return;
  // 如果当前已经在查看他人，不重复加载自己的数据
  if (summonerStore.isViewingOther) return;

  const puuid = summonerStore.activePUUID;
  if (!puuid) return;

  if (!rankStore.rankStats && !rankStore.loading) {
    rankStore.fetchRankStats(puuid);
  }
  if (matchStore.matchList.length === 0 && !matchStore.loading) {
    matchStore.fetchMatchList(true);
  }
}

// 搜索后路由带 puuid query，触发切换
watch(
  () => route.query.puuid,
  async (puuid) => {
    if (puuid && typeof puuid === 'string') {
      await switchToPlayer(puuid);
    }
  },
  { immediate: false },
);

watch(
  () => summonerStore.currentSummoner,
  (val) => {
    if (val) loadHomeData();
  },
  { immediate: true },
);

onMounted(async () => {
  const queryPUUID = route.query.puuid as string | undefined;
  if (queryPUUID) {
    await switchToPlayer(queryPUUID);
  } else if (summonerStore.isViewingOther) {
    // 从其他页面切回首页，已在查看他人，确保数据是最新的
    reloadAllData();
  }
});
</script>

<style scoped>
.home-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

/* 查看他人数据的横幅 */
.other-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background-color: rgba(0, 113, 227, 0.06);
  border: 1px solid rgba(0, 113, 227, 0.15);
  border-radius: var(--radius-lg);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-accent);
  background-color: rgba(0, 113, 227, 0.06);
  border: 1px solid rgba(0, 113, 227, 0.2);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background-color: rgba(0, 113, 227, 0.12);
  border-color: rgba(0, 113, 227, 0.4);
}

.other-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.card {
  padding: var(--space-5);
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
  gap: var(--space-2);
}

.recent-match-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
}

/* 胜负淡色背景区分 */
.recent-match-item.win {
  background-color: rgba(52, 199, 89, 0.06);
}

.recent-match-item.lose {
  background-color: rgba(255, 59, 48, 0.06);
}

.recent-match-item.win:hover {
  background-color: rgba(52, 199, 89, 0.12);
}

.recent-match-item.lose:hover {
  background-color: rgba(255, 59, 48, 0.12);
}

.match-result-bar {
  width: 3px;
  height: 36px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.win .match-result-bar {
  background-color: var(--color-win);
}
.lose .match-result-bar {
  background-color: var(--color-lose);
}

.match-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 80px;
}

.match-champion-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.match-meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.match-result {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.win .match-result {
  color: var(--color-win-text);
}
.lose .match-result {
  color: var(--color-lose-text);
}

.match-mode-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

.tag-ranked {
  background-color: rgba(99, 132, 255, 0.12);
  color: #6384ff;
}

.tag-aram {
  background-color: rgba(46, 216, 176, 0.12);
  color: #2ed8b0;
}

.tag-fun {
  background-color: rgba(255, 168, 38, 0.12);
  color: #ffa826;
}

.tag-normal {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

.tag-bot {
  background-color: rgba(162, 132, 94, 0.12);
  color: #a2845e;
}

.match-kda {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  margin-left: auto;
}

.kda-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.4;
  flex-shrink: 0;
}

.badge-mvp {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(255, 180, 0, 0.12));
  color: #d4a017;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.badge-svp {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.18), rgba(160, 160, 180, 0.12));
  color: #8e8ea0;
  border: 1px solid rgba(192, 192, 192, 0.3);
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

.kda-value.kda-gold {
  color: var(--color-highlight-text);
  font-weight: var(--font-semibold);
}

.kda-value.kda-good {
  color: var(--color-win-text);
}

.kda-value.kda-poor {
  color: var(--color-text-placeholder);
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

.home-grid {
  grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.home-grid > * {
  min-width: 0;
}
.home-grid > .summoner-card {
  grid-column: auto;
}
.match-info {
  min-width: 0;
  flex: 1;
}
.match-champion-name {
  max-width: none;
}
.other-banner {
  flex-wrap: wrap;
}
.other-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
@container workspace (max-width: 1000px) {
  .home-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .home-grid > .summoner-card {
    grid-column: 1 / -1;
  }
}
@container workspace (max-width: 580px) {
  .home-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .home-grid > .summoner-card {
    grid-column: auto;
  }
  .recent-match-item {
    flex-wrap: wrap;
    gap: 10px;
  }
  .match-time {
    flex-basis: 100%;
    text-align: left;
    padding-left: 56px;
  }
  .match-info {
    min-width: 100px;
  }
}
.recent-card {
  background-color: var(--color-bg-readable);
}
.match-time,
.kda-value {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.match-mode-tag {
  font-size: 12px;
}
.tag-aram {
  color: var(--color-success-text);
}
.tag-ranked,
.kda-good {
  color: var(--color-win-text);
}
.tag-fun {
  color: var(--color-warning);
}
</style>
