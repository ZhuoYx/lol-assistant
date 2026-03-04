<template>
  <div class="page draft-page">
    <header class="page-header">
      <h1 class="page-title">选人助手</h1>
      <p class="page-subtitle">BP 阶段克制推荐与队伍分析</p>
    </header>

    <div class="draft-content">
      <EmptyState
        v-if="!appStore.isConnected"
        title="未连接客户端"
        description="请启动英雄联盟客户端"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="!isInChampSelect"
        title="未在选人阶段"
        description="进入选人阶段后将自动显示推荐"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </template>
      </EmptyState>

      <div v-else class="draft-placeholder">
        <p class="placeholder-note">选人助手功能将在 Task 7b 中完整实现</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores';
import { EmptyState } from '@/components/common';

const appStore = useAppStore();

const isInChampSelect = computed(() => appStore.gamePhase === 'ChampSelect');
</script>

<style scoped>
.draft-page {
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

.draft-content {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.draft-placeholder {
  padding: var(--space-8);
  text-align: center;
}

.placeholder-note {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
