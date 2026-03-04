import { ref, computed, watch, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import type { ChampionBuilds, RuneBuild, ItemBuild } from '@lol-assistant/shared';
import { CHAMPION_ID_MAP } from '@lol-assistant/shared';

/** 符文树名称映射（LCU perk style IDs） */
const RUNE_TREE_MAP: Record<number, { name: string; color: string }> = {
  8000: { name: '精密', color: '#c8aa6e' },
  8100: { name: '主宰', color: '#d44242' },
  8200: { name: '巫术', color: '#9faafc' },
  8300: { name: '启迪', color: '#49aab9' },
  8400: { name: '坚决', color: '#a1d586' },
};

/** 数据来源配置标签 */
export type BuildSource = 'opgg' | 'lolalytics' | 'local' | null;

export interface BuildConfig {
  championId: number;
  championName: string;
  role: string;
  patch: string;
  dataSource: BuildSource;
  runeBuilds: RuneBuild[];
  itemBuilds: ItemBuild[];
  skillOrder: string[];
}

/**
 * 符文与装备推荐组合式函数
 */
export function useRuneBuilder() {
  const appStore = useAppStore();

  const buildConfig = ref<BuildConfig | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const applying = ref(false);
  const applySuccess = ref(false);
  const applyError = ref<string | null>(null);

  // Selected indices
  const selectedRuneIndex = ref(0);
  const selectedItemIndex = ref(0);

  // Current champion being viewed
  const currentChampionId = ref<number | null>(null);

  // ─── Computed ──────────────────────────────────────────

  const selectedRune = computed<RuneBuild | null>(() => {
    if (!buildConfig.value?.runeBuilds?.length) return null;
    const idx = Math.min(selectedRuneIndex.value, buildConfig.value.runeBuilds.length - 1);
    return buildConfig.value.runeBuilds[idx] ?? null;
  });

  const selectedItem = computed<ItemBuild | null>(() => {
    if (!buildConfig.value?.itemBuilds?.length) return null;
    const idx = Math.min(selectedItemIndex.value, buildConfig.value.itemBuilds.length - 1);
    return buildConfig.value.itemBuilds[idx] ?? null;
  });

  const sourceLabel = computed(() => {
    switch (buildConfig.value?.dataSource) {
      case 'opgg': return 'OP.GG 热门';
      case 'lolalytics': return 'Lolalytics 热门';
      case 'local': return '默认推荐';
      default: return '未知';
    }
  });

  const hasData = computed(() => buildConfig.value !== null);

  const hasRunes = computed(() => (buildConfig.value?.runeBuilds?.length ?? 0) > 0);

  const hasItems = computed(() => (buildConfig.value?.itemBuilds?.length ?? 0) > 0);

  // ─── Actions ──────────────────────────────────────────

  /** 获取指定英雄的构建数据 */
  async function fetchBuilds(championId: number) {
    if (championId <= 0) return;

    currentChampionId.value = championId;
    loading.value = true;
    error.value = null;
    selectedRuneIndex.value = 0;
    selectedItemIndex.value = 0;

    try {
      const builds: ChampionBuilds = await window.electronAPI.getChampionBuilds(championId);
      if (builds) {
        buildConfig.value = {
          championId: builds.championId,
          championName: CHAMPION_ID_MAP[builds.championId] ?? `#${builds.championId}`,
          role: builds.role,
          patch: builds.patch,
          dataSource: builds.dataSource,
          runeBuilds: builds.runeBuilds ?? [],
          itemBuilds: builds.itemBuilds ?? [],
          skillOrder: builds.skillOrder ?? [],
        };
      } else {
        buildConfig.value = null;
        error.value = '暂无构建数据';
      }
    } catch {
      buildConfig.value = null;
      error.value = '获取构建数据失败';
    } finally {
      loading.value = false;
    }
  }

  /** 一键应用符文到客户端 */
  async function applyRune(rune?: RuneBuild) {
    const r = rune ?? selectedRune.value;
    if (!r || !buildConfig.value) return;

    applying.value = true;
    applySuccess.value = false;
    applyError.value = null;

    try {
      const pageName = `${buildConfig.value.championName} - ${r.name}`;

      await window.electronAPI.applyPerksPage({
        name: pageName,
        primaryStyleId: r.primaryTree,
        subStyleId: r.secondaryTree,
        selectedPerkIds: [...r.primaryPerks, ...r.secondaryPerks, ...r.statShards],
      });

      applySuccess.value = true;

      // 3 秒后重置成功状态
      setTimeout(() => {
        applySuccess.value = false;
      }, 3000);
    } catch {
      applyError.value = '应用符文失败，请确保客户端已连接';
      setTimeout(() => {
        applyError.value = null;
      }, 3000);
    } finally {
      applying.value = false;
    }
  }

  /** 获取符文树信息 */
  function getRuneTreeInfo(treeId: number) {
    return RUNE_TREE_MAP[treeId] ?? { name: `#${treeId}`, color: '#888' };
  }

  /** 选择符文配置 */
  function selectRune(index: number) {
    selectedRuneIndex.value = index;
  }

  /** 选择装备配置 */
  function selectItem(index: number) {
    selectedItemIndex.value = index;
  }

  return {
    buildConfig,
    loading,
    error,
    applying,
    applySuccess,
    applyError,
    selectedRuneIndex,
    selectedItemIndex,
    selectedRune,
    selectedItem,
    sourceLabel,
    hasData,
    hasRunes,
    hasItems,
    currentChampionId,
    fetchBuilds,
    applyRune,
    getRuneTreeInfo,
    selectRune,
    selectItem,
  };
}
