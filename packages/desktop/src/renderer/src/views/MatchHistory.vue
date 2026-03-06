<template>
  <div class="page match-history-page">
    <!-- Not connected -->
    <div v-if="!appStore.isConnected" class="not-connected-card card">
      <div class="state-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </div>
      <p class="state-title">未连接客户端</p>
      <p class="state-desc">请启动英雄联盟客户端以使用战绩查询功能</p>
    </div>

    <template v-else>
    <!-- Header: 仅在查看他人战绩时显示返回按钮 -->
    <div v-if="viewingOther" class="other-banner">
      <button class="back-btn" @click="goBackToMine">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回我的账号
      </button>
      <span class="other-name">{{ otherSummonerName }} 的战绩</span>

    </div>

    <!-- 详情视图 -->
    <template v-if="showDetail">
      <div class="detail-back-bar">
        <button class="back-btn" @click="backToList">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回战绩列表
        </button>
      </div>
      <MatchDetail
        :detail="matchStore.currentMatch"
        :loading="matchStore.loadingDetail"
        :current-p-u-u-i-d="currentPUUID"
        @view-player="viewPlayerHistory"
      />
    </template>

    <!-- 列表视图 -->
    <template v-else>
      <!-- Filter Bar -->
      <MatchFilter :current-queue="currentQueue" @update:queue="onQueueChange" />

      <!-- Content -->
      <div class="match-list-panel">
        <ErrorDisplay
          v-if="matchStore.error"
          :message="matchStore.error"
          retryable
          @retry="refresh"
        />

        <template v-else-if="matchStore.matchList?.length > 0">
          <div class="match-list card">
            <MatchListItem
              v-for="match in pagedMatches"
              :key="match.gameId"
              :match="match"
              :is-expanded="false"
              @click="onSelectMatch"
            />
          </div>

          <!-- 分页器 -->
          <div class="pagination">
            <button
              class="page-btn"
              :disabled="currentPage <= 1"
              @click="goToPage(currentPage - 1)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <template v-for="p in visiblePages" :key="p">
              <span v-if="p === '...'" class="page-ellipsis">...</span>
              <button
                v-else
                class="page-btn"
                :class="{ active: currentPage === p }"
                @click="goToPage(p as number)"
              >
                {{ p }}
              </button>
            </template>
            <button
              class="page-btn"
              :disabled="currentPage >= totalPages"
              @click="goToPage(currentPage + 1)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span class="page-info">共 {{ matchStore.matchList.length }} 场</span>
          </div>
        </template>

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
    </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMatchStore, useSummonerStore, useRankStore, useAppStore } from '@/stores';
import { LoadingSpinner, EmptyState, ErrorDisplay } from '@/components/common';
import MatchFilter from '@/components/match/MatchFilter.vue';
import MatchListItem from '@/components/match/MatchListItem.vue';
import MatchDetail from '@/components/match/MatchDetail.vue';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const matchStore = useMatchStore();
const summonerStore = useSummonerStore();
const rankStore = useRankStore();

const selectedGameId = ref<number | null>(null);
const currentQueue = ref<number | undefined>(undefined);
const currentPage = ref(1);
const PAGE_SIZE = 10;

const viewingOther = computed(() => summonerStore.isViewingOther);
const otherSummonerName = computed(() => summonerStore.viewingName);
const currentPUUID = computed(() => summonerStore.activePUUID);
const showDetail = computed(() => selectedGameId.value !== null);

// totalPages 基于实际已加载的数据量，而非 totalGames（筛选后 totalGames 可能不准确）
const totalPages = computed(() => Math.max(1, Math.ceil(matchStore.matchList.length / PAGE_SIZE)));

const pagedMatches = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return matchStore.matchList.slice(start, start + PAGE_SIZE);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
});

/** 滚动到页面顶部 */
function scrollToTop() {
  nextTick(() => {
    const wrapper = document.querySelector('.content-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
  });
}

function onQueueChange(queue: number | undefined) {
  currentQueue.value = queue;
  currentPage.value = 1;
  matchStore.setFilters({ queue });
  matchStore.fetchMatchList(true);
  scrollToTop();
}

function onSelectMatch(gameId: number) {
  selectedGameId.value = gameId;
  matchStore.fetchMatchDetail(gameId);
  scrollToTop();
}

function backToList() {
  selectedGameId.value = null;
  matchStore.currentMatch = null;
  scrollToTop();
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  scrollToTop();
}

async function refresh() {
  currentPage.value = 1;
  matchStore.setFilters({ queue: currentQueue.value });
  await matchStore.fetchMatchList(true);
  scrollToTop();
}

function viewPlayerHistory(puuid: string) {
  router.push({ path: '/', query: { puuid } });
}

function goBackToMine() {
  summonerStore.resetToMe();
  currentPage.value = 1;
  selectedGameId.value = null;
  // 刷新回自己的数据
  const puuid = summonerStore.activePUUID;
  if (puuid) {
    rankStore.fetchRankStats(puuid);
  }
  matchStore.fetchMatchList(true);
  router.replace('/');
  scrollToTop();
}

onMounted(async () => {
  scrollToTop();

  const queryPUUID = route.query.puuid as string | undefined;
  const queryGameId = route.query.gameId as string | undefined;

  if (queryPUUID) {
    await summonerStore.switchPlayer(queryPUUID);
  }

  await matchStore.fetchMatchList(true);

  if (queryGameId) {
    const gid = Number(queryGameId);
    selectedGameId.value = gid;
    matchStore.fetchMatchDetail(gid);
  }
});
</script>

<style scoped>
.match-history-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.not-connected-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-6);
  min-height: 300px;
}

.state-icon {
  color: var(--color-text-placeholder);
  margin-bottom: var(--space-3);
}

.state-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.state-desc {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* 查看他人战绩的横幅 */
.other-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.detail-back-bar {
  display: flex;
  align-items: center;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-accent);
  background: rgba(0, 113, 227, 0.06);
  border: 1px solid rgba(0, 113, 227, 0.2);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: rgba(0, 113, 227, 0.12);
  border-color: rgba(0, 113, 227, 0.4);
}

.other-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

/* Match list panel */
.match-list-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
}

.card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
}

/* 分页器 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--space-2) 0;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-tertiary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  color: var(--color-text-secondary);
  background: var(--color-bg-hover);
  border-color: var(--color-border-light);
}

.page-btn.active {
  color: var(--color-accent);
  background: rgba(0, 113, 227, 0.08);
  border-color: rgba(0, 113, 227, 0.25);
  font-weight: var(--font-semibold);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-ellipsis {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  min-width: 20px;
  text-align: center;
}

.page-info {
  font-size: 10px;
  color: var(--color-text-placeholder);
  margin-left: var(--space-2);
}

</style>
