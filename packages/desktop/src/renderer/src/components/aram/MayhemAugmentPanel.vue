<template>
  <section class="mayhem-panel glass-panel" aria-label="英雄海克斯推荐">
    <header class="mayhem-header">
      <ChampionIcon :champion-id="championId" :name="championName" size="md" />
      <div class="mayhem-title">
        <h2>{{ championName }}</h2>
        <p>海克斯大乱斗 · 强化推荐</p>
      </div>
      <div class="mayhem-actions">
        <a :href="sourceUrl" @click.prevent="openSource(sourceUrl)">数据：ARAMMayhem ↗</a>
        <button class="refresh-button" :disabled="loading" @click="load(true)">
          {{ loading ? '加载中…' : '刷新' }}
        </button>
      </div>
    </header>
    <div v-if="loading && !data" class="mayhem-state" role="status">
      <LoadingSpinner size="sm" />正在获取英雄强化推荐…
    </div>
    <div v-else-if="error && !data" class="mayhem-state error" role="alert">
      <p>{{ error }}</p>
      <button class="refresh-button" @click="load(true)">重试</button>
    </div>
    <template v-else-if="data">
      <div class="mayhem-meta">
        <span>版本 {{ data.patch || '未提供' }}</span
        ><span>统计日期 {{ data.statsDate || '未提供' }}</span>
        <span v-if="data.stale" class="cache-notice" role="status"
          >网络暂不可用，显示 {{ formatDate(data.fetchedAt) }} 的缓存</span
        >
      </div>
      <p v-if="data.partial" class="mayhem-notice" role="status">
        来源标注部分推荐缺失，以下展示已提供的英雄推荐。
      </p>
      <p v-if="!data.augments.length" class="mayhem-state">
        来源暂未提供这个英雄的强化推荐，可打开来源页查看。
      </p>
      <div v-else class="mayhem-groups">
        <section
          v-for="group in groups"
          :key="group.rarity"
          class="mayhem-group"
          :class="group.rarity"
          :aria-label="group.label"
        >
          <h3>
            <span class="rarity-mark" />{{ group.label
            }}<span class="group-count">{{ group.items.length }}</span>
          </h3>
          <p v-if="!group.items.length" class="group-empty">来源暂未提供此类强化</p>
          <a
            v-for="augment in group.items.slice(0, expanded ? undefined : 3)"
            :key="augment.slug"
            class="augment-row"
            :href="augment.sourceUrl"
            @click.prevent="openSource(augment.sourceUrl)"
          >
            <span class="augment-icon"
              ><span>{{ augment.name.charAt(0) }}</span
              ><img
                v-if="augment.iconUrl"
                v-cached-src="augment.iconUrl"
                :alt="augment.name"
                loading="lazy"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
            /></span>
            <span class="augment-content"
              ><strong>{{ augment.name }}</strong
              ><span class="augment-metrics"
                ><span
                  v-if="augment.sourceTier"
                  class="source-tier"
                  :title="`来源评级${augment.sourceRank ? '，该稀有度排名 ' + augment.sourceRank : ''}`"
                  >{{ augment.sourceTier
                  }}<template v-if="augment.sourceRank">
                    · #{{ augment.sourceRank }}</template
                  ></span
                ><span
                  >登场率
                  {{
                    augment.pickRate === undefined ? '—' : augment.pickRate.toFixed(2) + '%'
                  }}</span
                ></span
              ></span
            >
            <span class="source-arrow" aria-hidden="true">↗</span>
          </a>
        </section>
      </div>
      <footer class="mayhem-footer">
        <p>百分比为该英雄的强化登场率；评级沿用来源标注。缺失项显示“—”。</p>
        <button
          v-if="compact && data.augments.length > 9"
          class="expand-button"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? '收起部分强化' : '展开全部强化' }}
        </button>
      </footer>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  formatDate,
  getChampionDisplayName,
  type MayhemChampionRecommendations,
  type MayhemAugmentRarity,
} from '@lol-assistant/shared';
import { ChampionIcon, LoadingSpinner } from '@/components/common';

