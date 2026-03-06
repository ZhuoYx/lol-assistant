/**
 * Lolalytics 数据爬取器（备选数据源）
 *
 * 新版 API 端点：https://a1.lolalytics.com/mega/
 * 关键参数变更：
 *   - c = 英雄英文名（小写，如 "alistar"），不再是数字 ID
 *   - tier = "emerald_plus"（固定）
 *   - queue = "ranked"（而非 "420"）
 *   - patch = 具体版本号（如 "16.5"），不再支持 "default"
 * 有效 ep 值：rune, build-itemset, counter, tier, front
 */
import axios, { type AxiosInstance } from 'axios';
import type {
  IChampionDataScraper,
  ChampionTier,
  ChampionBuilds,
  ChampionCounters,
  AramChampionTier,
  RuneBuild,
  ItemBuild,
  CounterInfo,
} from '@lol-assistant/shared';
import { CHAMPION_ID_MAP } from '@lol-assistant/shared';
import { logger } from '../utils/logger';

/** Lolalytics 角色映射 */
const ROLE_MAP: Record<string, string> = {
  top: 'top',
  jungle: 'jungle',
  mid: 'middle',
  adc: 'bottom',
  support: 'support',
};

/** 反向角色映射 */
const REVERSE_ROLE_MAP: Record<string, string> = {
  top: 'top',
  jungle: 'jungle',
  middle: 'mid',
  bottom: 'adc',
  support: 'support',
};

/** 请求超时时间 */
const REQUEST_TIMEOUT = 15_000;

/** 默认查询参数 */
const DEFAULT_TIER = 'emerald_plus';
const DEFAULT_QUEUE = 'ranked';
const DEFAULT_REGION = 'all';

