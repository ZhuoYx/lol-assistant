<template>
  <div class="empty-state">
    <div class="empty-icon">
      <slot name="icon">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      </slot>
    </div>
    <p class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-6);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-placeholder);
  margin-bottom: var(--space-4);
  opacity: 0.7;
}

.empty-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  max-width: 280px;
  line-height: var(--line-height-relaxed);
}

.empty-action {
  margin-top: var(--space-4);
}
</style>