const props = withDefaults(defineProps<{ championId: number; compact?: boolean }>(), {
  compact: false,
});
const data = ref<MayhemChampionRecommendations | null>(null);
const loading = ref(false);
const error = ref('');
const expanded = ref(!props.compact);
let generation = 0;
const championName = computed(() => getChampionDisplayName(props.championId));
const sourceUrl = computed(() => data.value?.sourceUrl || 'https://arammayhem.com/zh-cn/build/');
const groups = computed(() =>
  (
    [
      { rarity: 'prismatic', label: '棱彩强化' },
      { rarity: 'gold', label: '黄金强化' },
      { rarity: 'silver', label: '白银强化' },
    ] as { rarity: MayhemAugmentRarity; label: string }[]
  ).map((group) => ({
    ...group,
    items: data.value?.augments.filter((a) => a.rarity === group.rarity) || [],
  })),
);

async function load(refresh = false) {
  const request = ++generation;
  const id = props.championId;
  if (!id) {
    data.value = null;
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const result = await window.electronAPI.getMayhemRecommendations(id, refresh);
    if (request === generation) data.value = result;
  } catch (e) {
    if (request === generation)
      error.value = e instanceof Error ? e.message : '暂时无法获取英雄推荐，请重试';
  } finally {
    if (request === generation) loading.value = false;
  }
}
async function openSource(url: string) {
  try {
    await window.electronAPI.openMayhemSource(url);
  } catch {
    error.value = '暂时无法打开来源链接';
  }
}
watch(
  () => props.championId,
  () => {
    data.value = null;
    expanded.value = !props.compact;
    void load();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  ++generation;
});
</script>

<style scoped>
.mayhem-panel {
  min-width: 0;
  overflow: hidden;
}
.mayhem-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid var(--color-divider);
}
.mayhem-title {
  flex: 1;
  min-width: 150px;
}
.mayhem-title h2 {
  font-size: 17px;
  font-weight: 650;
  color: var(--color-text-primary);
}
.mayhem-title p {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.mayhem-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.mayhem-actions a {
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 600;
}
.refresh-button,
.expand-button {
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid var(--color-filter-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  background: var(--color-filter-bg);
  font-size: 12px;
}
.refresh-button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.mayhem-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  padding: 14px 20px 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.cache-notice {
  color: var(--color-highlight-text);
}
.mayhem-notice {
  margin: 4px 20px 12px;
  padding: 8px 12px;
  background: var(--color-bg-inset);
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.mayhem-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 10px 20px 18px;
}
.mayhem-group {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg-hover);
  --rarity-color: var(--color-text-secondary);
}
.mayhem-group.prismatic {
  --rarity-color: var(--color-accent);
}
.mayhem-group.gold {
  --rarity-color: var(--color-highlight-text);
}
.mayhem-group.silver {
  --rarity-color: var(--color-text-secondary);
}
.mayhem-group h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--color-divider);
  color: var(--rarity-color);
  font-size: 13px;
  font-weight: 650;
}
.rarity-mark {
  width: 8px;
  height: 8px;
  border: 2px solid currentColor;
  transform: rotate(45deg);
}
.group-count {
  margin-left: auto;
  font: 12px var(--font-mono);
  color: var(--color-text-secondary);
}
.augment-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 76px;
  padding: 12px;
  color: var(--color-text-primary);
  text-decoration: none;
}
.augment-row + .augment-row {
  border-top: 1px solid var(--color-divider);
}
.augment-row:hover {
  background: var(--color-bg-hover);
}
.augment-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-inset);
  color: var(--rarity-color);
}
.augment-icon img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--color-bg-inset);
}
.augment-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}
.augment-content strong {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.augment-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.source-tier {
  color: var(--rarity-color);
  font-family: var(--font-mono);
}
.source-arrow {
  color: var(--color-text-tertiary);
  font-size: 12px;
}
.mayhem-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  padding: 0 20px 18px;
}
.mayhem-footer p {
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.7;
}
.mayhem-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  min-height: 150px;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.mayhem-state.error {
  color: var(--color-lose-text);
}
.group-empty {
  padding: 20px 12px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
@container workspace (max-width: 840px) {
  .mayhem-groups {
    grid-template-columns: 1fr;
  }
  .mayhem-header {
    padding: 16px;
  }
  .mayhem-groups {
    padding-inline: 16px;
  }
}
</style>
