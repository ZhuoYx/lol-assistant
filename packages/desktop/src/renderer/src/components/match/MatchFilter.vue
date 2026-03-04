<template>
  <div class="match-filter">
    <div class="filter-group">
      <button
        v-for="q in queueOptions"
        :key="q.value"
        class="filter-chip"
        :class="{ active: currentQueue === q.value }"
        @click="$emit('update:queue', q.value)"
      >
        {{ q.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentQueue?: number;
}>();

defineEmits<{
  'update:queue': [value: number | undefined];
}>();

const queueOptions = [
  { label: '全部', value: undefined as number | undefined },
  { label: '单排/双排', value: 420 },
  { label: '灵活组排', value: 440 },
  { label: '匹配模式', value: 400 },
  { label: '大乱斗', value: 450 },
];
</script>

<style scoped>
.match-filter {
  margin-bottom: var(--space-4);
}

.filter-group {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.filter-chip {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.filter-chip:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border);
}

.filter-chip.active {
  background: var(--color-accent);
  color: #ffffff;
  border-color: var(--color-accent);
}
</style>
