<template>
  <div ref="root" class="search-section" @focusout="handleFocusOut">
    <div class="search-bar">
      <svg
        class="search-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="输入英雄名称搜索..."
        aria-label="选择英雄"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="showDropdown"
        :aria-controls="listId"
        :aria-activedescendant="
          showDropdown && visibleChampions[activeIndex] ? `${listId}-${activeIndex}` : undefined
        "
        @focus="openDropdown"
        @click="showDropdown = true"
        @input="
          showDropdown = true;
          activeIndex = 0;
        "
        @keydown.down.prevent="moveActive(1)"
        @keydown.up.prevent="moveActive(-1)"
        @keydown.enter.prevent="selectActive"
        @keydown.esc.prevent="showDropdown = false"
      />
      <button
        v-if="searchQuery || modelValue"
        class="search-clear"
        aria-label="清除英雄选择"
        @click="clear"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <div
      v-if="showDropdown"
      :id="listId"
      class="search-dropdown"
      role="listbox"
      aria-label="英雄搜索结果"
    >
      <button
        v-for="(champion, index) in visibleChampions"
        :id="`${listId}-${index}`"
        :key="champion.id"
        class="dropdown-item"
        :class="{ 'is-active': activeIndex === index }"
        role="option"
        :aria-selected="modelValue === champion.id"
        tabindex="-1"
        @mousedown.prevent
        @click="selectChampion(champion.id)"
      >
        <ChampionIcon :champion-id="champion.id" :name="champion.cnName" size="sm" />
        <div class="champ-info">
          <span class="champ-label">{{ champion.cnName || champion.name }}</span>
          <span v-if="champion.title" class="champ-title">{{ champion.title }}</span>
        </div>
      </button>
      <p v-if="!visibleChampions.length" class="search-empty" role="status">未找到匹配的英雄</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import {
  CHAMPION_ID_MAP,
  CHAMPION_CN_NAME_MAP,
  CHAMPION_TITLE_MAP,
  getChampionDisplayName,
} from '@lol-assistant/shared';
import ChampionIcon from './ChampionIcon.vue';

const props = defineProps<{ modelValue: number | null }>();
const emit = defineEmits<{ 'update:modelValue': [championId: number | null] }>();
const root = ref<HTMLElement | null>(null);
const listId = `champion-picker-${useId()}`;
const searchQuery = ref('');
const showDropdown = ref(false);
const activeIndex = ref(0);
const allChampions = Object.entries(CHAMPION_ID_MAP)
  .map(([id, name]) => ({
    id: Number(id),
    name,
    cnName: CHAMPION_CN_NAME_MAP[Number(id)] ?? '',
    title: CHAMPION_TITLE_MAP[Number(id)] ?? '',
    displayName: getChampionDisplayName(Number(id)),
  }))
  .sort((a, b) => a.cnName.localeCompare(b.cnName, 'zh-CN'));
const visibleChampions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return allChampions
    .filter(
      (champion) =>
        !query ||
        [champion.name, champion.cnName, champion.title, champion.displayName].some((value) =>
          value.toLowerCase().includes(query),
        ),
    )
    .slice(0, 8);
});
watch(
  () => props.modelValue,
  (id) => {
    searchQuery.value = id ? getChampionDisplayName(id) : '';
    showDropdown.value = false;
    activeIndex.value = 0;
  },
  { immediate: true },
);

function openDropdown(event: FocusEvent) {
  showDropdown.value = true;
  activeIndex.value = 0;
  (event.target as HTMLInputElement).select();
}
function selectChampion(id: number) {
  searchQuery.value = getChampionDisplayName(id);
  showDropdown.value = false;
  emit('update:modelValue', id);
}
function selectActive() {
  if (!showDropdown.value) return;
  const champion = visibleChampions.value[activeIndex.value];
  if (champion) selectChampion(champion.id);
}
function moveActive(offset: number) {
  if (!showDropdown.value) {
    showDropdown.value = true;
    activeIndex.value = 0;
  } else if (visibleChampions.value.length) {
    activeIndex.value =
      (activeIndex.value + offset + visibleChampions.value.length) % visibleChampions.value.length;
  }
  nextTick(() =>
    document.getElementById(`${listId}-${activeIndex.value}`)?.scrollIntoView({ block: 'nearest' }),
  );
}
function clear() {
  searchQuery.value = '';
  showDropdown.value = false;
  emit('update:modelValue', null);
}
function handleOutside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) showDropdown.value = false;
}
function handleFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) showDropdown.value = false;
}
onMounted(() => document.addEventListener('pointerdown', handleOutside));
onUnmounted(() => document.removeEventListener('pointerdown', handleOutside));
</script>

<style scoped>
.search-section {
  position: relative;
  z-index: var(--z-dropdown);
  min-width: 0;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-4);
  height: 44px;
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}
.search-bar:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
}
.search-icon {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background-color: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-family: var(--font-family);
}
.search-input::placeholder {
  color: var(--color-text-placeholder);
}
.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  border: none;
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}
.search-clear:hover {
  background-color: var(--color-bg-active);
  color: var(--color-text-primary);
}
.search-dropdown {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  right: 0;
  background-color: var(--color-bg-primary);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  overflow: auto;
  max-height: 320px;
  overscroll-behavior: contain;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-4);
  border: none;
  background-color: transparent;
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: left;
}
.dropdown-item:hover,
.dropdown-item.is-active {
  background-color: var(--color-bg-hover);
}
.champ-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.champ-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}
.champ-title {
  font-size: 11px;
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-empty {
  padding: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
</style>
