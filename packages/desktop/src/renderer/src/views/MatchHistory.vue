<template>
  <div class="page match-history-page">
    <header class="page-header">
      <div class="header-top">
        <div>
          <h1 class="page-title">
            {{ viewingOther ? otherSummonerName + ' 的战绩' : '战绩查询' }}
          </h1>
          <p class="page-subtitle">查看历史对局记录与详细数据</p>
        </div>
        <button v-if="viewingOther" class="back-btn" @click="goBackToMine">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回我的战绩
        </button>
      </div>
    </header>

    <!-- Filter -->
    <MatchFilter :current-queue="currentQueue" @update:queue="onQueueChange" />

    <div class="match-layout">
      <!-- Match List -->
      <div class="match-list-panel">
        <ErrorDisplay
          v-if="matchStore.error"
          :message="matchStore.error"
          retryable
          @retry="refresh"
        />

        <div v-else-if="matchStore.matchList?.length > 0" class="match-list" ref="listRef">
          <MatchListItem
            v-for="match in matchStore.matchList"
            :key="match.gameId"
            :match="match"
            :is-expanded="selectedGameId === match.gameId"
            @click="onSelectMatch"
          />

          <!-- Load More -->
          <div v-if="matchStore.hasMore" class="load-more" ref="sentinelRef">
            <LoadingSpinner v-if="matchStore.loading" size="sm" />
            <button v-else class="load-more-btn" @click="loadMore">
              加载更多
            </button>
          </div>
        </div>

        <EmptyState
          v-else-if="!matchStore.loading"
          title="暂无战绩"
          description="当前筛选条件下没有找到战绩记录"
        >
          <template #icon>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
            </svg>
          </template>
        </EmptyState>

        <LoadingSpinner v-else size="lg" text="加载战绩中..." centered />
      </div>

      <!-- Match Detail -->
      <div class="match-detail-panel">
        <MatchDetail
          :detail="matchStore.currentMatch"
          :loading="matchStore.loadingDetail"
          :current-p-u-u-i-d="currentPUUID"
          @view-player="viewPlayerHistory"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMatchStore, useSummonerStore } from '@/stores';
import { LoadingSpinner, EmptyState, ErrorDisplay } from '@/components/common';
import MatchFilter from '@/components/match/MatchFilter.vue';
import MatchListItem from '@/components/match/MatchListItem.vue';
import MatchDetail from '@/components/match/MatchDetail.vue';

const route = useRoute();
const router = useRouter();
const matchStore = useMatchStore();
const summonerStore = useSummonerStore();

const selectedGameId = ref<number | null>(null);
const currentQueue = ref<number | undefined>(undefined);
const otherSummonerName = ref('');
const sentinelRef = ref<HTMLElement>();
let observer: IntersectionObserver | null = null;

const viewingOther = computed(() => !!matchStore.currentPUUID);
const currentPUUID = computed(() => summonerStore.currentSummoner?.puuid);

function onQueueChange(queue: number | undefined) {
  currentQueue.value = queue;
  matchStore.setFilters({ queue });
  matchStore.fetchMatchList(true);
}

function onSelectMatch(gameId: number) {
  selectedGameId.value = gameId;
  matchStore.fetchMatchDetail(gameId);
}

async function loadMore() {
  if (matchStore.hasMore && !matchStore.loading) {
    await matchStore.fetchMatchList(false);
  }
}

async function refresh() {
  matchStore.setFilters({ queue: currentQueue.value });
  await matchStore.fetchMatchList(true);
}

function viewPlayerHistory(puuid: string) {
  router.push({ path: '/match-history', query: { puuid } });
}

function goBackToMine() {
  matchStore.setPUUID(undefined);
  matchStore.fetchMatchList(true);
  selectedGameId.value = null;
  router.replace('/match-history');
}

function setupIntersectionObserver() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore();
      }
    },
    { threshold: 0.1 },
  );
  if (sentinelRef.value) {
    observer.observe(sentinelRef.value);
  }
}

watch(sentinelRef, () => {
  if (sentinelRef.value) setupIntersectionObserver();
});

onMounted(async () => {
  const queryPUUID = route.query.puuid as string | undefined;
  const queryGameId = route.query.gameId as string | undefined;

  if (queryPUUID) {
    matchStore.setPUUID(queryPUUID);
    const s = await summonerStore.fetchSummonerByPUUID(queryPUUID);
    otherSummonerName.value = s?.displayName ?? '未知召唤师';
  }

  await matchStore.fetchMatchList(true);

  if (queryGameId) {
    const gid = Number(queryGameId);
    selectedGameId.value = gid;
    matchStore.fetchMatchDetail(gid);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.match-history-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-4);
}

.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-accent);
  background: transparent;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--color-accent);
  color: #ffffff;
}

/* Layout */
.match-layout {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: var(--space-4);
  min-height: 0;
}

.match-list-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  padding: var(--space-2);
  overflow-y: auto;
  max-height: calc(100vh - 280px);
}

.match-detail-panel {
  min-height: 0;
  position: sticky;
  top: 0;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: var(--space-3);
}

.load-more-btn {
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-hover);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover {
  background: var(--color-bg-active);
  color: var(--color-text-primary);
}

@media (max-width: 900px) {
  .match-layout {
    grid-template-columns: 1fr;
  }
}
</style>
