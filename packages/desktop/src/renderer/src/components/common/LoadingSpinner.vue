<template>
  <div class="loading-spinner" :class="[size, { centered }]">
    <div class="spinner" />
    <span v-if="text" class="spinner-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  centered?: boolean;
}>();
</script>

<style scoped>
.loading-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.loading-spinner.centered {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-8) 0;
  width: 100%;
}

.spinner {
  border: 2.5px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

.sm .spinner {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.md .spinner {
  width: 24px;
  height: 24px;
  border-width: 2.5px;
}

.lg .spinner {
  width: 36px;
  height: 36px;
  border-width: 3px;
}

.spinner-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
