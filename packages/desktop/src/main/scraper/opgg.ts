/**
 * OP.GG 数据爬取器
 * 直接使用 lol-api-champion.op.gg JSON API
 * - 不需要反爬请求头
 * - 一次请求获取所有 Tier 数据（不按位置分次请求）
 * - getChampion 端点直接返回符文/出装/技能/克制等全部数据
 * - 使用 axios-retry 自动重试
 */
import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import type {
  IChampionDataScraper,
  ChampionTier,
  ChampionBuilds,
  ChampionCounters,
  RuneBuild,
  ItemBuild,
  CounterInfo,
} from '@lol-assistant/shared';
import { logger } from '../utils/logger';

// ─── OPGG API 类型定义 ──────────────────────────────────

/** 段位筛选类型 */
type TierType =
  | 'all'
  | 'ibsg'          // 铁-金
  | 'platinum_plus'
  | 'diamond_plus'
  | 'emerald_plus'
  | 'master_plus'
  | 'grandmaster'
  | 'challenger';

/** 地区类型 */
type RegionType =
  | 'global' | 'kr' | 'na' | 'euw' | 'eune' | 'oce'
  | 'br' | 'jp' | 'lan' | 'las' | 'tr' | 'ru'
  | 'ph' | 'sg' | 'th' | 'tw' | 'vn' | 'me';

/** 位置类型 */
type PositionType = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'none';

/** 角色映射 */
const ROLE_MAP: Record<string, PositionType> = {
  top: 'top',
  jungle: 'jungle',
  mid: 'mid',
  adc: 'adc',
  support: 'support',
};

/** Tier 数值映射 */
function parseTierValue(value: number): ChampionTier['tier'] {
  if (value >= 5) return 'S+';
  if (value >= 4) return 'S';
  if (value >= 3) return 'A';
  if (value >= 2) return 'B';
  if (value >= 1) return 'C';
  return 'D';
}

// ─── OPGGScraper 实现 ──────────────────────────────────

export class OPGGScraper implements IChampionDataScraper {
  private http: AxiosInstance;
  private region: RegionType;
  private tier: TierType;

  constructor(region: RegionType = 'kr', tier: TierType = 'emerald_plus') {
    this.region = region;
    this.tier = tier;

    // 极简配置：不需要反爬请求头
    this.http = axios.create({
      baseURL: 'https://lol-api-champion.op.gg',
      timeout: 15_000,
    });

    // axios-retry：2 次重试，仅在有响应时才重试（网络错误直接失败）
    axiosRetry(this.http, {
      retries: 2,
      retryDelay: () => 0,
      retryCondition: (error) => Boolean(error.response),
    });
  }

  // ─── 版本列表 ──────────────────────────────────────────

  /**
   * 获取可用版本列表
   */
  async getVersions(signal?: AbortSignal): Promise<string[]> {
    const response = await this.http.get(
      `/api/${this.region}/champions/ranked/versions`,
      { signal },
    );
    return response.data?.data ?? response.data ?? [];
  }

  // ─── Tier 列表 ──────────────────────────────────────────

  async getChampionTierList(
    queue: 'ranked_solo' | 'ranked_flex',
    signal?: AbortSignal,
  ): Promise<ChampionTier[]> {
    const mode = queue === 'ranked_solo' ? 'ranked' : 'ranked'; // OPGG API ranked 包含两种队列

    logger.info(`从 OP.GG API 获取 Tier 列表 (region=${this.region}, tier=${this.tier})...`);

    const response = await this.http.get(`/api/${this.region}/champions/${mode}`, {
      params: { tier: this.tier },
      signal,
    });

    const champions = response.data?.data ?? [];
    const results: ChampionTier[] = [];

    for (const champ of champions) {
      // 每个英雄包含 positions 数组，含各位置数据
      const positions = champ.positions ?? [];

      if (positions.length === 0) {
        // 没有位置数据，使用平均数据
        const stats = champ.average_stats ?? {};
        const tierData = stats.tier_data ?? {};
        results.push({
          championId: champ.id,
          role: 'mid',
          tier: this.mapTier(tierData.tier ?? 0),
          winRate: (stats.win_rate ?? 0) * 100,
          pickRate: (stats.pick_rate ?? 0) * 100,
          banRate: (stats.ban_rate ?? 0) * 100,
        });
      } else {
        for (const pos of positions) {
          const stats = pos.stats ?? {};
          const tierData = pos.tier_data ?? {};
          const roleName = (pos.name ?? 'mid').toLowerCase();

          results.push({
            championId: champ.id,
            role: roleName,
            tier: this.mapTier(tierData.tier ?? tierData.rank ?? 0),
            winRate: (stats.win_rate ?? 0) * 100,
            pickRate: (stats.pick_rate ?? 0) * 100,
            banRate: (stats.ban_rate ?? 0) * 100,
          });
        }
      }
    }

    if (results.length === 0) {
      throw new Error('OP.GG API 未返回任何 Tier 数据');
    }

    logger.info(`OP.GG Tier 列表获取成功：${results.length} 条记录`);
    return results;
  }

  // ─── 英雄构建 ──────────────────────────────────────────

  async getChampionBuilds(
    championId: number,
    role?: string,
    signal?: AbortSignal,
  ): Promise<ChampionBuilds> {
    const position = this.normalizePosition(role);

    logger.info(`从 OP.GG API 获取英雄 ${championId} 构建 (position=${position})...`);

    // getChampion 端点：/api/{region}/champions/ranked/{id}/{position}
    const url = `/api/${this.region}/champions/ranked/${championId}/${position}`;
    const response = await this.http.get(url, {
      params: { tier: this.tier },
      signal,
    });

    const data = response.data;
    const patch = data?.meta?.version ?? '';

    // 解析符文
    const runeBuilds = this.parseRuneBuilds(data);

    // 解析出装
    const itemBuilds = this.parseItemBuilds(data);

    // 解析技能加点
    const skillOrder = this.parseSkillOrder(data);

    logger.info(
      `英雄 ${championId} 构建获取成功：` +
      `${runeBuilds.length} 符文, ${itemBuilds.length} 出装, ${skillOrder.length} 技能`,
    );

    return {
      championId,
      role: position,
      patch,
      dataSource: 'opgg',
      runeBuilds,
      itemBuilds,
      skillOrder,
    };
  }

