<template>
  <details class="champion-insights card" @toggle="handleToggle">
    <summary>
      <span class="insights-symbol" aria-hidden="true">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        >
          <path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" />
        </svg>
      </span>
      <span class="insights-heading"
        ><strong>本局英雄 · 版本参考</strong
        ><span
          >{{ sourceLabel }} · 翡翠+<template v-if="patch"> · v{{ patch }}</template></span
        ></span
      >
      <span class="expand-label">展开参考</span>
      <svg
        class="expand-chevron"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </summary>
    <div class="insights-body">
      <p v-if="loading" role="status">正在获取英雄强度…</p>
      <div v-else-if="failed" class="insights-error">
        <p>攻略数据暂不可用，玩家战绩仍由客户端提供。</p>
        <button @click="loadRankings">重试</button>
      </div>
      <template v-else>
        <p class="reference-note">以下为各英雄热门分路的版本胜率，供阵容参考。</p>
        <div class="insights-grid">
          <div v-for="id in [...new Set(championIds)]" :key="id" class="insight-item">
            <ChampionIcon :champion-id="id" :name="getChampionDisplayName(id)" size="sm" />
            <div>
              <strong>{{ getChampionDisplayName(id) }}</strong
              ><span>{{ rateFor(id) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getChampionDisplayName, type ChampionRanking } from '@lol-assistant/shared';
import { useAppStore } from '@/stores/app';
import ChampionIcon from '@/components/common/ChampionIcon.vue';

defineProps<{ championIds: number[] }>();
const appStore = useAppStore();
const sourceLabel = computed(() =>
  appStore.championDataSource === 'qq101' ? '101.qq.com 国服' : 'OP.GG 韩服',
);
const rankings = ref<ChampionRanking[]>([]);
const patch = ref('');
const loading = ref(false);
const failed = ref(false);
const fetched = ref(false);
function rateFor(id: number) {
  const r = rankings.value
    .filter((r) => r.championId === id)
    .sort((a, b) => b.pickRate - a.pickRate)[0];
  return r ? `胜率 ${(r.winRate * 100).toFixed(1)}%` : '暂无版本数据';
}
async function loadRankings() {
  if (loading.value) return;
  loading.value = true;
  failed.value = false;
  try {
    const data = await window.electronAPI.getChampionRankings();
    rankings.value = data.rankings;
    patch.value = data.patch;
    fetched.value = true;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
function handleToggle(event: Event) {
  if ((event.currentTarget as HTMLDetailsElement).open && !fetched.value) loadRankings();
}
</script>

<style scoped>
.champion-insights {
  min-width: 0;
}
summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 20px;
  list-style: none;
  cursor: pointer;
  border-radius: inherit;
}
summary::-webkit-details-marker {
  display: none;
}
summary:hover {
  background-color: var(--color-bg-hover);
}
.insights-symbol {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
  flex-shrink: 0;
}
.insights-heading {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
}
.insights-heading strong {
  font-size: 13px;
  font-weight: 600;
}
.insights-heading > span,
.expand-label,
p {
  color: var(--color-text-tertiary);
  font-size: 12px;
}
.expand-label {
  font-size: 11px;
}
.expand-chevron {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}
details[open] .expand-chevron {
  transform: rotate(180deg);
}
details[open] .expand-label {
  display: none;
}
.insights-body {
  padding: 0 20px 20px;
}
.reference-note {
  padding-block: 4px 16px;
}
.insights-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.insight-item {
  display: flex;
  gap: 9px;
  align-items: center;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--color-divider);
  border-radius: 11px;
  background-color: var(--color-bg-hover);
}
.insight-item > div {
  min-width: 0;
}
.insight-item strong,
.insight-item span {
  display: block;
}
.insight-item strong {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.insight-item span {
  color: var(--color-text-tertiary);
  font-size: 11px;
  margin-top: 3px;
}
.insights-error {
  display: flex;
  align-items: center;
  gap: 12px;
}
.insights-error button {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-accent);
  background-color: var(--color-bg-hover);
}
@media (max-width: 1100px) {
  .insights-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  summary {
    padding: 14px;
  }
  .insights-heading {
    display: block;
  }
  .insights-heading > span {
    display: block;
    margin-top: 3px;
    font-size: 11px;
  }
  .expand-label {
    display: none;
  }
  .insights-body {
    padding: 0 14px 14px;
  }
  .insights-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
