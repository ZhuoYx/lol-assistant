import { onMounted, onUnmounted, ref, computed, watch, type Ref } from 'vue';
import { useAppStore } from '@/stores/app';
import { useChampionStore } from '@/stores/champion';
import type { ChampionCounters, CounterInfo } from '@lol-assistant/shared';
import { CHAMPION_ID_MAP, CHAMPION_COUNTERS } from '@lol-assistant/shared';

/** 选人阶段玩家 pick / ban 信息 */
export interface ChampSelectAction {
  actorCellId: number;
  championId: number;
  completed: boolean;
  type: 'pick' | 'ban';
}

/** 选人阶段某位玩家信息 */
export interface ChampSelectMember {
  cellId: number;
  championId: number;
  summonerId: number;
  team: number; // 1 = 我方, 2 = 敌方
  assignedPosition: string; // "top" | "jungle" | "middle" | "bottom" | "utility" | ""
}

/** 选人阶段 session 数据结构（LCU 返回的核心字段） */
export interface ChampSelectSession {
  myTeam: ChampSelectMember[];
  theirTeam: ChampSelectMember[];
  bans: { myTeamBans: number[]; theirTeamBans: number[] };
  actions: ChampSelectAction[][];
  localPlayerCellId: number;
  timer: { phase: string; adjustedTimeLeftInPhase: number };
}

/** 推荐数据 */
export interface CounterRecommendation {
  championId: number;
  championName: string;
  winRate: number;
  sampleSize: number;
  reason: string;
}

/**
 * 选人助手组合式函数
 * 订阅 /lol-champ-select/v1/session WebSocket 事件
 * 自动获取克制关系推荐
 */
