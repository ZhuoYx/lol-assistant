<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">对局分析</h1>
      <p class="page-subtitle">实时查看 10 人对局数据</p>
    </header>
    <div class="placeholder-card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon">
        <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
      <p class="placeholder-title">对局分析</p>
      <p class="placeholder-desc">将在 Task 7a 中实现完整的对局分析面板和玩家卡片</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.page {
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

.placeholder-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  padding: var(--space-12) var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.placeholder-icon {
  color: var(--color-text-placeholder);
  margin-bottom: var(--space-4);
}

.placeholder-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.placeholder-desc {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  max-width: 300px;
}
</style>
