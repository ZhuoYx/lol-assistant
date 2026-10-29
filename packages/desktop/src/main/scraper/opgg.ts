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
  ChampionRanking,
  ChampionRankingList,
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

    const rawData = response.data;
    const champions = rawData?.data ?? rawData ?? [];
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
    // 如果未指定位置，先查询该英雄的最佳位置
    let position: PositionType;
    if (role) {
      position = this.normalizePosition(role);
    } else {
      position = await this.detectBestPosition(championId, signal);
    }

    logger.info(`从 OP.GG API 获取英雄 ${championId} 构建 (position=${position})...`);

    // getChampion 端点：/api/{region}/champions/ranked/{id}/{position}
    const url = `/api/${this.region}/champions/ranked/${championId}/${position}`;
    const response = await this.http.get(url, {
      params: { tier: this.tier },
      signal,
    });

    // OPGG API 返回的数据在 response.data.data 下
    const rawData = response.data;
    const innerData = rawData?.data ?? rawData;
    const patch = rawData?.meta?.version ?? '';

    // 提取该英雄实际可用的位置列表
    const positions = innerData?.positions ?? [];
    const availableRoles: string[] = positions
      .map((p: Record<string, unknown>) => (p.name ?? '').toString().toLowerCase())
      .filter((r: string) => r && r !== 'none');

    // 解析符文
    const runeBuilds = this.parseRuneBuilds(innerData);

    // 解析出装
    const itemBuilds = this.parseItemBuilds(innerData);

    // 解析技能加点
    const skillOrder = this.parseSkillOrder(innerData);
    const skillPriority = this.parseSkillPriority(innerData);

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
      skillPriority,
      availableRoles,
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

    const rawData = response.data;
    const innerData = rawData?.data ?? rawData;
    const counters = this.parseCounters(innerData);

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

  // ─── 英雄排名 ──────────────────────────────────────────

  /**
   * 获取英雄排名列表（支持段位和分路筛选）
   */
  async getChampionRankings(
    position?: string,
    tier?: string,
    signal?: AbortSignal,
  ): Promise<ChampionRankingList> {
    const usedTier = (tier ?? this.tier) as TierType;
    const usedPosition = position ? this.normalizePosition(position) : 'none';

    logger.info(`从 OP.GG API 获取英雄排名 (position=${usedPosition}, tier=${usedTier})...`);

    const response = await this.http.get(`/api/${this.region}/champions/ranked`, {
      params: { tier: usedTier },
      signal,
    });

    const rawData = response.data;
    const champions = rawData?.data ?? rawData ?? [];
    const patch = rawData?.meta?.version ?? '';

    const rankings: ChampionRanking[] = [];

    for (const champ of champions) {
      const positions = champ.positions ?? [];

      if (usedPosition === 'none') {
        // 不筛选位置：返回每个英雄每个位置的数据
        if (positions.length === 0) {
          // 没有位置数据，用 average_stats
          const stats = champ.average_stats ?? {};
          const tierData = stats.tier_data ?? {};
          rankings.push({
            championId: champ.id,
            position: '',
            tier: tierData.tier ?? stats.tier ?? 5,
            rank: tierData.rank ?? stats.rank ?? 999,
            rankPrev: tierData.rank_prev ?? tierData.rank ?? 999,
            winRate: stats.win_rate ?? 0,
            pickRate: stats.pick_rate ?? 0,
            banRate: stats.ban_rate ?? 0,
            kda: stats.kda ?? 0,
            games: stats.play ?? 0,
          });
        } else {
          for (const pos of positions) {
            const stats = pos.stats ?? {};
            const tierData = stats.tier_data ?? {};
            rankings.push({
              championId: champ.id,
              position: (pos.name ?? '').toString().toLowerCase(),
              tier: tierData.tier ?? 5,
              rank: tierData.rank ?? 999,
              rankPrev: tierData.rank_prev ?? tierData.rank ?? 999,
              winRate: stats.win_rate ?? 0,
              pickRate: stats.pick_rate ?? 0,
              banRate: stats.ban_rate ?? 0,
              kda: stats.kda ?? 0,
              games: stats.play ?? 0,
            });
          }
        }
      } else {
        // 筛选特定位置
        const pos = positions.find(
          (p: any) => (p.name ?? '').toString().toLowerCase() === usedPosition,
        );
        if (pos) {
          const stats = pos.stats ?? {};
          const tierData = stats.tier_data ?? {};
          rankings.push({
            championId: champ.id,
            position: usedPosition,
            tier: tierData.tier ?? 5,
            rank: tierData.rank ?? 999,
            rankPrev: tierData.rank_prev ?? tierData.rank ?? 999,
            winRate: stats.win_rate ?? 0,
            pickRate: stats.pick_rate ?? 0,
            banRate: stats.ban_rate ?? 0,
            kda: stats.kda ?? 0,
            games: stats.play ?? 0,
          });
        }
      }
    }

    // 按 tier 升序 -> rank 升序排列
    rankings.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.rank - b.rank;
    });

    logger.info(`英雄排名获取成功：${rankings.length} 条记录`);

    return {
      rankings,
      patch,
      tier: usedTier,
      position: usedPosition,
    };
  }

  // ─── 数据解析方法 ──────────────────────────────────────

  /** 解析符文构建 */
  private parseRuneBuilds(data: Record<string, unknown>): RuneBuild[] {
    const runeBuilds: RuneBuild[] = [];

    const runePages = (data as any)?.rune_pages ?? [];
    for (const page of runePages) {
      // OPGG API: rune_pages[].builds[] 包含具体的符文配置变种
      const builds = page.builds ?? [];
      if (builds.length > 0) {
        // 取使用率最高的变种作为该符文页的推荐
        for (const build of builds) {
          runeBuilds.push({
            name: `符文配置 ${runeBuilds.length + 1}`,
            winRate: build.play > 0 ? (build.win / build.play) : 0,
            pickRate: build.pick_rate ?? page.pick_rate ?? 0,
            sampleSize: build.play ?? 0,
            primaryTree: build.primary_page_id ?? page.primary_page_id ?? 0,
            primaryPerks: build.primary_rune_ids ?? [],
            secondaryTree: build.secondary_page_id ?? page.secondary_page_id ?? 0,
            secondaryPerks: build.secondary_rune_ids ?? [],
            statShards: build.stat_mod_ids ?? [],
          });
          // 每个 rune_page 只取第一个（最热门的）build 变种
          break;
        }
      } else {
        // 兼容旧格式（rune_pages 直接有具体符文信息）
        runeBuilds.push({
          name: page.name ?? `符文配置 ${runeBuilds.length + 1}`,
          winRate: page.play > 0 ? (page.win / page.play) : (page.win_rate ?? 0),
          pickRate: page.pick_rate ?? 0,
          sampleSize: page.play ?? page.play_count ?? page.sample_count ?? 0,
          primaryTree: page.primary_page_id ?? 0,
          primaryPerks: page.primary_rune_ids ?? [],
          secondaryTree: page.secondary_page_id ?? 0,
          secondaryPerks: page.secondary_rune_ids ?? [],
          statShards: page.stat_mod_ids ?? [],
        });
      }
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
      const play = build.play ?? build.play_count ?? build.sample_count ?? 0;
      const win = build.win ?? 0;
      itemBuilds.push({
        name: `出装方案 ${itemBuilds.length + 1}`,
        winRate: play > 0 ? (win / play) : (build.win_rate ?? 0),
        pickRate: build.pick_rate ?? 0,
        sampleSize: play,
        items: (build.ids ?? []).map(Number),
        startingItems: (starterItems[0]?.ids ?? []).map(Number),
        boots: boots[0]?.ids?.[0] ? Number(boots[0].ids[0]) : 0,
      });
    }

    return itemBuilds;
  }

  /** 解析技能加点 */
  private parseSkillOrder(data: Record<string, unknown>): string[] {
    const d = data as any;

    // OPGG API 结构：
    // skill_masteries[].ids 是优先级（如 ["Q", "E", "W"]，仅 3 个）
    // skill_masteries[].builds[].order 是完整加点顺序（如 ["Q","E","W","Q","Q","R",...]）
    // 部分数据仅覆盖前 15 级，保留原始范围，不虚构后续加点。
    const skillMasteries = d?.skill_masteries ?? [];
    if (skillMasteries.length > 0) {
      const mastery = skillMasteries[0];

      // 优先使用 builds[0].order —— 完整的加点顺序
      const builds = mastery?.builds ?? [];
      if (builds.length > 0 && Array.isArray(builds[0]?.order) && builds[0].order.length > 0) {
        const order: string[] = builds[0].order.map(String);

        return order.slice(0, 18);
      }

      // 降级：仅有优先级顺序（3 个技能，无完整加点）
      if (mastery?.ids?.length > 0) {
        return mastery.ids.map(String);
      }
    }

    const skills = d?.skills;
    if (skills?.order) {
      return skills.order.map(String);
    }

    return [];
  }

  /** 解析技能优先级（仅 3 个主/副/三，如 ["Q","E","W"]） */
  private parseSkillPriority(data: Record<string, unknown>): string[] {
    const d = data as any;
    const skillMasteries = d?.skill_masteries ?? [];
    if (skillMasteries.length > 0 && skillMasteries[0]?.ids?.length > 0) {
      return skillMasteries[0].ids.map(String);
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
      const play = counter.play ?? counter.play_count ?? 0;
      const win = counter.win ?? 0;
      // 计算胜率百分比（OPGG 返回的是绝对数值）
      const winRate = play > 0 ? (win / play) * 100 : (counter.win_rate ?? 0);

      const info: CounterInfo = {
        championId: counter.champion_id ?? counter.id,
        winRate,
        sampleSize: play,
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

  /**
   * 检测英雄的最佳位置（最高出场率）
   * 通过查询 Tier 列表 API 获取英雄在各个位置的数据
   */
  private async detectBestPosition(championId: number, signal?: AbortSignal): Promise<PositionType> {
    try {
      const response = await this.http.get(`/api/${this.region}/champions/ranked`, {
        params: { tier: this.tier },
        signal,
      });

      const rawData = response.data;
      const champions = rawData?.data ?? rawData ?? [];

      // 找到目标英雄
      const champ = champions.find((c: any) => c.id === championId);
      if (!champ) return 'mid';

      const positions = champ.positions ?? [];
      if (positions.length === 0) return 'mid';

      // 找到 role_rate 最高的位置
      let bestPosition: PositionType = 'mid';
      let maxRoleRate = -1;

      for (const pos of positions) {
        const roleRate = pos?.stats?.role_rate ?? 0;
        if (roleRate > maxRoleRate) {
          maxRoleRate = roleRate;
          const name = (pos.name ?? '').toString().toLowerCase();
          bestPosition = this.normalizePosition(name);
        }
      }

      logger.info(`英雄 ${championId} 最佳位置检测: ${bestPosition} (role_rate=${(maxRoleRate * 100).toFixed(1)}%)`);
      return bestPosition;
    } catch (err) {
      logger.warn(`检测英雄 ${championId} 最佳位置失败，降级使用 mid:`, err);
      return 'mid';
    }
  }

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
