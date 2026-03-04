<template>
  <div class="page live-game-page">
    <header class="page-header">
      <h1 class="page-title">对局分析</h1>
      <p class="page-subtitle">实时查看双方玩家数据</p>
    </header>

    <div class="live-game-content">
      <EmptyState
        v-if="!appStore.isConnected"
        title="未连接客户端"
        description="请启动英雄联盟客户端"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
          </svg>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="!isInGame"
        title="当前不在对局中"
        description="进入对局后将自动开始分析"
      >
        <template #icon>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </template>
      </EmptyState>

      <div v-else class="analysis-placeholder">
        <p class="placeholder-note">对局分析功能将在 Task 7a 中完整实现</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores';
import { EmptyState } from '@/components/common';

const appStore = useAppStore();

const isInGame = computed(() => {
  const phase = appStore.gamePhase;
  return phase === 'InProgress' || phase === 'GameStart' || phase === 'ChampSelect';
});
</script>

<style scoped>
.live-game-page {
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

.live-game-content {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analysis-placeholder {
  padding: var(--space-8);
  text-align: center;
}

.placeholder-note {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
