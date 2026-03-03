/**
 * Lolalytics 数据爬取器（备选数据源）
 * Lolalytics 使用内部 API 提供统计数据，页面结构相对稳定
 */
import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
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

export class LolalyticsScraper implements IChampionDataScraper {
  private api: AxiosInstance;
  private webClient: AxiosInstance;

  constructor() {
    // Lolalytics 内部 API
    this.api = axios.create({
      baseURL: 'https://ax.lolalytics.com',
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

    // 网页客户端
    this.webClient = axios.create({
      baseURL: 'https://lolalytics.com',
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
  }

  // ─── Tier 列表 ──────────────────────────────────────────

  async getChampionTierList(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]> {
    const queueParam = queue === 'ranked_solo' ? '420' : '440';

    try {
      return await this.fetchTierListFromAPI(queueParam);
    } catch (apiError) {
      logger.warn('Lolalytics API 获取 Tier 列表失败，尝试网页解析:', apiError);
      try {
        return await this.fetchTierListFromWeb(queueParam);
      } catch (webError) {
        logger.error('Lolalytics 网页解析 Tier 列表也失败:', webError);
        throw webError;
      }
    }
  }

  /** 通过 API 获取 Tier 列表 */
  private async fetchTierListFromAPI(queueId: string): Promise<ChampionTier[]> {
    const results: ChampionTier[] = [];

    const response = await this.api.get('/tierlist/2', {
      params: {
        lane: 'default',
        patch: 'default',
        tier: 'all',
        queue: queueId,
        region: 'all',
      },
    });

    const data = response.data;
    if (!data) throw new Error('API 未返回数据');

    // Lolalytics API 返回格式通常是按英雄 ID 分组的数据
    const champData = data.cid ?? data;
    if (typeof champData === 'object') {
      for (const [champId, info] of Object.entries(champData)) {
        const id = parseInt(champId, 10);
        if (isNaN(id)) continue;

        const champInfo = info as Record<string, unknown>;
        const lanes = champInfo.lane as Record<string, unknown> | undefined;

        if (lanes) {
          // 每个位置单独生成一条记录
          for (const [lane, laneData] of Object.entries(lanes)) {
            const roleKey = REVERSE_ROLE_MAP[lane] ?? lane;
            const ld = laneData as Record<string, number>;
            results.push({
              championId: id,
              role: roleKey,
              tier: this.calculateTier(ld.wr ?? 0, ld.pr ?? 0),
              winRate: ld.wr ?? 0,
              pickRate: ld.pr ?? 0,
              banRate: ld.br ?? (champInfo.br as number) ?? 0,
            });
          }
        } else {
          // 无位置信息，使用整体数据
          results.push({
            championId: id,
            role: 'mid',
            tier: this.calculateTier(
              (champInfo.wr as number) ?? 0,
              (champInfo.pr as number) ?? 0,
            ),
            winRate: (champInfo.wr as number) ?? 0,
            pickRate: (champInfo.pr as number) ?? 0,
            banRate: (champInfo.br as number) ?? 0,
          });
        }
      }
    }

    if (results.length === 0) {
      throw new Error('未获取到任何 Tier 数据');
    }

    return results;
  }

  /** 通过网页解析获取 Tier 列表 */
  private async fetchTierListFromWeb(queueId: string): Promise<ChampionTier[]> {
    const results: ChampionTier[] = [];
    const tierParam = queueId === '420' ? 'ranked' : 'flex';

    const response = await this.webClient.get(`/lol/tierlist/`, {
      params: { tier: tierParam },
    });

    const $ = cheerio.load(response.data);

    // 尝试从 script 标签提取 JSON 数据
    $('script').each((_, el) => {
      const text = $(el).text();
      if (text.includes('__NEXT_DATA__') || text.includes('tierlist')) {
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            const champions = data?.props?.pageProps?.data ?? data?.champions ?? [];
            for (const champ of champions) {
              results.push({
                championId: champ.id ?? champ.champion_id,
                role: champ.role ?? champ.lane ?? 'mid',
                tier: this.calculateTier(champ.win_rate ?? champ.wr ?? 0, champ.pick_rate ?? champ.pr ?? 0),
                winRate: champ.win_rate ?? champ.wr ?? 0,
                pickRate: champ.pick_rate ?? champ.pr ?? 0,
                banRate: champ.ban_rate ?? champ.br ?? 0,
              });
            }
          }
        } catch {
          // 跳过无效 JSON
        }
      }
    });

    if (results.length === 0) {
      throw new Error('网页解析未获取到任何 Tier 数据');
    }

    return results;
  }

  // ─── 英雄构建 ──────────────────────────────────────────

  async getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds> {
    const lane = role ? (ROLE_MAP[role] ?? role) : 'default';

    try {
      return await this.fetchBuildsFromAPI(championId, lane);
    } catch (apiError) {
      logger.warn(`Lolalytics API 获取英雄 ${championId} 构建失败，尝试网页解析:`, apiError);
      try {
        return await this.fetchBuildsFromWeb(championId, lane);
      } catch (webError) {
        logger.error(`Lolalytics 网页解析英雄 ${championId} 构建也失败:`, webError);
        throw webError;
      }
    }
  }

  /** 通过 API 获取英雄构建 */
  private async fetchBuildsFromAPI(championId: number, lane: string): Promise<ChampionBuilds> {
    const response = await this.api.get('/mega/2', {
      params: {
        ep: 'champion',
        v: '1',
        patch: 'default',
        c: championId,
        lane,
        tier: 'all',
        queue: '420',
        region: 'all',
      },
    });

    const data = response.data;
    if (!data) throw new Error(`API 未返回构建数据: championId=${championId}`);

    const runeBuilds: RuneBuild[] = [];
    const itemBuilds: ItemBuild[] = [];
    const skillOrder: string[] = [];

    // 解析符文数据
    const runes = data.runes ?? data.topRunes;
    if (runes) {
      const runeEntries = Array.isArray(runes) ? runes : Object.values(runes);
      for (const rune of runeEntries.slice(0, 3)) {
        const r = rune as Record<string, unknown>;
        runeBuilds.push({
          name: (r.name as string) ?? `符文配置 ${runeBuilds.length + 1}`,
          winRate: (r.wr as number) ?? (r.win_rate as number) ?? 0,
          pickRate: (r.pr as number) ?? (r.pick_rate as number) ?? 0,
          sampleSize: (r.n as number) ?? (r.count as number) ?? 0,
          primaryTree: (r.primary_tree as number) ?? (r.primaryTree as number) ?? 0,
          primaryPerks: ((r.primary as number[]) ?? (r.primaryPerks as number[]) ?? []),
          secondaryTree: (r.secondary_tree as number) ?? (r.secondaryTree as number) ?? 0,
          secondaryPerks: ((r.secondary as number[]) ?? (r.secondaryPerks as number[]) ?? []),
          statShards: ((r.stat as number[]) ?? (r.statShards as number[]) ?? []),
        });
      }
    }

    // 解析装备数据
    const items = data.items ?? data.topItems ?? data.coreItems;
    if (items) {
      const itemEntries = Array.isArray(items) ? items : Object.values(items);
      for (const item of itemEntries.slice(0, 3)) {
        const i = item as Record<string, unknown>;
        itemBuilds.push({
          name: (i.name as string) ?? `出装方案 ${itemBuilds.length + 1}`,
          winRate: (i.wr as number) ?? (i.win_rate as number) ?? 0,
          pickRate: (i.pr as number) ?? (i.pick_rate as number) ?? 0,
          sampleSize: (i.n as number) ?? (i.count as number) ?? 0,
          items: ((i.ids as number[]) ?? (i.items as number[]) ?? []).map(Number),
          startingItems: ((data.startItems?.[0]?.ids as number[]) ?? []).map(Number),
          boots: (data.boots?.[0]?.id as number) ?? 0,
        });
      }
    }

    // 解析技能加点
    const skills = data.skills ?? data.skillOrder;
    if (skills) {
      if (Array.isArray(skills)) {
        skillOrder.push(...skills.map(String));
      } else if (typeof skills === 'object') {
        const topSkill = Object.values(skills)[0] as Record<string, unknown> | undefined;
        if (topSkill?.order) {
          skillOrder.push(...(topSkill.order as string[]).map(String));
        }
      }
    }

    const roleKey = REVERSE_ROLE_MAP[lane] ?? lane;

    return {
      championId,
      role: roleKey === 'default' ? 'mid' : roleKey,
      patch: (data.patch as string) ?? (data.version as string) ?? '',
      dataSource: 'lolalytics',
      runeBuilds,
      itemBuilds,
      skillOrder,
    };
  }

  /** 通过网页解析获取英雄构建 */
  private async fetchBuildsFromWeb(championId: number, lane: string): Promise<ChampionBuilds> {
    const laneParam = lane === 'default' ? '' : lane;
    const url = laneParam
      ? `/lol/champion/${championId}/build/${laneParam}/`
      : `/lol/champion/${championId}/build/`;

    const response = await this.webClient.get(url);
    const $ = cheerio.load(response.data);

    const runeBuilds: RuneBuild[] = [];
    const itemBuilds: ItemBuild[] = [];
    const skillOrder: string[] = [];
    let patch = '';

    // 从内嵌 script 提取数据
    $('script').each((_, el) => {
      const text = $(el).text();
      if (text.includes('__NEXT_DATA__')) {
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return;
          const data = JSON.parse(jsonMatch[0]);
          const buildData = data?.props?.pageProps?.data;

          if (buildData) {
            patch = buildData.patch ?? buildData.version ?? '';

            // 解析符文
            const runes = buildData.runes ?? [];
            for (const r of (Array.isArray(runes) ? runes : []).slice(0, 3)) {
              runeBuilds.push({
                name: r.name ?? `符文配置 ${runeBuilds.length + 1}`,
                winRate: r.wr ?? r.win_rate ?? 0,
                pickRate: r.pr ?? r.pick_rate ?? 0,
                sampleSize: r.n ?? r.count ?? 0,
                primaryTree: r.primary_tree ?? 0,
                primaryPerks: r.primary ?? [],
                secondaryTree: r.secondary_tree ?? 0,
                secondaryPerks: r.secondary ?? [],
                statShards: r.stat ?? [],
              });
            }

            // 解析出装
            const items = buildData.items ?? buildData.coreItems ?? [];
            for (const i of (Array.isArray(items) ? items : []).slice(0, 3)) {
              itemBuilds.push({
                name: i.name ?? `出装方案 ${itemBuilds.length + 1}`,
                winRate: i.wr ?? i.win_rate ?? 0,
                pickRate: i.pr ?? i.pick_rate ?? 0,
                sampleSize: i.n ?? i.count ?? 0,
                items: (i.ids ?? i.items ?? []).map(Number),
                startingItems: (buildData.startItems?.[0]?.ids ?? []).map(Number),
                boots: buildData.boots?.[0]?.id ?? 0,
              });
            }

            // 解析技能
            const skills = buildData.skills ?? buildData.skillOrder;
            if (Array.isArray(skills)) {
              skillOrder.push(...skills.map(String));
            }
          }
        } catch {
          // 跳过解析失败
        }
      }
    });

    const roleKey = REVERSE_ROLE_MAP[lane] ?? lane;

    return {
      championId,
      role: roleKey === 'default' ? 'mid' : roleKey,
      patch,
      dataSource: 'lolalytics',
      runeBuilds,
      itemBuilds,
      skillOrder,
    };
  }

  // ─── 英雄克制 ──────────────────────────────────────────

  async getChampionCounters(championId: number, role?: string): Promise<ChampionCounters> {
    const lane = role ? (ROLE_MAP[role] ?? role) : 'default';

    try {
      return await this.fetchCountersFromAPI(championId, lane);
    } catch (apiError) {
      logger.warn(`Lolalytics API 获取英雄 ${championId} 克制关系失败，尝试网页解析:`, apiError);
      try {
        return await this.fetchCountersFromWeb(championId, lane);
      } catch (webError) {
        logger.error(`Lolalytics 网页解析英雄 ${championId} 克制关系也失败:`, webError);
        throw webError;
      }
    }
  }

  /** 通过 API 获取克制关系 */
  private async fetchCountersFromAPI(championId: number, lane: string): Promise<ChampionCounters> {
    const response = await this.api.get('/mega/2', {
      params: {
        ep: 'champion',
        v: '1',
        patch: 'default',
        c: championId,
        lane,
        tier: 'all',
        queue: '420',
        region: 'all',
      },
    });

    const data = response.data;
    if (!data) throw new Error(`API 未返回克制数据: championId=${championId}`);

    const hardCounters: CounterInfo[] = [];
    const easyMatchups: CounterInfo[] = [];

    // Lolalytics 通常返回对线数据：enemy[championId] = { wr, n, ... }
    const enemies = data.enemy ?? data.matchups ?? {};
    const entries: [string, Record<string, number>][] = Object.entries(enemies);

    // 按胜率排序找出克制和被克制关系
    const sortedByWR = entries
      .filter(([, v]) => (v.n ?? v.count ?? 0) >= 50)
      .map(([id, v]) => ({
        championId: parseInt(id, 10),
        winRate: v.wr ?? v.win_rate ?? 50,
        sampleSize: v.n ?? v.count ?? 0,
      }))
      .filter((e) => !isNaN(e.championId));

    // 对手胜率高 = 克制我方英雄
    sortedByWR
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 10)
      .forEach((c) => hardCounters.push(c));

    // 对手胜率低 = 被我方英雄克制
    sortedByWR
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10)
      .forEach((c) => easyMatchups.push(c));

