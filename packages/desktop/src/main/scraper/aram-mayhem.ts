import axios from 'axios';
import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { parse, type HTMLElement } from 'node-html-parser';
import {
  CHAMPION_ID_MAP,
  getChampionDisplayName,
  isMayhemItemIconUrl,
  type MayhemAugmentRarity,
  type MayhemChampionRecommendations,
  type MayhemEquipmentCategory,
  type MayhemEquipmentGroup,
  type MayhemItemRecommendation,
} from '@lol-assistant/shared';

const ORIGIN = 'https://arammayhem.com';
const TTL = 6 * 60 * 60 * 1000;
const CACHE_SCHEMA = 1;
interface Catalog {
  rows: { championId: string; slug: string }[];
  meta?: { patch?: string; statsDate?: string };
}

export function mayhemSourceUrl(value: string): string {
  const url = new URL(value, ORIGIN);
  if (
    url.origin !== ORIGIN ||
    url.username ||
    url.password ||
    url.search ||
    !/^\/(?:zh-cn\/)?(?:build\/(?:[a-z0-9-]+\/?)?|augments\/[a-z0-9-]+\/?|items\/[a-z0-9_-]+\/?|data\/?)?$/.test(
      url.pathname,
    )
  ) {
    throw new Error('无效的 ARAMMayhem 来源链接');
  }
  return url.href;
}

