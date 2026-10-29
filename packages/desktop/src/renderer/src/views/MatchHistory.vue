<template>
  <div class="page match-history-page">
    <PageHeader title="战绩" subtitle="回顾每一场对局，查看双方表现与出装" />
    <!-- Not connected -->
    <div v-if="!appStore.isConnected" class="not-connected-card card">
      <div class="state-icon">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </div>
      <p class="state-title">未连接客户端</p>
      <p class="state-desc">请启动英雄联盟客户端以使用战绩查询功能</p>
    </div>

    <template v-else>
      <!-- Header: 仅在查看他人战绩时显示返回按钮 -->
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
        <span class="other-name">{{ otherSummonerName }} 的战绩</span>
      </div>

      <!-- 详情视图 -->
      <template v-if="showDetail">
        <div class="detail-back-bar">
          <button class="back-btn" @click="backToList">
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
            class="glass-panel"
            v-if="matchStore.error && !matchStore.matchList.length"
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
          </template>

          <EmptyState
            class="glass-panel"
            v-else-if="!matchStore.loading"
            title="暂无战绩"
            description="当前筛选条件下没有找到战绩记录"
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
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </template>
          </EmptyState>

          <LoadingSpinner v-else size="lg" text="加载战绩中..." centered />
          <section
            v-if="matchStore.matchList.length || matchStore.hasMore || matchStore.paginationNotice"
            class="history-navigation glass-panel"
            aria-label="战绩分页与加载"
          >
            <nav v-if="matchStore.matchList.length" class="pagination" aria-label="战绩页码">
              <button
                class="page-btn page-step"
                :disabled="currentPage <= 1 || matchStore.loading"
                aria-label="上一页"
                @click="goToPage(currentPage - 1)"
              >
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
                上一页
              </button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="page-ellipsis">…</span>
                <button
                  v-else
                  class="page-btn"
                  :class="{ active: currentPage === p, 'page-unloaded': Number(p) > totalPages }"
                  :aria-current="currentPage === p ? 'page' : undefined"
                  :aria-label="Number(p) > totalPages ? `加载第${p}页` : `第${p}页`"
                  :title="Number(p) > totalPages ? '继续获取更早战绩' : undefined"
                  :disabled="matchStore.loading"
                  @click="goToPage(Number(p))"
                >
                  {{ p }}
                </button>
              </template>
              <button
                class="page-btn page-step"
                :disabled="matchStore.loading || (currentPage >= totalPages && !matchStore.hasMore)"
                aria-label="下一页"
                @click="goToPage(currentPage + 1)"
              >
                下一页
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </nav>
            <div class="history-load-row">
              <div class="history-count" role="status" aria-live="polite">
                <strong>已加载 {{ matchStore.matchList.length }} 场战绩</strong>
                <span v-if="matchStore.matchList.length">当前显示第 {{ displayedRange }} 场</span>
                <span v-else>本批次没有符合筛选条件的战绩</span>
                <span v-if="matchStore.hasMore" class="batch-hint"
                  >每批 {{ matchStore.pageSize }} 场，可继续加载更早记录</span
                >
                <span v-else-if="!matchStore.paginationNotice">客户端暂无更早记录</span>
              </div>
              <button
                v-if="matchStore.hasMore"
                class="load-more-btn"
                :disabled="matchStore.loading"
                @click="loadMoreMatches"
              >
                {{ matchStore.loading ? '正在加载更早战绩…' : '继续加载更早战绩' }}
              </button>
            </div>
            <p v-if="matchStore.paginationNotice" class="history-notice" role="status">
              {{ matchStore.paginationNotice }}
            </p>
            <p
              v-if="matchStore.error && matchStore.matchList.length"
              class="history-fetch-error"
              role="alert"
            >
              {{ matchStore.error }}。已保留当前记录，请重新加载更早战绩。
            </p>
            <p v-else-if="loadNotice" class="history-notice" role="status">{{ loadNotice }}</p>
          </section>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue';
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
const loadNotice = ref('');
const PAGE_SIZE = 10;

const viewingOther = computed(() => summonerStore.isViewingOther);
const otherSummonerName = computed(() => summonerStore.viewingName);
const currentPUUID = computed(() => summonerStore.activePUUID);
const showDetail = computed(() => selectedGameId.value !== null);

// totalPages 基于实际已加载的数据量，而非 totalGames（筛选后 totalGames 可能不准确）
const totalPages = computed(() => Math.max(1, Math.ceil(matchStore.matchList.length / PAGE_SIZE)));

const displayedRange = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE + 1;
  return start + '–' + Math.min(currentPage.value * PAGE_SIZE, matchStore.matchList.length);
});

const pagedMatches = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return matchStore.matchList.slice(start, start + PAGE_SIZE);
});

const visiblePages = computed(() => {
  const total = totalPages.value + (matchStore.hasMore ? 1 : 0);
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
  loadNotice.value = '';
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

async function goToPage(page: number) {
  if (page < 1 || matchStore.loading) return;
  if (page > totalPages.value && matchStore.hasMore) {
    loadNotice.value = '';
    if (!(await matchStore.fetchMatchList(false))) return;
    if (page > totalPages.value && matchStore.hasMore)
      loadNotice.value = '这批记录尚未填满下一页，可继续加载更早的符合条件战绩。';
  }
  currentPage.value = Math.min(page, totalPages.value);
  scrollToTop();
}

async function loadMoreMatches() {
  const previousCount = matchStore.matchList.length;
  loadNotice.value = '';
  if (!(await matchStore.fetchMatchList(false))) return;
  if (matchStore.matchList.length > previousCount) {
    currentPage.value = Math.floor(previousCount / PAGE_SIZE) + 1;
    scrollToTop();
  } else if (matchStore.hasMore) {
    loadNotice.value = '这批记录没有新增符合条件的战绩，可继续向前查找。';
  }
}

async function refresh() {
  loadNotice.value = '';
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
  flex-wrap: wrap;
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

/* Match list panel */
.match-list-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
}

.card {
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
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

.other-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.match-list {
  background-color: var(--color-bg-readable);
}
.history-navigation {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px;
  margin-top: 6px;
  background-color: var(--color-bg-readable);
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  border-bottom: 1px solid var(--color-divider);
  padding-bottom: 14px;
}
.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 36px;
  min-height: 36px;
  padding: 6px 9px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-bg-inset);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}
.page-btn:hover:not(:disabled) {
  background-color: var(--color-accent-soft);
  border-color: var(--color-accent);
}
.page-btn.active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  border-color: var(--color-accent);
}
.page-unloaded {
  border-style: dashed;
  color: var(--color-accent);
}
.page-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.page-ellipsis {
  color: var(--color-text-secondary);
  min-width: 20px;
  text-align: center;
}
.history-load-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.history-count {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.history-count strong {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 650;
}
.load-more-btn {
  min-height: 42px;
  min-width: 190px;
  max-width: 100%;
  padding: 10px 18px;
  border: 1px solid var(--color-accent);
  border-radius: 10px;
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
.load-more-btn:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
}
.load-more-btn:disabled {
  opacity: 0.75;
}
.history-notice,
.history-fetch-error {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-inset);
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.history-fetch-error {
  color: var(--color-error);
  border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
}
@container workspace (max-width: 580px) {
  .history-navigation {
    padding: 14px;
  }
  .history-load-row {
    align-items: stretch;
    flex-direction: column;
  }
  .load-more-btn {
    width: 100%;
    min-width: 0;
  }
  .page-step {
    padding-inline: 8px;
  }
}
</style>