    const roleKey = REVERSE_ROLE_MAP[lane] ?? lane;

    return {
      championId,
      role: roleKey === 'default' ? 'mid' : roleKey,
      hardCounters,
      easyMatchups,
    };
  }

  /** 通过网页解析获取克制关系 */
  private async fetchCountersFromWeb(championId: number, lane: string): Promise<ChampionCounters> {
    const laneParam = lane === 'default' ? '' : lane;
    const url = laneParam
      ? `/lol/champion/${championId}/counter/${laneParam}/`
      : `/lol/champion/${championId}/counter/`;

    const response = await this.webClient.get(url);
    const $ = cheerio.load(response.data);

    const hardCounters: CounterInfo[] = [];
    const easyMatchups: CounterInfo[] = [];

    // 从内嵌 script 提取数据
    $('script').each((_, el) => {
      const text = $(el).text();
      if (text.includes('__NEXT_DATA__')) {
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return;
          const data = JSON.parse(jsonMatch[0]);
          const counterData = data?.props?.pageProps?.data;

          if (counterData) {
            const counters = counterData.counters ?? counterData.hard_counters ?? [];
            for (const c of (Array.isArray(counters) ? counters : []).slice(0, 10)) {
              hardCounters.push({
                championId: c.champion_id ?? c.id,
                winRate: c.win_rate ?? c.wr ?? 0,
                sampleSize: c.play_count ?? c.n ?? 0,
              });
            }

            const easy = counterData.easy_matchups ?? counterData.weak_against ?? [];
            for (const c of (Array.isArray(easy) ? easy : []).slice(0, 10)) {
              easyMatchups.push({
                championId: c.champion_id ?? c.id,
                winRate: c.win_rate ?? c.wr ?? 0,
                sampleSize: c.play_count ?? c.n ?? 0,
              });
            }
          }
        } catch {
          // 跳过解析失败
        }
      }
    });

    const roleKey = REVERSE_ROLE_MAP[lane] ?? lane;

    return {
      championId,
      role: roleKey === 'default' ? 'mid' : roleKey,
      hardCounters,
      easyMatchups,
    };
  }

  // ─── 工具方法 ──────────────────────────────────────────

  /** 根据胜率和选取率计算 Tier */
  private calculateTier(winRate: number, pickRate: number): ChampionTier['tier'] {
    // 综合评分 = 胜率权重(70%) + 选取率权重(30%)
    const wrScore = winRate > 53 ? 3 : winRate > 51 ? 2 : winRate > 49 ? 1 : 0;
    const prScore = pickRate > 10 ? 3 : pickRate > 5 ? 2 : pickRate > 2 ? 1 : 0;
    const score = wrScore * 0.7 + prScore * 0.3;

    if (score >= 2.5) return 'S+';
    if (score >= 2.0) return 'S';
    if (score >= 1.5) return 'A';
    if (score >= 1.0) return 'B';
    if (score >= 0.5) return 'C';
    return 'D';
  }
}
