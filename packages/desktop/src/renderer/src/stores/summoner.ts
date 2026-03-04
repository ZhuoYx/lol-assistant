import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Summoner } from '@lol-assistant/shared';

export const useSummonerStore = defineStore('summoner', () => {
  /** 客户端登录的用户（自己） */
  const currentSummoner = ref<Summoner | null>(null);
  /** 当前搜索/查看的用户（切换后缓存在此） */
  const viewingSummoner = ref<Summoner | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /** 是否正在查看他人（搜索用户 !== 客户端用户） */
  const isViewingOther = computed(() => {
    if (!viewingSummoner.value) return false;
    return viewingSummoner.value.puuid !== currentSummoner.value?.puuid;
  });

  /** 当前应该展示的用户：如果在查看他人就返回他人，否则返回自己 */
  const displaySummoner = computed(() => {
    if (isViewingOther.value && viewingSummoner.value) return viewingSummoner.value;
    return currentSummoner.value;
  });

  /** 当前展示用户的 puuid（供 match/rank 请求使用） */
  const activePUUID = computed(() => {
    return viewingSummoner.value?.puuid ?? currentSummoner.value?.puuid;
  });

  /** 当前查看用户的名字 */
  const viewingName = computed(() => {
    if (!viewingSummoner.value) return '未知召唤师';
    return viewingSummoner.value.gameName || viewingSummoner.value.displayName || '未知召唤师';
  });

  async function fetchCurrentSummoner() {
    loading.value = true;
    error.value = null;
    try {
      currentSummoner.value = await window.electronAPI.getCurrentSummoner();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取召唤师信息失败';
      currentSummoner.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSummonerByPUUID(puuid: string): Promise<Summoner | null> {
    try {
      return await window.electronAPI.getSummonerById(puuid);
    } catch {
      return null;
    }
  }

  /** 切换查看用户：如果是自己则清除查看状态 */
  async function switchPlayer(puuid: string) {
    if (puuid === currentSummoner.value?.puuid) {
      resetToMe();
      return;
    }
    try {
      viewingSummoner.value = await window.electronAPI.getSummonerById(puuid);
    } catch {
      viewingSummoner.value = null;
    }
  }

  /** 回到自己的账号 */
  function resetToMe() {
    viewingSummoner.value = null;
  }

  function clear() {
    currentSummoner.value = null;
    viewingSummoner.value = null;
    error.value = null;
  }

  return {
    currentSummoner,
    viewingSummoner,
    loading,
    error,
    isViewingOther,
    displaySummoner,
    activePUUID,
    viewingName,
    fetchCurrentSummoner,
    fetchSummonerByPUUID,
    switchPlayer,
    resetToMe,
    clear,
  };
});
