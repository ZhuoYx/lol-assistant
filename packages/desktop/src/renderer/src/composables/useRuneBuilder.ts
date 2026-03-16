import { ref, computed } from 'vue';
import type { ChampionBuilds, RuneBuild, ItemBuild } from '@lol-assistant/shared';
import { getChampionDisplayName } from '@lol-assistant/shared';

/** 符文树名称映射（LCU perk style IDs） */
const RUNE_TREE_MAP: Record<number, { name: string; color: string }> = {
  8000: { name: '精密', color: '#c8aa6e' },
  8100: { name: '主宰', color: '#d44242' },
  8200: { name: '巫术', color: '#9faafc' },
  8300: { name: '启迪', color: '#49aab9' },
  8400: { name: '坚决', color: '#a1d586' },
};

/** 所有可选位置 */
const ALL_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const;

/** 数据来源配置标签 */
export type BuildSource = 'opgg' | 'local' | null;

export interface BuildConfig {
  championId: number;
  championName: string;
  role: string;
  patch: string;
  dataSource: BuildSource;
  runeBuilds: RuneBuild[];
  itemBuilds: ItemBuild[];
  skillOrder: string[];
  skillPriority: string[];
}

/** 位置信息 */
export interface RoleInfo {
  role: string;
  /** 是否为 API 推荐的热门位置 */
  recommended: boolean;
}

/**
 * 符文与装备推荐组合式函数
 */
