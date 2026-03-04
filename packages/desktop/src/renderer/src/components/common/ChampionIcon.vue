<template>
  <div class="champion-icon" :class="size" :title="name || undefined">
    <div class="icon-placeholder">
      <span class="icon-letter">{{ initial }}</span>
    </div>
    <span v-if="showName && name" class="champion-name">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  championId: number;
  name?: string;
  showName?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}>(), {
  showName: false,
  size: 'md',
});

const initial = computed(() => {
  if (props.name) return props.name.charAt(0);
  return '#';
});
</script>

<style scoped>
.champion-icon {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-bg-tertiary), var(--color-bg-secondary));
  color: var(--color-text-secondary);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.xs .icon-placeholder { width: 24px; height: 24px; font-size: 10px; border-radius: var(--radius-sm); }
.sm .icon-placeholder { width: 32px; height: 32px; font-size: var(--text-xs); }
.md .icon-placeholder { width: 40px; height: 40px; font-size: var(--text-sm); }
.lg .icon-placeholder { width: 52px; height: 52px; font-size: var(--text-lg); }

.icon-letter {
  text-transform: uppercase;
}

.champion-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
