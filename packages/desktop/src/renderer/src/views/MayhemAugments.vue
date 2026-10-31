<template>
  <div class="page mayhem-page">
    <PageHeader title="海克斯推荐" subtitle="按英雄查看海克斯大乱斗强化推荐" />
    <ChampionPicker v-model="selectedChampionId" />
    <MayhemAugmentPanel v-if="selectedChampionId" :champion-id="selectedChampionId" />
    <EmptyState
      v-else
      class="glass-panel"
      title="选择一个英雄"
      description="搜索英雄，查看对应的海克斯大乱斗强化推荐"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { CHAMPION_ID_MAP } from '@lol-assistant/shared';
import PageHeader from '@/components/common/PageHeader.vue';
import ChampionPicker from '@/components/common/ChampionPicker.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import MayhemAugmentPanel from '@/components/aram/MayhemAugmentPanel.vue';

const route = useRoute();
const saved = Number(localStorage.getItem('lol-assistant-mayhem-champion'));
const selectedChampionId = ref<number | null>(CHAMPION_ID_MAP[saved] ? saved : 157);
// 路由携带客户端当前英雄；同页重随或交换英雄时也更新面板。
watch(
  () => route.query.championId,
  (value) => {
    const id = typeof value === 'string' ? Number(value) : 0;
    if (CHAMPION_ID_MAP[id]) selectedChampionId.value = id;
  },
  { immediate: true },
);
watch(
  selectedChampionId,
  (id) => {
    if (id) localStorage.setItem('lol-assistant-mayhem-champion', String(id));
    else localStorage.removeItem('lol-assistant-mayhem-champion');
  },
  { immediate: true },
);
</script>

<style scoped>
.mayhem-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: var(--content-max-width);
  margin: 0 auto;
}
</style>
