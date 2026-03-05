import { ref, watch } from 'vue';

const STORAGE_KEY = 'favorite-champions';

/** 收藏的英雄 ID 列表 */
const favoriteIds = ref<number[]>(loadFavorites());

function loadFavorites(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds.value));
}

watch(favoriteIds, saveFavorites, { deep: true });

export function useFavoriteChampions() {
  function isFavorite(championId: number): boolean {
    return favoriteIds.value.includes(championId);
  }

  function toggleFavorite(championId: number) {
    const idx = favoriteIds.value.indexOf(championId);
    if (idx >= 0) {
      favoriteIds.value.splice(idx, 1);
    } else {
      favoriteIds.value.push(championId);
    }
  }

  function addFavorite(championId: number) {
    if (!favoriteIds.value.includes(championId)) {
      favoriteIds.value.push(championId);
    }
  }

  function removeFavorite(championId: number) {
    const idx = favoriteIds.value.indexOf(championId);
    if (idx >= 0) {
      favoriteIds.value.splice(idx, 1);
    }
  }

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}