  // ─── 英雄克制 ──────────────────────────────────────────

  async getChampionCounters(
    championId: number,
    role?: string,
    signal?: AbortSignal,
  ): Promise<ChampionCounters> {
    const position = this.normalizePosition(role);

    logger.info(`从 OP.GG API 获取英雄 ${championId} 克制关系 (position=${position})...`);

    // 与 builds 共用同一个 getChampion 端点，克制数据包含在返回中
    const url = `/api/${this.region}/champions/ranked/${championId}/${position}`;
    const response = await this.http.get(url, {
      params: { tier: this.tier },
      signal,
    });

    const data = response.data;
    const counters = this.parseCounters(data);

    logger.info(
      `英雄 ${championId} 克制关系获取成功：` +
      `${counters.hardCounters.length} 克制, ${counters.easyMatchups.length} 优势`,
    );

    return {
      championId,
      role: position,
      ...counters,
    };
  }

  // ─── 数据解析方法 ──────────────────────────────────────

  /** 解析符文构建 */
  private parseRuneBuilds(data: Record<string, unknown>): RuneBuild[] {
    const runeBuilds: RuneBuild[] = [];

    const runePages = (data as any)?.rune_pages ?? [];
    for (const page of runePages) {
      runeBuilds.push({
        name: page.name ?? `符文配置 ${runeBuilds.length + 1}`,
        winRate: page.win_rate ?? 0,
        pickRate: page.pick_rate ?? 0,
        sampleSize: page.play_count ?? page.sample_count ?? 0,
        primaryTree: page.primary_page_id ?? 0,
        primaryPerks: page.primary_rune_ids ?? [],
        secondaryTree: page.secondary_page_id ?? 0,
        secondaryPerks: page.secondary_rune_ids ?? [],
        statShards: page.stat_mod_ids ?? [],
      });
    }

    return runeBuilds;
  }

  /** 解析出装构建 */
  private parseItemBuilds(data: Record<string, unknown>): ItemBuild[] {
    const itemBuilds: ItemBuild[] = [];
    const d = data as any;

    const coreItems = d?.core_items ?? [];
    const starterItems = d?.starter_items ?? [];
    const boots = d?.boots ?? [];

    for (const build of coreItems) {
      itemBuilds.push({
        name: build.name ?? `出装方案 ${itemBuilds.length + 1}`,
        winRate: build.win_rate ?? 0,
        pickRate: build.pick_rate ?? 0,
        sampleSize: build.play_count ?? build.sample_count ?? 0,
        items: (build.ids ?? []).map(Number),
        startingItems: (starterItems[0]?.ids ?? []).map(Number),
        boots: boots[0]?.ids?.[0] ?? 0,
      });
    }

    return itemBuilds;
  }

  /** 解析技能加点 */
  private parseSkillOrder(data: Record<string, unknown>): string[] {
    const d = data as any;

    // 优先使用 skill_masteries，然后 skills
    const skillMasteries = d?.skill_masteries ?? [];
    if (skillMasteries.length > 0 && skillMasteries[0]?.ids) {
      return skillMasteries[0].ids.map(String);
    }

    const skills = d?.skills;
    if (skills?.order) {
      return skills.order.map(String);
    }

    return [];
  }

  /** 解析克制关系 */
  private parseCounters(data: Record<string, unknown>): {
    hardCounters: CounterInfo[];
    easyMatchups: CounterInfo[];
  } {
    const d = data as any;
    const hardCounters: CounterInfo[] = [];
    const easyMatchups: CounterInfo[] = [];

    // counters 数据包含在英雄详情返回中
    const countersData = d?.counters ?? [];

    for (const counter of countersData) {
      const info: CounterInfo = {
        championId: counter.champion_id ?? counter.id,
        winRate: counter.win ?? counter.win_rate ?? 0,
        sampleSize: counter.play ?? counter.play_count ?? 0,
      };

      // 对手胜率 > 50% 说明我方劣势（对方克制我）
      // 对手胜率 < 50% 说明我方优势
      if (info.winRate > 50) {
        hardCounters.push(info);
      } else {
        easyMatchups.push(info);
      }
    }

    // 按胜率排序
    hardCounters.sort((a, b) => b.winRate - a.winRate);
    easyMatchups.sort((a, b) => a.winRate - b.winRate);

    // 各取前 10
    return {
      hardCounters: hardCounters.slice(0, 10),
      easyMatchups: easyMatchups.slice(0, 10),
    };
  }

  // ─── 工具方法 ──────────────────────────────────────────

  /** 标准化位置参数 */
  private normalizePosition(role?: string): PositionType {
    if (!role) return 'mid';
    const lower = role.toLowerCase();
    return ROLE_MAP[lower] ?? 'mid';
  }

  /** 映射 Tier 数值 */
  private mapTier(tier: number | string): ChampionTier['tier'] {
    if (typeof tier === 'number') return parseTierValue(tier);
    const map: Record<string, ChampionTier['tier']> = {
      OP: 'S+',
      '1': 'S+',
      '2': 'S',
      '3': 'A',
      '4': 'B',
      '5': 'C',
    };
    return map[String(tier)] ?? 'B';
  }
}
