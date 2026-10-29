<template>
  <div class="match-filter">
    <div class="filter-scroll">
      <button
        v-for="q in queueOptions"
        :key="q.label"
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

const queueOptions: { label: string; value: number | undefined }[] = [
  { label: '全部', value: undefined },
  { label: '单排/双排', value: 420 },
  { label: '灵活组排', value: 440 },
  { label: '海克斯乱斗', value: 2400 },
  { label: '匹配模式', value: 430 },
  { label: '大乱斗', value: 450 },
  { label: '无限火力', value: 900 },
  { label: '竞技场', value: 1700 },
  { label: '人机对战', value: 870 },
];
</script>

<style scoped>
.match-filter {
  overflow: hidden;
}

.filter-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  padding: 4px 14px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-tertiary);
  background-color: transparent;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-chip:hover {
  color: var(--color-text-secondary);
  border-color: var(--color-border);
  background-color: var(--color-bg-hover);
}

.filter-chip.active {
  color: var(--color-accent);
  background-color: rgba(0, 113, 227, 0.08);
  border-color: rgba(0, 113, 227, 0.3);
  font-weight: var(--font-semibold);
}

.match-filter {
  min-width: 0;
}
.filter-scroll {
  flex-wrap: wrap;
  overflow-x: visible;
  gap: 7px;
  padding: 2px;
}
.filter-chip {
  background-color: var(--color-bg-card);
}
</style>
