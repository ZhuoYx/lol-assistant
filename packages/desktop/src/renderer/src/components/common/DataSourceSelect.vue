<template>
  <div class="data-source-control">
    <span class="data-source-caption">攻略数据</span>
    <n-select
      :value="appStore.championDataSource"
      :options="options"
      :disabled="switching"
      :loading="switching"
      size="small"
      aria-label="攻略数据来源"
      @update:value="changeSource"
    />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { NSelect, useMessage } from 'naive-ui';
import type { ChampionDataSource } from '@lol-assistant/shared';
import { useAppStore } from '@/stores/app';
const appStore = useAppStore();
const message = useMessage();
const switching = ref(false);
const options = [
  { label: 'OP.GG · 韩服', value: 'opgg' },
  { label: '101.qq.com · 国服', value: 'qq101' },
];
async function changeSource(source: ChampionDataSource) {
  switching.value = true;
  try {
    appStore.championDataSource = await window.electronAPI.setChampionDataSource(source);
  } catch {
    message.error('切换数据来源失败，请重试');
  } finally {
    switching.value = false;
  }
}
</script>
<style scoped>
.data-source-control {
  display: flex;
  align-items: center;
  gap: 12px;
}
.data-source-caption {
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
.n-select {
  width: 188px;
}

.data-source-control {
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  gap: 8px;
}
.n-select {
  max-width: 100%;
}
</style>
