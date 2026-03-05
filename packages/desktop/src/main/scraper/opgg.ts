/**
 * OP.GG 数据爬取器
 * 首选方案：分析 OP.GG 内部 API 端点获取数据
 * 备选方案：请求页面 HTML + Cheerio 解析
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

/** OP.GG 角色映射 */
const ROLE_MAP: Record<string, string> = {
  top: 'TOP',
  jungle: 'JUNGLE',
  mid: 'MID',
  adc: 'ADC',
  support: 'SUPPORT',
};

/** 反向角色映射 */
const REVERSE_ROLE_MAP: Record<string, string> = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MID: 'mid',
  ADC: 'adc',
  SUPPORT: 'support',
};

/** Tier 字符串映射 */
function parseTierValue(value: number): ChampionTier['tier'] {
  if (value >= 5) return 'S+';
  if (value >= 4) return 'S';
  if (value >= 3) return 'A';
  if (value >= 2) return 'B';
  if (value >= 1) return 'C';
  return 'D';
}

/** 请求超时时间 */
const REQUEST_TIMEOUT = 15_000;

/** 请求重试延迟 */
const RETRY_DELAY = 2_000;

export class OPGGScraper implements IChampionDataScraper {
  private api: AxiosInstance;
  private webClient: AxiosInstance;
  private region: string;

  constructor(region = 'KR') {
    this.region = region;

    // 内部 API 客户端（使用新域名，仅支持 Tier 列表）
    this.api = axios.create({
      baseURL: 'https://lol-api-champion.op.gg/api',
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Referer: 'https://www.op.gg/',
        Origin: 'https://www.op.gg',
      },
    });

    // 网页爬取客户端（备选方案）
    this.webClient = axios.create({
      baseURL: 'https://www.op.gg',
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
    const queueType = queue === 'ranked_solo' ? 'RANKED' : 'FLEX';

    try {
      return await this.fetchTierListFromAPI(queueType);
    } catch (apiError) {
      logger.warn('OP.GG API 获取 Tier 列表失败，尝试网页解析:', apiError);
      try {
        return await this.fetchTierListFromWeb(queueType);
      } catch (webError) {
        logger.error('OP.GG 网页解析 Tier 列表也失败:', webError);
        throw webError;
      }
    }
  }

  /** 通过内部 API 获取 Tier 列表 */
  private async fetchTierListFromAPI(_queueType: string): Promise<ChampionTier[]> {
    const results: ChampionTier[] = [];

    // 新 API 支持按位置查询，一次请求一个位置
    const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

    for (const role of roles) {
      try {
        const response = await this.api.get(`/${this.region}/champions/ranked`, {
          params: { position: role },
        });

        const champions = response.data?.data ?? [];
        for (const champ of champions) {
          // 新 API 数据结构：average_stats 包含整体数据，positions 数组包含分位置数据
          const posData = champ.positions?.find(
            (p: Record<string, unknown>) => p.name === role,
          );
          const stats = posData?.stats ?? champ.average_stats ?? {};
          const tierData = posData?.tier_data ?? champ.average_stats?.tier_data ?? {};

          results.push({
            championId: champ.id,
            role: REVERSE_ROLE_MAP[role] ?? role.toLowerCase(),
            tier: this.mapAPITier(tierData.tier ?? 0),
            winRate: (stats.win_rate ?? 0) * 100,
            pickRate: (stats.pick_rate ?? 0) * 100,
            banRate: (stats.ban_rate ?? 0) * 100,
          });
        }

        // 避免请求过快
        await this.delay(300);
      } catch (err) {
        logger.warn(`OP.GG API 获取 ${role} Tier 列表失败:`, err);
      }
    }

    if (results.length === 0) {
      throw new Error('未获取到任何 Tier 数据');
    }

    return results;
  }

  /** 通过网页解析获取 Tier 列表 */
  private async fetchTierListFromWeb(queueType: string): Promise<ChampionTier[]> {
    const results: ChampionTier[] = [];
    const tierParam = queueType === 'RANKED' ? 'ranked' : 'flex';

    const response = await this.webClient.get(`/champions`, {
      params: { type: tierParam },
    });

    const $ = cheerio.load(response.data);

    // 解析页面中的英雄 Tier 数据
    // OP.GG 通常在 script[id="__NEXT_DATA__"] 中包含 JSON 数据
    const nextDataScript = $('script#__NEXT_DATA__').text();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const pageProps = nextData?.props?.pageProps;
        const championsData = pageProps?.data ?? pageProps?.champions ?? [];

        for (const champ of championsData) {
          const role = champ.position ?? champ.role ?? 'mid';
          results.push({
            championId: champ.id ?? champ.champion_id,
            role: typeof role === 'string' ? role.toLowerCase() : 'mid',
            tier: this.parseWebTier(champ.tier ?? champ.tier_data?.tier),
            winRate: this.parsePercent(champ.win_rate ?? champ.tier_data?.win_rate),
            pickRate: this.parsePercent(champ.pick_rate ?? champ.tier_data?.pick_rate),
            banRate: this.parsePercent(champ.ban_rate ?? champ.tier_data?.ban_rate),
          });
        }
      } catch (parseErr) {
        logger.warn('解析 __NEXT_DATA__ 失败:', parseErr);
      }
    }

