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
                v-for="match in matchStore.matchList"
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
            v-if="!matchStore.loading || matchStore.matchList.length"
            class="history-navigation glass-panel"
            aria-label="战绩分页"
          >
            <nav class="pagination" aria-label="战绩页码">
              <button
                class="page-btn page-step"
                :disabled="matchStore.currentPage <= 1 || matchStore.loading"
                aria-label="上一页"
                @click="goToPage(matchStore.currentPage - 1)"
              >
                上一页
              </button>
              <span class="history-count" role="status"
                >第 {{ matchStore.currentPage }} 页 · 每页 {{ matchStore.pageSize }} 场</span
              >
              <button
                class="page-btn page-step"
                :disabled="matchStore.loading || !matchStore.hasMore"
                aria-label="下一页"
                @click="goToPage(matchStore.currentPage + 1)"
              >
                下一页
              </button>
              <button class="page-btn" :disabled="matchStore.loading" @click="refresh">
                {{ matchStore.loading ? '请求中…' : '刷新' }}
              </button>
            </nav>
            <p
              v-if="!matchStore.hasMore && !matchStore.loading && !matchStore.error"
              class="history-notice"
            >
              当前条件下暂无更早战绩
            </p>
            <p
              v-if="matchStore.error && matchStore.matchList.length"
              class="history-fetch-error"
              role="alert"
            >
              {{ matchStore.error }}。已保留当前页，可重试。
            </p>
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

const viewingOther = computed(() => summonerStore.isViewingOther);
const otherSummonerName = computed(() => summonerStore.viewingName);
const currentPUUID = computed(() => summonerStore.activePUUID);
const showDetail = computed(() => selectedGameId.value !== null);

/** 滚动到页面顶部 */
function scrollToTop() {
  nextTick(() => {
    const wrapper = document.querySelector('.content-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
  });
}

function onQueueChange(queue: number | undefined) {
  currentQueue.value = queue;
  matchStore.setFilters({ queue });
  matchStore.fetchMatchList(1);
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
  if (await matchStore.fetchMatchList(page)) scrollToTop();
}

async function refresh() {
  matchStore.setFilters({ queue: currentQueue.value });
  await matchStore.fetchMatchList(1);
  scrollToTop();
}

function viewPlayerHistory(puuid: string) {
  router.push({ path: '/', query: { puuid } });
}

function goBackToMine() {
  summonerStore.resetToMe();
  selectedGameId.value = null;
  // 刷新回自己的数据
  const puuid = summonerStore.activePUUID;
  if (puuid) {
    rankStore.fetchRankStats(puuid);
  }
  matchStore.fetchMatchList(1);
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

  matchStore.setFilters({ queue: currentQueue.value });
  await matchStore.fetchMatchList(1);

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
}
.pagination .history-count {
  flex: 0 1 auto;
  text-align: center;
  margin-inline: 8px;
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

.page-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

  .page-step {
    padding-inline: 8px;
  }
}
</style>
