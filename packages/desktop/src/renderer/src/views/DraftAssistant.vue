<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">选人助手</h1>
      <p class="page-subtitle">英雄选择阶段的智能推荐</p>
    </header>
    <div class="placeholder-card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <p class="placeholder-title">选人助手</p>
      <p class="placeholder-desc">将在 Task 7b 中实现阵容分析和英雄克制推荐</p>
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