export function useRuneBuilder() {
  const buildConfig = ref<BuildConfig | null>(null);
  const loading = ref(false);
  const refreshing = ref(false);
  const error = ref<string | null>(null);
  const applying = ref(false);
  const applySuccess = ref(false);
  const applyError = ref<string | null>(null);

  // Selected indices
  const selectedRuneIndex = ref(0);
  const selectedItemIndex = ref(0);

  // Current champion being viewed
  const currentChampionId = ref<number | null>(null);

  // 多位置支持
  const availableRoles = ref<string[]>([]);
  /** API 返回的推荐位置（英雄有数据的热门位置） */
  const recommendedRoles = ref<string[]>([]);
  const currentRole = ref<string>('');
  const switchingRole = ref(false);

  // ─── Computed ──────────────────────────────────────────

  /**
   * 全部5个位置，每个位置标记是否为推荐位置
   * 推荐位置排在前面，非推荐位置排在后面
   */
  const allRoles = computed<RoleInfo[]>(() => {
    const recommended = new Set(recommendedRoles.value.map(r => r.toLowerCase()));
    // 推荐位置按 API 返回顺序（通常按出场率降序）
    const result: RoleInfo[] = [];
    // 先加推荐位置（保持 API 顺序）
    for (const r of recommendedRoles.value) {
      result.push({ role: r, recommended: true });
    }
    // 再加非推荐位置（按 ALL_ROLES 固定顺序）
    for (const r of ALL_ROLES) {
      if (!recommended.has(r)) {
        result.push({ role: r, recommended: false });
      }
    }
    return result;
  });

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
      case 'local': return '默认推荐';
      default: return '未知';
    }
  });

  const hasData = computed(() => buildConfig.value !== null);

  const hasRunes = computed(() => (buildConfig.value?.runeBuilds?.length ?? 0) > 0);

  const hasItems = computed(() => (buildConfig.value?.itemBuilds?.length ?? 0) > 0);

  // ─── Actions ──────────────────────────────────────────

  /** 从构建数据更新本地状态 */
  function applyBuildConfig(builds: ChampionBuilds) {
    // 如果有完整的 18 级加点顺序（长度 > 3），直接使用
    // 否则尝试从 skillPriority 派生（但无法生成完整 18 级顺序）
    const fullSkillOrder = builds.skillOrder ?? [];
    // skillPriority: 优先级顺序，如 ["Q","E","W"]
    let priority = builds.skillPriority ?? [];
    // 如果没有独立的 skillPriority 但 skillOrder 恰好只有 3 个（旧格式），则把它当做优先级
    if (priority.length === 0 && fullSkillOrder.length > 0 && fullSkillOrder.length <= 3) {
      priority = fullSkillOrder;
    }

    buildConfig.value = {
      championId: builds.championId,
      championName: getChampionDisplayName(builds.championId),
      role: builds.role,
      patch: builds.patch,
      dataSource: builds.dataSource,
      runeBuilds: builds.runeBuilds ?? [],
      itemBuilds: builds.itemBuilds ?? [],
      skillOrder: fullSkillOrder.length > 3 ? fullSkillOrder : [],
      skillPriority: priority,
    };
    currentRole.value = builds.role;
  }

  /** 获取指定英雄的构建数据 */
  async function fetchBuilds(championId: number, role?: string) {
    if (championId <= 0) return;

    currentChampionId.value = championId;
    loading.value = true;
    error.value = null;
    selectedRuneIndex.value = 0;
    selectedItemIndex.value = 0;

    try {
      const builds: ChampionBuilds = await window.electronAPI.getChampionBuilds(championId, role);
      if (builds) {
        applyBuildConfig(builds);

        // 保存 API 返回的推荐位置
        if (builds.availableRoles && builds.availableRoles.length > 0) {
          recommendedRoles.value = builds.availableRoles;
        } else {
          recommendedRoles.value = builds.role ? [builds.role] : [];
        }
        // 始终显示全部5个位置供用户切换
        availableRoles.value = [...ALL_ROLES];
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

  /** 切换位置 */
  async function switchRole(role: string) {
    if (!currentChampionId.value || role === currentRole.value) return;

    switchingRole.value = true;
    selectedRuneIndex.value = 0;
    selectedItemIndex.value = 0;
    error.value = null;

    // 保留当前已知的推荐位置列表
    const savedRecommended = [...recommendedRoles.value];

    try {
      const builds: ChampionBuilds = await window.electronAPI.getChampionBuilds(
        currentChampionId.value,
        role,
      );
      if (builds) {
        applyBuildConfig(builds);
        // 更新推荐位置：优先使用新返回的完整列表，否则保持之前的列表
        if (builds.availableRoles && builds.availableRoles.length > 1) {
          recommendedRoles.value = builds.availableRoles;
        } else {
          recommendedRoles.value = savedRecommended;
        }
        // 始终保持全部位置可见
        availableRoles.value = [...ALL_ROLES];

        // 如果返回的数据没有符文和出装（非常规位置可能无数据），给出提示但不清空
        const hasRealData = (builds.runeBuilds?.length ?? 0) > 0 || (builds.itemBuilds?.length ?? 0) > 0;
        if (!hasRealData) {
          error.value = `该英雄在「${roleLabel(role)}」位置暂无足够数据`;
        }
      } else {
        error.value = `该英雄暂无「${roleLabel(role)}」位置的数据`;
      }
    } catch {
      error.value = `切换到「${roleLabel(role)}」位置失败`;
    } finally {
      switchingRole.value = false;
    }
  }

  /** 位置中文名（内部辅助） */
  function roleLabel(role: string): string {
    const map: Record<string, string> = {
      top: '上单', jungle: '打野', mid: '中单', middle: '中单',
      adc: 'ADC', bottom: 'ADC', support: '辅助', utility: '辅助',
    };
    return map[role.toLowerCase()] ?? role;
  }

  /** 强制刷新当前英雄的构建数据（清除缓存） */
  async function refreshBuilds() {
    if (!currentChampionId.value) return;
    const champId = currentChampionId.value;

    refreshing.value = true;
    error.value = null;

    try {
      await window.electronAPI.refreshChampionBuilds(champId);
      const builds: ChampionBuilds = await window.electronAPI.getChampionBuilds(champId, currentRole.value || undefined);
      if (builds) {
        applyBuildConfig(builds);
        selectedRuneIndex.value = 0;
        selectedItemIndex.value = 0;
      } else {
        error.value = '暂无构建数据';
      }
    } catch (e) {
      console.error('刷新数据失败:', e);
      error.value = '刷新数据失败，请稍后重试';
    } finally {
      refreshing.value = false;
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
    refreshing,
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
    availableRoles,
    allRoles,
    recommendedRoles,
    currentRole,
    switchingRole,
    fetchBuilds,
    switchRole,
    refreshBuilds,
    applyRune,
    getRuneTreeInfo,
    selectRune,
    selectItem,
  };
}