    // 如果 __NEXT_DATA__ 解析失败，尝试直接解析 HTML 表格
    if (results.length === 0) {
      $('table tbody tr').each((_, row) => {
        try {
          const $row = $(row);
          const championLink = $row.find('a[href*="/champions/"]').attr('href') ?? '';
          const championIdMatch = championLink.match(/champions\/(\d+)/);
          if (!championIdMatch) return;

          results.push({
            championId: parseInt(championIdMatch[1], 10),
            role: 'mid',
            tier: this.parseWebTier($row.find('.tier').text().trim()),
            winRate: this.parsePercent($row.find('.win-rate').text()),
            pickRate: this.parsePercent($row.find('.pick-rate').text()),
            banRate: this.parsePercent($row.find('.ban-rate').text()),
          });
        } catch {
          // 跳过解析失败的行
        }
      });
    }

    if (results.length === 0) {
      throw new Error('网页解析未获取到任何 Tier 数据');
    }

    return results;
  }

  // ─── 英雄构建 ──────────────────────────────────────────

  async getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds> {
    // OP.GG 构建 API 已不可用，网页有 Cloudflare 反爬会长时间挂起，直接快速失败以便降级
    throw new Error('OP.GG 构建数据当前不可用，跳过以加速降级');
  }

  /** 通过内部 API 获取英雄构建 */
  private async fetchBuildsFromAPI(_championId: number, _position?: string): Promise<ChampionBuilds> {
    // 新版 OP.GG API (lol-api-champion.op.gg) 不提供构建端点，快速降级
    throw new Error('OP.GG 构建 API 已迁移，当前不可用');
  }

  /** 通过网页解析获取英雄构建 */
  private async fetchBuildsFromWeb(championId: number, position?: string): Promise<ChampionBuilds> {
    const posParam = position ? position.toLowerCase() : '';
    const url = posParam
      ? `/champions/${championId}/build/${posParam}`
      : `/champions/${championId}/build`;

    const response = await this.webClient.get(url);
    const $ = cheerio.load(response.data);

    const runeBuilds: RuneBuild[] = [];
    const itemBuilds: ItemBuild[] = [];
    const skillOrder: string[] = [];
    let patch = '';

    // 从 __NEXT_DATA__ 提取数据
    const nextDataScript = $('script#__NEXT_DATA__').text();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const buildData = nextData?.props?.pageProps?.data;

        if (buildData) {
          patch = buildData.version ?? buildData.patch ?? '';

          // 解析符文
          const runePages = buildData.rune_pages ?? [];
          for (const page of runePages) {
            runeBuilds.push({
              name: page.name ?? `符文配置 ${runeBuilds.length + 1}`,
              winRate: page.win_rate ?? 0,
              pickRate: page.pick_rate ?? 0,
              sampleSize: page.play_count ?? 0,
              primaryTree: page.primary_page_id ?? 0,
              primaryPerks: page.primary_rune_ids ?? [],
              secondaryTree: page.secondary_page_id ?? 0,
              secondaryPerks: page.secondary_rune_ids ?? [],
              statShards: page.stat_mod_ids ?? [],
            });
          }

          // 解析出装
          const coreItems = buildData.core_items ?? [];
          for (const build of coreItems) {
            itemBuilds.push({
              name: build.name ?? `出装方案 ${itemBuilds.length + 1}`,
              winRate: build.win_rate ?? 0,
              pickRate: build.pick_rate ?? 0,
              sampleSize: build.play_count ?? 0,
              items: (build.ids ?? []).map(Number),
              startingItems: (buildData.starter_items?.[0]?.ids ?? []).map(Number),
              boots: buildData.boots?.[0]?.ids?.[0] ?? 0,
            });
          }

          // 解析技能加点
          const skills = buildData.skill_masteries?.[0]?.ids ?? buildData.skills?.order;
          if (skills) {
            skillOrder.push(...skills.map(String));
          }
        }
      } catch (parseErr) {
        logger.warn('解析英雄构建 __NEXT_DATA__ 失败:', parseErr);
      }
    }

    return {
      championId,
      role: position ? (REVERSE_ROLE_MAP[position] ?? position.toLowerCase()) : 'mid',
      patch,
      dataSource: 'opgg',
      runeBuilds,
      itemBuilds,
      skillOrder,
    };
  }

  // ─── 英雄克制 ──────────────────────────────────────────

  async getChampionCounters(championId: number, role?: string): Promise<ChampionCounters> {
    // OP.GG 克制 API 已不可用，网页有 Cloudflare 反爬会长时间挂起，直接快速失败以便降级
    throw new Error('OP.GG 克制数据当前不可用，跳过以加速降级');
  }

  /** 通过内部 API 获取克制关系 */
  private async fetchCountersFromAPI(_championId: number, _position?: string): Promise<ChampionCounters> {
    // 新版 OP.GG API 的 counters 数据内嵌在 tier 列表结果中，
    // 但数据量太少（仅含少量对手），不适合直接使用，快速降级到网页解析
    throw new Error('OP.GG 克制关系 API 已迁移，当前不可用');
  }

  /** 通过网页解析获取克制关系 */
  private async fetchCountersFromWeb(championId: number, position?: string): Promise<ChampionCounters> {
    const posParam = position ? position.toLowerCase() : '';
    const url = posParam
      ? `/champions/${championId}/counters/${posParam}`
      : `/champions/${championId}/counters`;

    const response = await this.webClient.get(url);
    const $ = cheerio.load(response.data);

    const hardCounters: CounterInfo[] = [];
    const easyMatchups: CounterInfo[] = [];

    // 从 __NEXT_DATA__ 提取
    const nextDataScript = $('script#__NEXT_DATA__').text();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const counterData = nextData?.props?.pageProps?.data;

        if (counterData) {
          const counters = counterData.counters ?? counterData.hard_counters ?? [];
          for (const c of counters.slice(0, 10)) {
            hardCounters.push({
              championId: c.champion_id ?? c.id,
              winRate: c.win_rate ?? 0,
              sampleSize: c.play_count ?? 0,
            });
          }

          const easy = counterData.easy_matchups ?? counterData.weak_against ?? [];
          for (const c of easy.slice(0, 10)) {
            easyMatchups.push({
              championId: c.champion_id ?? c.id,
              winRate: c.win_rate ?? 0,
              sampleSize: c.play_count ?? 0,
            });
          }
        }
      } catch (parseErr) {
        logger.warn('解析克制关系 __NEXT_DATA__ 失败:', parseErr);
      }
    }

    return {
      championId,
      role: position ? (REVERSE_ROLE_MAP[position] ?? position.toLowerCase()) : 'mid',
      hardCounters,
      easyMatchups,
    };
  }

  // ─── 工具方法 ──────────────────────────────────────────

  /** 映射 API 返回的 tier 数值 */
  private mapAPITier(tier: number | string): ChampionTier['tier'] {
    if (typeof tier === 'number') return parseTierValue(tier);
    const map: Record<string, ChampionTier['tier']> = {
      OP: 'S+',
      '1': 'S+', '2': 'S', '3': 'A', '4': 'B', '5': 'C',
    };
    return map[tier] ?? 'B';
  }

  /** 解析网页中的 Tier 文本 */
  private parseWebTier(tier: unknown): ChampionTier['tier'] {
    if (typeof tier === 'number') return parseTierValue(tier);
    const str = String(tier ?? '').trim().toUpperCase();
    if (str.includes('OP') || str === 'S+') return 'S+';
    if (str === 'S' || str === '1') return 'S';
    if (str === 'A' || str === '2') return 'A';
    if (str === 'B' || str === '3') return 'B';
    if (str === 'C' || str === '4') return 'C';
    return 'D';
  }

  /** 解析百分比值 */
  private parsePercent(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace('%', ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /** 延迟 */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