function rankValue(value: string) {
  const match = value.match(/([SABCD][+-]?)\s*·\s*#(\d+)/);
  return match ? { tier: match[1], rank: Number(match[2]) } : undefined;
}

function percentage(text: string, label: string): number | undefined {
  const match = text.match(new RegExp(label + '\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)\\s*%'));
  const value = match ? Number(match[1]) : undefined;
  return value !== undefined && value >= 0 && value <= 100 ? value : undefined;
}

function parseMayhemItem(link: HTMLElement): MayhemItemRecommendation | undefined {
  try {
    const sourceUrl = mayhemSourceUrl(link.getAttribute('href') || '');
    const slug = new URL(sourceUrl).pathname.match(/\/items\/([a-z0-9_-]+)\/?$/)?.[1];
    const image = link.querySelector('img');
    const name = (link.getAttribute('title') || image?.getAttribute('alt') || link.text).trim();
    if (!slug || !name) return undefined;
    const icon = image?.getAttribute('src');
    const iconUrl = icon ? new URL(icon, ORIGIN).href : undefined;
    return {
      slug,
      name,
      sourceUrl,
      iconUrl: iconUrl && isMayhemItemIconUrl(iconUrl) ? iconUrl : undefined,
    };
  } catch {
    return undefined;
  }
}

function parseMayhemEquipment(root: HTMLElement): MayhemEquipmentGroup[] {
  const marker = root.querySelector('#mayhem-build');
  if (!marker?.parentNode) return [];
  const siblings = marker.parentNode.children;
  const categories: Record<string, MayhemEquipmentCategory> = {
    出门装: 'starting',
    鞋子: 'boots',
    核心出装: 'core',
    其他成装: 'situational',
  };
  const groups: MayhemEquipmentGroup[] = [];
  // 装备区块紧跟出装标题，遇到下一个带 ID 的区块时停止，排除历史快照。
  for (const section of siblings.slice(siblings.indexOf(marker) + 1)) {
    if (section.id) break;
    if (section.tagName !== 'SECTION') continue;
    const label = section.children[0]?.text.trim();
    const category = label ? categories[label] : undefined;
    if (!category || groups.some((group) => group.category === category)) continue;
    const group: MayhemEquipmentGroup = { category, options: [] };
    for (const row of section.children[1]?.children ?? []) {
      const links = row.querySelectorAll('a[href]');
      const items = links.map(parseMayhemItem);
      if (!items.length || items.some((item) => !item)) continue;
      group.options.push({
        items: items as MayhemItemRecommendation[],
        pickRate: percentage(row.text, '登场率'),
        winRate: percentage(row.text, '胜率'),
      });
    }
    if (group.options.length) groups.push(group);
  }
  return groups;
}

/** Parse only the visible hero-specific section, without executing site scripts. */
export function parseMayhemChampion(
  html: string,
  championId: number,
  sourceUrl: string,
): MayhemChampionRecommendations {
  const root = parse(html);
  const section = root.querySelector('#best-augments');
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (
    !section ||
    !canonical ||
    new URL(canonical).pathname.replace(/\/$/, '') !==
      new URL(sourceUrl).pathname.replace(/\/$/, '')
  ) {
    throw new Error('ARAMMayhem 页面未返回可识别的英雄推荐，请稍后重试');
  }
  const data: MayhemChampionRecommendations = {
    championId,
    championName: getChampionDisplayName(championId),
    source: 'ARAMMayhem',
    sourceUrl,
    fetchedAt: Date.now(),
    partial:
      section
        .querySelector('[data-recommendation-coverage]')
        ?.getAttribute('data-recommendation-coverage') === 'partial',
    stale: false,
    augments: [],
    equipmentGroups: parseMayhemEquipment(root),
    patch: root
      .querySelector('meta[property="og:title"]')
      ?.getAttribute('content')
      ?.match(/\b(\d+\.\d+)\b/)?.[1],
    statsDate: section.text.match(/数据日期\s*[:：]\s*(\d{4}-\d{2}-\d{2})/)?.[1],
  };
  const coverage = section
    .querySelector('[data-recommendation-top]')
    ?.getAttribute('data-recommendation-top');
  // A source fallback must not be presented as hero-specific statistics.
  if (coverage && coverage !== 'mapped') {
    data.partial = true;
    return data;
  }
  const seen = new Set<string>();
  for (const heading of section.querySelectorAll('h3')) {
    const rarity: MayhemAugmentRarity | undefined = heading.text.includes('棱彩')
      ? 'prismatic'
      : /金色|黄金/.test(heading.text)
        ? 'gold'
        : /银色|白银/.test(heading.text)
          ? 'silver'
          : undefined;
    if (!rarity) continue;
    for (const card of heading.parentNode?.querySelectorAll('a[href]') || []) {
      const href = card.getAttribute('href');
      if (!href) continue;
      let url: string;
      try {
        url = mayhemSourceUrl(href);
      } catch {
        continue;
      }
      const slug = new URL(url).pathname.match(/\/augments\/([a-z0-9-]+)\/?$/)?.[1];
      const image = card.querySelector('img');
      const name = (
        image?.getAttribute('alt') ||
        card.querySelector('[title]')?.getAttribute('title') ||
        ''
      ).trim();
      if (!slug || !name || seen.has(slug)) continue;
      seen.add(slug);
      const pick = card.text.match(/登场率\s*[:：]\s*(\d+(?:\.\d+)?)\s*%/);
      const pickRate = pick ? Number(pick[1]) : undefined;
      const rank = rankValue(card.querySelector('[data-recommendation-rank="rarity"]')?.text || '');
      const overall = rankValue(
        card.querySelector('[data-recommendation-rank="overall"]')?.text || '',
      );
      const icon = image?.getAttribute('src');
      const iconUrl = icon ? new URL(icon, ORIGIN) : undefined;
      data.augments.push({
        slug,
        name,
        rarity,
        sourceUrl: url,
        iconUrl:
          iconUrl?.origin === ORIGIN &&
          !iconUrl.username &&
          !iconUrl.password &&
          /^\/augments\/[^/]+\.(?:png|webp|jpg)$/i.test(iconUrl.pathname)
            ? iconUrl.href
            : undefined,
        pickRate: pickRate !== undefined && pickRate >= 0 && pickRate <= 100 ? pickRate : undefined,
        sourceTier: rank?.tier,
        sourceRank: rank?.rank,
        overallTier: overall?.tier,
        overallRank: overall?.rank,
      });
    }
  }
  if (!data.augments.length) data.partial = true;
  return data;
}

export class AramMayhemProvider {
  private http = axios.create({
    timeout: 15000,
    maxRedirects: 0,
    maxContentLength: 2 * 1024 * 1024,
  });
  private directory = path.join(app.getPath('userData'), 'aram-mayhem');
  private requests = new Map<number, Promise<MayhemChampionRecommendations>>();
  private catalogRequest?: Promise<Catalog>;

  private async read<T>(name: string): Promise<{ data: T; savedAt: number } | undefined> {
    try {
      const result = JSON.parse(
        await fs.readFile(path.join(this.directory, name + '.json'), 'utf8'),
      );
      return result.schema === CACHE_SCHEMA ? result : undefined;
    } catch {
      return undefined;
    }
  }
  private async write(name: string, data: unknown) {
    try {
      await fs.mkdir(this.directory, { recursive: true });
      await fs.writeFile(
        path.join(this.directory, name + '.json'),
        JSON.stringify({ schema: CACHE_SCHEMA, savedAt: Date.now(), data }),
        'utf8',
      );
    } catch {
      /* A read-only cache must not prevent displaying fresh data. */
    }
  }
  private async catalog(refresh: boolean): Promise<Catalog> {
    if (this.catalogRequest) return this.catalogRequest;
    const request = (async () => {
      const cached = await this.read<Catalog>('champions');
      if (!refresh && cached && Date.now() - cached.savedAt < TTL) return cached.data;
      try {
        const { data } = await this.http.get<Catalog>(`${ORIGIN}/data/v1/latest/champions.json`);
        if (!Array.isArray(data?.rows) || !data.rows.length) throw new Error('invalid catalog');
        await this.write('champions', data);
        return data;
      } catch (error) {
        if (cached) return cached.data;
        throw error;
      }
    })();
    this.catalogRequest = request;
    try {
      return await request;
    } finally {
      this.catalogRequest = undefined;
    }
  }
  async getChampion(championId: number, refresh = false): Promise<MayhemChampionRecommendations> {
    if (!Number.isSafeInteger(championId) || !CHAMPION_ID_MAP[championId])
      throw new Error('请选择一个有效英雄');
    const pending = this.requests.get(championId);
    if (pending) return pending;
    const request = (async () => {
      const cached = await this.read<MayhemChampionRecommendations>(`hero-${championId}`);
      if (
        !refresh &&
        cached &&
        Array.isArray(cached.data.equipmentGroups) &&
        Date.now() - cached.savedAt < TTL
      )
        return { ...cached.data, stale: false };
      try {
        const catalog = await this.catalog(refresh);
        const key = championId === 62 ? 'MonkeyKing' : CHAMPION_ID_MAP[championId];
        const row = catalog.rows.find((r) => r.championId.toLowerCase() === key.toLowerCase());
        if (!row || !/^[a-z0-9-]+$/.test(row.slug))
          throw new Error('ARAMMayhem 暂未提供这个英雄的数据');
        const sourceUrl = mayhemSourceUrl(`/zh-cn/build/${row.slug}/`);
        const { data: html } = await this.http.get<string>(sourceUrl, { responseType: 'text' });
        const result = parseMayhemChampion(html, championId, sourceUrl);
        await this.write(`hero-${championId}`, result);
        return result;
      } catch {
        if (cached)
          return {
            ...cached.data,
            equipmentGroups: cached.data.equipmentGroups ?? [],
            stale: true,
          };
        throw new Error('暂时无法获取 ARAMMayhem 英雄推荐，请检查网络后重试');
      }
    })();
    this.requests.set(championId, request);
    try {
      return await request;
    } finally {
      this.requests.delete(championId);
    }
  }
}