export function useDraftAssistant() {
  const appStore = useAppStore();
  const championStore = useChampionStore();

  const session = ref<ChampSelectSession | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const dataSource = ref<'opgg' | 'lolalytics' | 'local' | null>(null);
  const dataVersion = ref<string | null>(null);

  // Counter data cache: championId -> ChampionCounters
  const counterCache = ref<Map<number, ChampionCounters>>(new Map());

  // Fetching states
  const fetchingCounters = ref(false);

  let unsubLCU: (() => void) | null = null;

  // ─── Computed ──────────────────────────────────────────

  const isInChampSelect = computed(() => appStore.gamePhase === 'ChampSelect');

  /** 我方已选英雄（包括正在确认的） */
  const myTeamPicks = computed<ChampSelectMember[]>(() => {
    if (!session.value) return [];
    return session.value.myTeam.filter((m) => m.championId > 0);
  });

  /** 敌方已选英雄 */
  const enemyTeamPicks = computed<ChampSelectMember[]>(() => {
    if (!session.value) return [];
    return session.value.theirTeam.filter((m) => m.championId > 0);
  });

  /** 所有禁用英雄 ID 列表 */
  const bannedChampionIds = computed<number[]>(() => {
    if (!session.value) return [];
    const bans = session.value.bans;
    return [...(bans.myTeamBans ?? []), ...(bans.theirTeamBans ?? [])].filter((id) => id > 0);
  });

  /** 当前用户的 cellId */
  const localPlayerCellId = computed(() => session.value?.localPlayerCellId ?? -1);

  /** 当前用户信息 */
  const localPlayer = computed(() => {
    if (!session.value) return null;
    return session.value.myTeam.find((m) => m.cellId === localPlayerCellId.value) ?? null;
  });

  /** 计时器阶段 */
  const timerPhase = computed(() => session.value?.timer?.phase ?? '');
  const timeLeft = computed(() => Math.max(0, Math.floor((session.value?.timer?.adjustedTimeLeftInPhase ?? 0) / 1000)));

  /** 基于敌方已选英雄的克制推荐 */
  const counterRecommendations = computed<CounterRecommendation[]>(() => {
    const enemyIds = enemyTeamPicks.value.map((m) => m.championId);
    if (enemyIds.length === 0) return [];

    const recs: CounterRecommendation[] = [];

    for (const enemyId of enemyIds) {
      const counters = counterCache.value.get(enemyId);
      if (counters && counters.hardCounters?.length > 0) {
        for (const counter of counters.hardCounters.slice(0, 3)) {
          // Avoid duplicates and already picked/banned champions
          const alreadyPicked = myTeamPicks.value.some((m) => m.championId === counter.championId);
          const alreadyBanned = bannedChampionIds.value.includes(counter.championId);
          const alreadyInRecs = recs.some((r) => r.championId === counter.championId);
          if (!alreadyPicked && !alreadyBanned && !alreadyInRecs) {
            recs.push({
              championId: counter.championId,
              championName: getChampName(counter.championId),
              winRate: counter.winRate,
              sampleSize: counter.sampleSize,
              reason: `克制 ${getChampName(enemyId)}`,
            });
          }
        }
      } else {
        // Fallback: use static counter data
        const staticData = CHAMPION_COUNTERS[enemyId];
        if (staticData) {
          for (const counterId of staticData.counteredBy.slice(0, 2)) {
            const alreadyPicked = myTeamPicks.value.some((m) => m.championId === counterId);
            const alreadyBanned = bannedChampionIds.value.includes(counterId);
            const alreadyInRecs = recs.some((r) => r.championId === counterId);
            if (!alreadyPicked && !alreadyBanned && !alreadyInRecs) {
              recs.push({
                championId: counterId,
                championName: getChampName(counterId),
                winRate: 0,
                sampleSize: 0,
                reason: `克制 ${getChampName(enemyId)}`,
              });
            }
          }
        }
      }
    }

    return recs.slice(0, 8);
  });

  /** 敌方英雄的弱点/容易被克制列表 */
  const enemyWeaknesses = computed(() => {
    const enemyIds = enemyTeamPicks.value.map((m) => m.championId);
    if (enemyIds.length === 0) return [];

    const weaknesses: { championId: number; championName: string; easyMatchups: CounterInfo[] }[] = [];

    for (const enemyId of enemyIds) {
      const counters = counterCache.value.get(enemyId);
      if (counters && counters.easyMatchups?.length > 0) {
        weaknesses.push({
          championId: enemyId,
          championName: getChampName(enemyId),
          easyMatchups: counters.easyMatchups.slice(0, 3),
        });
      }
    }

    return weaknesses;
  });

  // ─── Actions ──────────────────────────────────────────

  function getChampName(id: number): string {
    return CHAMPION_ID_MAP[id] ?? `#${id}`;
  }

  async function fetchCountersForEnemy(championId: number) {
    if (counterCache.value.has(championId)) return;
    try {
      const counters = await window.electronAPI.getChampionCounters(championId);
      if (counters) {
        counterCache.value.set(championId, counters);
        // Track data source
        dataSource.value = (counters as ChampionCounters & { dataSource?: string }).dataSource as 'opgg' | 'lolalytics' | 'local' ?? 'local';
      }
    } catch {
      // Use static fallback data - still add to cache to prevent re-fetching
      const staticData = CHAMPION_COUNTERS[championId];
      if (staticData) {
        counterCache.value.set(championId, {
          championId,
          role: '',
          hardCounters: staticData.counteredBy.map((id) => ({ championId: id, winRate: 0, sampleSize: 0 })),
          easyMatchups: staticData.counters.map((id) => ({ championId: id, winRate: 0, sampleSize: 0 })),
        });
        dataSource.value = 'local';
      }
    }
  }

  async function fetchAllEnemyCounters() {
    const enemyIds = enemyTeamPicks.value.map((m) => m.championId);
    if (enemyIds.length === 0) return;

    fetchingCounters.value = true;
    await Promise.allSettled(enemyIds.map((id) => fetchCountersForEnemy(id)));
    fetchingCounters.value = false;
  }

  function handleChampSelectEvent(event: unknown) {
    const evt = event as { uri?: string; eventType?: string; data?: unknown };
    if (evt.uri !== '/lol-champ-select/v1/session') return;

    if (evt.eventType === 'Delete') {
      // Champ select ended
      session.value = null;
      counterCache.value.clear();
      return;
    }

    const data = evt.data as ChampSelectSession;
    if (!data || !data.myTeam) return;

    session.value = data;
  }

  function subscribe() {
    window.electronAPI.lcuSubscribe('/lol-champ-select/v1/session');

    unsubLCU = window.electronAPI.onLCUEvent((event: unknown) => {
      handleChampSelectEvent(event);
    });
  }

  // Watch for enemy picks changing -> fetch counters
  watch(
    () => enemyTeamPicks.value.map((m) => m.championId).join(','),
    () => {
      fetchAllEnemyCounters();
    },
  );

  // Also fetch data version info
  async function fetchDataVersionInfo() {
    try {
      const ver = await window.electronAPI.getScraperDataVersion();
      if (ver) {
        dataVersion.value = ver.patch;
        dataSource.value = ver.source;
      }
    } catch {
      dataSource.value = 'local';
    }
  }

  onMounted(() => {
    subscribe();
    fetchDataVersionInfo();
  });

  onUnmounted(() => {
    unsubLCU?.();
    window.electronAPI.lcuUnsubscribe('/lol-champ-select/v1/session');
  });

  return {
    session,
    loading,
    error,
    isInChampSelect,
    myTeamPicks,
    enemyTeamPicks,
    bannedChampionIds,
    localPlayer,
    localPlayerCellId,
    timerPhase,
    timeLeft,
    counterRecommendations,
    enemyWeaknesses,
    fetchingCounters,
    dataSource,
    dataVersion,
    getChampName,
  };
}
