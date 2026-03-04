<template>
  <div class="error-display">
    <div class="error-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <p class="error-title">{{ title || '出错了' }}</p>
    <p class="error-message">{{ message }}</p>
    <p v-if="fallbackHint" class="error-fallback">{{ fallbackHint }}</p>
    <button v-if="retryable" class="retry-btn" @click="$emit('retry')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      重试
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  message: string;
  retryable?: boolean;
  fallbackHint?: string;
}>();

defineEmits<{
  retry: [];
}>();
</script>

<style scoped>
.error-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-6);
  text-align: center;
}

.error-icon {
  color: var(--color-error);
  margin-bottom: var(--space-3);
  opacity: 0.8;
}

.error-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.error-message {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  max-width: 320px;
  line-height: var(--line-height-relaxed);
}

.error-fallback {
  font-size: var(--text-xs);
  color: var(--color-warning);
  margin-top: var(--space-2);
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-4);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-accent);
  background: transparent;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: var(--color-accent);
  color: #ffffff;
}
</style>
