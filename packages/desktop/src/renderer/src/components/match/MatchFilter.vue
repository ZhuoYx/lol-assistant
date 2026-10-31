<template>
  <div class="match-filter">
    <div class="filter-scroll">
      <button
        v-for="q in queueOptions"
        :key="q.label"
        class="filter-chip"
        :class="{ active: currentQueue === q.value }"
        :aria-pressed="currentQueue === q.value"
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
  min-height: 34px;
  padding: 6px 14px;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  background-color: var(--color-filter-bg);
  border: 1px solid var(--color-filter-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-chip:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-soft);
}

.filter-chip.active {
  color: var(--color-filter-on-active);
  background-color: var(--color-filter-active);
  border-color: var(--color-filter-active);
  box-shadow: 0 2px 8px var(--color-accent-soft);
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
</style>