export class LolalyticsScraper implements IChampionDataScraper {
  private api: AxiosInstance;
  private currentPatch: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://a1.lolalytics.com',
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Referer: 'https://lolalytics.com/',
        Origin: 'https://lolalytics.com',
      },
    });
  }

  // ─── 内部工具 ──────────────────────────────────────────

  /** 获取当前版本号（缓存） */
  private async getPatch(): Promise<string> {
    if (this.currentPatch) return this.currentPatch;

    try {
      const response = await this.api.get('/mega/', {
        params: {
          ep: 'front',
          v: '1',
          patch: '30', // front 端点使用任意 patch 参数，返回中包含实际 patches
          tier: DEFAULT_TIER,
          queue: DEFAULT_QUEUE,
          region: DEFAULT_REGION,
        },
      });
      const patches = response.data?.patches;
      if (Array.isArray(patches) && patches.length > 0) {
        this.currentPatch = patches[0];
        logger.info(`Lolalytics 当前版本: ${this.currentPatch}`);
        return this.currentPatch!;
      }
    } catch (err) {
      logger.warn('获取 Lolalytics 当前版本失败:', err);
    }

    // 降级：尝试从当前日期推算版本号
    throw new Error('无法获取当前游戏版本号');
  }

  /** 将英雄 ID 转换为英文名（小写） */
  private getChampionName(championId: number): string {
    const name = CHAMPION_ID_MAP[championId];
    if (!name) throw new Error(`未知英雄 ID: ${championId}`);
    return name.toLowerCase();
  }

  /** 从主符文 ID 推断符文树 ID */
  private getRuneTreeId(keystoneOrPerkId: number): number {
    // 符文 ID 格式：8xyz，其中 8x00 是 tree ID
    // 例如 8439 (Aftershock) -> 8400 (Resolve)
    return Math.floor(keystoneOrPerkId / 100) * 100;
  }

  /** 通用 API 请求 */
  private async apiRequest(ep: string, extraParams: Record<string, string> = {}) {
    const patch = await this.getPatch();
    const response = await this.api.get('/mega/', {
      params: {
        ep,
        v: '1',
        patch,
        tier: DEFAULT_TIER,
        queue: DEFAULT_QUEUE,
        region: DEFAULT_REGION,
        ...extraParams,
      },
    });

    const data = response.data;
    if (!data || data.status === 404 || data.status === 4041 || data.status === 4042) {
      throw new Error(`Lolalytics API 返回错误: ep=${ep}, status=${data?.status ?? 'empty'}`);
    }
    return data;
  }

  // ─── ARAM Tier 列表 ────────────────────────────────────

  /**
   * 获取 ARAM（大乱斗/海克斯大乱斗）Tier 列表
   * Lolalytics API: ep=tier, queue=aram, lane=all
   */
  async getAramTierList(): Promise<AramChampionTier[]> {
    const patch = await this.getPatch();
    const results: AramChampionTier[] = [];

    try {
      const response = await this.api.get('/mega/', {
        params: {
          ep: 'tier',
          v: '1',
          patch,
          lane: 'all',
          tier: 'all',
          queue: 'aram',
          region: DEFAULT_REGION,
        },
      });

      const data = response.data;
      if (!data?.tier) {
        throw new Error('Lolalytics ARAM API 未返回有效 tier 数据');
      }

      // tier 数据结构: { "1": { lane: { middle: { cid: { [champId]: { rank, wr, pr, games } } } } } }
      for (const [tierLevel, tierData] of Object.entries(data.tier)) {
        const laneData = (tierData as Record<string, Record<string, Record<string, Record<string, unknown>>>>)?.lane?.middle?.cid;
        if (!laneData) continue;

        for (const [champIdStr, champData] of Object.entries(laneData)) {
          const champId = parseInt(champIdStr, 10);
          if (isNaN(champId)) continue;

          const cd = champData as Record<string, number>;
          results.push({
            championId: champId,
            tier: this.mapTierLevel(parseInt(tierLevel, 10)),
            winRate: cd.wr ?? 0,
            pickRate: cd.pr ?? 0,
            rank: cd.rank ?? 999,
            games: cd.games ?? 0,
          });
        }
      }
    } catch (err) {
      logger.warn('Lolalytics 获取 ARAM Tier 数据失败:', err);
      throw err;
    }

    if (results.length === 0) {
      throw new Error('Lolalytics 未获取到任何 ARAM Tier 数据');
    }

    // 按 rank 排序
    results.sort((a, b) => a.rank - b.rank);
    logger.info(`Lolalytics ARAM Tier: 获取到 ${results.length} 个英雄数据`);
    return results;
  }

  // ─── Tier 列表 ──────────────────────────────────────────

  async getChampionTierList(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]> {
    return this.fetchTierListFromAPI(queue);
  }

  private async fetchTierListFromAPI(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]> {
    const results: ChampionTier[] = [];
    const patch = await this.getPatch();

    // Tier API 需要 lane 参数，逐位置查询
    const lanes = ['top', 'jungle', 'middle', 'bottom', 'support'];

    for (const lane of lanes) {
      try {
        const response = await this.api.get('/mega/', {
          params: {
            ep: 'tier',
            v: '1',
            patch,
            lane,
            tier: DEFAULT_TIER,
            queue: queue === 'ranked_solo' ? DEFAULT_QUEUE : 'flex',
            region: DEFAULT_REGION,
          },
        });

        const data = response.data;
        if (!data?.tier) continue;

        const roleKey = REVERSE_ROLE_MAP[lane] ?? lane;

        // tier 数据结构：{ "1": { lane: { [lane]: { cid: { [champId]: {...} } } } } }
        // 数字键代表 tier 等级
        for (const [tierLevel, tierData] of Object.entries(data.tier)) {
          const laneData = (tierData as Record<string, Record<string, Record<string, Record<string, unknown>>>>)?.lane?.[lane]?.cid;
          if (!laneData) continue;

          for (const [champIdStr, champData] of Object.entries(laneData)) {
            const champId = parseInt(champIdStr, 10);
            if (isNaN(champId)) continue;

            const cd = champData as Record<string, number>;
            results.push({
              championId: champId,
              role: roleKey,
              tier: this.mapTierLevel(parseInt(tierLevel, 10)),
              winRate: cd.wr ?? 0,
              pickRate: cd.pr ?? 0,
              banRate: cd.br ?? 0,
            });
          }
        }

        // 避免请求过快
        await this.delay(200);
      } catch (err) {
        logger.warn(`Lolalytics 获取 ${lane} Tier 数据失败:`, err);
      }
    }

    if (results.length === 0) {
      throw new Error('Lolalytics 未获取到任何 Tier 数据');
    }

    return results;
  }

  // ─── 英雄构建 ──────────────────────────────────────────

  async getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds> {
    const champName = this.getChampionName(championId);
    const lane = role ? (ROLE_MAP[role] ?? role) : 'all';

    // 并行请求符文和出装数据
    const [runeData, itemData] = await Promise.all([
      this.apiRequest('rune', { c: champName, lane }),
      this.apiRequest('build-itemset', { c: champName, lane }).catch(() => null),
    ]);

    const runeBuilds: RuneBuild[] = [];
    const itemBuilds: ItemBuild[] = [];
    const skillOrder: string[] = [];

    // ── 解析符文 ──
    const summary = runeData?.summary?.runes;
    if (summary) {
      // "pick" = 最高选取率符文配置
      if (summary.pick) {
        const pick = summary.pick;
        const priPerks = pick.set?.pri ?? [];
        const secPerks = pick.set?.sec ?? [];
        const mods = pick.set?.mod ?? [];

        runeBuilds.push({
          name: '最高选取率',
          winRate: pick.wr ?? 0,
          pickRate: 0, // pick 配置的选取率需要另外计算
          sampleSize: pick.n ?? 0,
          primaryTree: priPerks.length > 0 ? this.getRuneTreeId(priPerks[0]) : 0,
          primaryPerks: priPerks,
          secondaryTree: secPerks.length > 0 ? this.getRuneTreeId(secPerks[0]) : 0,
          secondaryPerks: secPerks,
          statShards: mods,
        });
      }

      // "win" = 最高胜率符文配置
      if (summary.win) {
        const win = summary.win;
        const priPerks = win.set?.pri ?? [];
        const secPerks = win.set?.sec ?? [];
        const mods = win.set?.mod ?? [];

        runeBuilds.push({
          name: '最高胜率',
          winRate: win.wr ?? 0,
          pickRate: 0,
          sampleSize: win.n ?? 0,
          primaryTree: priPerks.length > 0 ? this.getRuneTreeId(priPerks[0]) : 0,
          primaryPerks: priPerks,
          secondaryTree: secPerks.length > 0 ? this.getRuneTreeId(secPerks[0]) : 0,
          secondaryPerks: secPerks,
          statShards: mods,
        });
      }
    }

    // ── 解析出装 ──
    if (itemData?.itemSets) {
      const sets = itemData.itemSets;

      // itemSet1 = 单件核心装，格式: [["itemId", pickCount, winCount], ...]
      // itemSet2 = 两件套，格式: [["itemId1_itemId2", pickCount, winCount], ...]
      // itemSet3 = 三件套

      // 从 itemSet1 提取最热门的起始装备
      const startingItems: number[] = [];
      if (sets.itemSet1) {
        const topItems = (sets.itemSet1 as [string, number, number][])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);
        for (const [itemId] of topItems) {
          startingItems.push(parseInt(itemId, 10));
        }
      }

      // 从 itemSet2 或 itemSet3 提取核心出装
      const itemSetKey = sets.itemSet3 ? 'itemSet3' : 'itemSet2';
      const coreItems = sets[itemSetKey] as [string, number, number][] | undefined;

      if (coreItems && coreItems.length > 0) {
        // 按选取率排序取前 3
        const sorted = [...coreItems].sort((a, b) => b[1] - a[1]).slice(0, 3);

        for (const [itemIds, pickCount, winCount] of sorted) {
          const items = itemIds.split('_').map(Number);
          const wr = pickCount > 0 ? (winCount / pickCount) * 100 : 0;

          itemBuilds.push({
            name: `出装方案 ${itemBuilds.length + 1}`,
            winRate: Math.round(wr * 100) / 100,
            pickRate: 0,
            sampleSize: pickCount,
            items,
            startingItems,
            boots: 0, // boots 数据不在 itemset 端点中
          });
        }
      }
    }

    const roleKey = lane === 'all' ? (runeData?.header?.defaultLane ?? 'mid') : lane;

    return {
      championId,
      role: REVERSE_ROLE_MAP[roleKey] ?? roleKey,
      patch: this.currentPatch ?? '',
      dataSource: 'lolalytics',
      runeBuilds,
      itemBuilds,
      skillOrder,
    };
  }

  // ─── 英雄克制 ──────────────────────────────────────────

  async getChampionCounters(championId: number, role?: string): Promise<ChampionCounters> {
    const champName = this.getChampionName(championId);
    const lane = role ? (ROLE_MAP[role] ?? role) : 'all';

    const data = await this.apiRequest('counter', { c: champName, lane });

    const hardCounters: CounterInfo[] = [];
    const easyMatchups: CounterInfo[] = [];

    // counters 数组：按 vsWr 降序排列（对手胜率最高的排前面 = 克制我方）
    const counters = data.counters;
    if (Array.isArray(counters)) {
      // 前 10 个：克制我方（对手胜率高）
      for (const c of counters.slice(0, 10)) {
        hardCounters.push({
          championId: c.cid,
          winRate: c.vsWr ?? 0,
          sampleSize: c.n ?? 0,
        });
      }

      // 后 10 个：我方克制（对手胜率低）
      const reversed = [...counters].reverse();
      for (const c of reversed.slice(0, 10)) {
        easyMatchups.push({
          championId: c.cid,
          winRate: c.vsWr ?? 0,
          sampleSize: c.n ?? 0,
        });
      }
    }

    const roleKey = lane === 'all' ? (data?.stats?.defaultLane ?? 'mid') : lane;

    return {
      championId,
      role: REVERSE_ROLE_MAP[roleKey] ?? roleKey,
      hardCounters,
      easyMatchups,
    };
  }

  // ─── 工具方法 ──────────────────────────────────────────

  /** 映射 Tier 等级数字到字符串 */
  private mapTierLevel(level: number): ChampionTier['tier'] {
    switch (level) {
      case 0: return 'S+';
      case 1: return 'S';
      case 2: return 'A';
      case 3: return 'B';
      case 4: return 'C';
      default: return 'D';
    }
  }

  /** 延迟 */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
