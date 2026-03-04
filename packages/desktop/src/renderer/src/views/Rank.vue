<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">排位信息</h1>
      <p class="page-subtitle">查看当前赛季排位数据</p>
    </header>
    <div class="placeholder-card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <p class="placeholder-title">排位数据</p>
      <p class="placeholder-desc">将在 Task 6 中实现排位卡片与胜点趋势图</p>
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
