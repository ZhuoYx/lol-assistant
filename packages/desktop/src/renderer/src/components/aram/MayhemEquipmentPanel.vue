<template>
  <div class="equipment-panel">
    <p v-if="!groups.length" class="equipment-empty" role="status">
      来源暂未提供这个英雄的装备推荐，可打开来源页查看。
    </p>
    <div v-else class="equipment-grid">
      <section
        v-for="group in groups"
        :key="group.category"
        class="equipment-group glass-surface"
        :class="group.category"
        :aria-label="labels[group.category]"
      >
        <header class="equipment-heading">
          <h3>{{ labels[group.category] }}</h3>
          <span>{{ group.options.length }} 种方案</span>
        </header>
        <div
          v-for="(option, optionIndex) in group.options.slice(0, expanded ? undefined : 3)"
          :key="optionIndex"
          class="equipment-option"
        >
          <div class="item-chain">
            <template v-for="(item, index) in option.items" :key="index">
              <span v-if="index" class="item-arrow" aria-hidden="true">›</span>
              <a
                class="item-link"
                :href="item.sourceUrl"
                :title="item.name"
                @click.prevent="$emit('open-source', item.sourceUrl)"
              >
                <span class="item-image">
                  <img
                    v-if="item.iconUrl && !failedIcons.has(item.iconUrl)"
                    :key="item.iconUrl"
                    v-cached-src="item.iconUrl"
                    alt=""
                    width="44"
                    height="44"
                    loading="lazy"
                    @error="failedIcons.add(item.iconUrl)"
                  />
                  <span v-else aria-hidden="true">{{ item.name.charAt(0) }}</span>
                </span>
                <span class="item-name">{{ item.name }}</span>
              </a>
            </template>
          </div>
          <dl class="equipment-metrics">
            <div>
              <dt>登场率</dt>
              <dd>{{ formatRate(option.pickRate) }}</dd>
            </div>
            <div>
              <dt>胜率</dt>
              <dd class="win-rate">{{ formatRate(option.winRate) }}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
    <footer v-if="groups.length" class="equipment-footer">
      <p>登场率和胜率来自 ARAMMayhem 的英雄出装统计。</p>
      <button
        v-if="compact && groups.some((group) => group.options.length > 3)"
        class="expand-equipment"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起部分方案' : '展开全部方案' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { MayhemEquipmentCategory, MayhemEquipmentGroup } from '@lol-assistant/shared';

const props = withDefaults(defineProps<{ groups: MayhemEquipmentGroup[]; compact?: boolean }>(), {
  compact: false,
});
defineEmits<{ 'open-source': [url: string] }>();
const expanded = ref(!props.compact);
const failedIcons = ref(new Set<string>());
watch(
  () => props.groups,
  () => failedIcons.value.clear(),
);
const labels: Record<MayhemEquipmentCategory, string> = {
  starting: '出门装',
  boots: '鞋子',
  core: '核心出装',
  situational: '其他成装',
};

function formatRate(value: number | undefined): string {
  return value === undefined ? '—' : value.toFixed(2) + '%';
}
</script>

<style scoped>
.equipment-panel {
  padding: 10px 20px 18px;
}
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.equipment-group {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}
.equipment-group.core {
  grid-column: 1 / -1;
  order: -1;
}
.equipment-group.situational {
  grid-column: 1 / -1;
}
.equipment-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--color-divider);
}
.equipment-heading h3 {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 650;
}
.equipment-heading > span {
  color: var(--color-text-secondary);
  font-size: 11px;
}
.equipment-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 14px 16px;
}
.equipment-option + .equipment-option {
  border-top: 1px solid var(--color-divider);
}
.item-chain {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.item-link {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  width: 76px;
  color: var(--color-text-primary);
  text-decoration: none;
  border-radius: 8px;
}
.item-link:hover,
.item-link:focus-visible {
  color: var(--color-accent);
}
.item-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}
.item-image {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-bg-inset);
}
.item-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.item-name {
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
  overflow-wrap: anywhere;
}
.item-arrow {
  align-self: flex-start;
  margin-top: 12px;
  color: var(--color-text-secondary);
  font-size: 20px;
}
.equipment-metrics {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 20px;
  margin-left: auto;
}
.equipment-metrics > div {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.equipment-metrics dt {
  color: var(--color-text-secondary);
  font-size: 11px;
}
.equipment-metrics dd {
  color: var(--color-text-primary);
  font: 600 13px var(--font-mono);
}
.equipment-metrics .win-rate {
  color: var(--color-accent);
}
.equipment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
.equipment-footer p,
.equipment-empty {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.7;
}
.equipment-empty {
  padding: 28px 12px;
  text-align: center;
}
.expand-equipment {
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid var(--color-filter-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  background: var(--color-filter-bg);
  font-size: 12px;
}
@container workspace (max-width: 840px) {
  .equipment-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .equipment-panel {
    padding-inline: 16px;
  }
}
</style>
