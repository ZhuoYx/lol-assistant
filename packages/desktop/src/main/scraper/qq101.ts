import axios from 'axios';
import type { ChampionBuilds, ChampionCounters, ChampionTier, ChampionRankingList, IChampionDataScraper, RuneBuild } from '@lol-assistant/shared';

// Endpoints and compact field layouts used by 101.qq.com (2026-10 redesign).
const LANES: Record<string, string> = { top: 'TOP', jungle: 'JUNGLE', mid: 'MIDDLE', adc: 'BOTTOM', support: 'SUPPORT' };
const ROLES: Record<string, string> = Object.fromEntries(Object.entries(LANES).map(([k, v]) => [v, k]));
const TIERS: Record<string, number> = { all: 255, emerald_plus: 26, platinum_plus: 25, diamond_plus: 27, master_plus: 28, grandmaster: 9, challenger: 10 };
const TREES: Record<string, number> = { jm: 8000, zj: 8100, zz: 8100, ws: 8200, jj: 8400, qd: 8300 };
const KEYSTONES: Record<number, number> = { 8005: 8000, 8008: 8000, 8021: 8000, 8010: 8000, 8112: 8100, 8124: 8100, 8128: 8100, 9923: 8100, 8214: 8200, 8229: 8200, 8230: 8200, 8437: 8400, 8439: 8400, 8465: 8400, 8351: 8300, 8360: 8300, 8369: 8300 };
const rows = (value: unknown): string[][] => typeof value === 'string' && value !== '-1'
  ? value.split('#').filter(Boolean).map(row => row.split('_')) : [];
const ids = (value: string | undefined): number[] => (value ?? '').split(',').map(Number).filter(n => n > 0 && Number.isFinite(n));

export function unpack101(body: { code?: number; data?: { result?: string; _fieldValues?: Record<string, string> } }): Record<string, string> {
  if (body.code !== 0) throw new Error(`101.qq.com 数据请求失败 (${body.code})`);
  const text = body.data?.result || Object.values(body.data?._fieldValues ?? {}).find(Boolean);
  if (!text || text === '-1') return {};
  return JSON.parse(text);
}

export class QQ101Scraper implements IChampionDataScraper {
  private http = axios.create({ baseURL: 'https://mlol.qt.qq.com', timeout: 15000, headers: { Referer: 'https://101.qq.com/' } });
  private version: { patch: string; expiresAt: number } | null = null;

  async getVersion(): Promise<string> {
    if (this.version && Date.now() < this.version.expiresAt) return this.version.patch;
    const { data } = await this.http.get('/go/database/versionlist', { params: { zone: 'lol', from: 'h5' } });
    const patch = data.data?.[0]?.name;
    if (data.code !== 0 || !patch) throw new Error('101.qq.com 未返回版本信息');
    this.version = { patch, expiresAt: Date.now() + 3600000 };
    return patch;
  }

  private async request(kind: string, championId?: number, role?: string, tier = 'emerald_plus') {
    const patch = await this.getVersion();
    const { data } = await this.http.get(`/go/battle_info/odp_proxy/lol_101strategy${kind ? `_${kind}` : ''}`, {
      params: { itier: TIERS[tier] ?? 26, version_id: patch, lane: LANES[role ?? ''] ?? 'ALL', championid: championId, sort_metric: 1, sort_order: 2 },
    });
    return { patch, detail: unpack101(data) };
  }

  async getChampionRankings(position?: string, tier = 'emerald_plus'): Promise<ChampionRankingList> {
    const { patch, detail } = await this.request('', undefined, position, tier);
    const rankings = rows(detail.datadetails).map(r => ({
      championId: Number(r[1]), position: ROLES[r[3]] ?? r[3].toLowerCase(),
      tier: Number(r[2].replace('T', '')) + 1, rank: Number(r[0]), rankPrev: Number(r[0]) + Number(r[8] || 0),
      winRate: Number(r[4]) / 100, pickRate: Number(r[5]) / 100, banRate: Number(r[6]) / 100,
      kda: 0, games: 0, // This endpoint does not publish these fields.
    }));
    if (!rankings.length) throw new Error('101.qq.com 当前版本或筛选条件暂无排名数据');
    return { patch, tier, position: position ?? 'none', rankings };
  }

  async getChampionTierList(_queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]> {
    const { rankings } = await this.getChampionRankings();
    const labels: ChampionTier['tier'][] = ['S+', 'S', 'A', 'B', 'C', 'D'];
    return rankings.map(r => ({ championId: r.championId, role: r.position, tier: labels[r.tier - 1] ?? 'D', winRate: r.winRate * 100, pickRate: r.pickRate * 100, banRate: r.banRate * 100 }));
  }

  async getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds> {
    const ranking = await this.getChampionRankings();
    const availableRoles = ranking.rankings.filter(r => r.championId === championId).sort((a, b) => b.pickRate - a.pickRate).map(r => r.position);
    const selectedRole = role ?? availableRoles[0];
    if (!selectedRole) throw new Error('101.qq.com 暂无该英雄的位置数据');
    const [build, rune, skill] = await Promise.all([
      this.request('build', championId, selectedRole), this.request('runeinfo', championId, selectedRole), this.request('skill_point', championId, selectedRole),
    ]);
    const runeBuilds: RuneBuild[] = rows(rune.detail.rune_top_details).sort((a, b) => Number(a[0]) - Number(b[0])).flatMap(r => {
      const perks = ids(r[3]);
      const primaryTree = KEYSTONES[Number(r[1])];
      const secondaryTree = TREES[r[2]];
      if (!primaryTree || !secondaryTree || perks.length !== 9) return [];
      return [{ name: `热门符文 ${r[0]}`, primaryTree, secondaryTree, primaryPerks: perks.slice(0, 4), secondaryPerks: perks.slice(4, 6), statShards: perks.slice(6), pickRate: Number(r[4]), winRate: Number(r[5]), sampleSize: Number(r[6]) }];
    });
    const starting = ids(rows(build.detail.starting_details)[0]?.[0]);
    const boots = ids(rows(build.detail.shoes_details)[0]?.[0])[0] ?? 0;
    const itemBuilds = rows(build.detail.core_details).map(r => ({ name: `核心出装 ${r[1]}`, items: ids(r[0]), startingItems: starting, boots, pickRate: Number(r[2]), winRate: Number(r[3]), sampleSize: 0 }));
    const priority = (skill.detail.detaildetails ?? '').split('$')[0]?.split('@')[0]?.split(':')[0];
    const skillPriority = ids(priority).map(id => ['Q', 'W', 'E', 'R'][id - 1]).filter(Boolean);
    if (!runeBuilds.length && !itemBuilds.length) throw new Error('101.qq.com 当前英雄与位置暂无推荐数据');
    return { championId, role: selectedRole, patch: build.patch, dataSource: 'qq101', availableRoles, runeBuilds, itemBuilds, skillOrder: [], skillPriority };
  }

  async getChampionCounters(championId: number, role?: string): Promise<ChampionCounters> {
    if (!role) {
      const ranking = await this.getChampionRankings();
      role = ranking.rankings.filter(r => r.championId === championId).sort((a, b) => b.pickRate - a.pickRate)[0]?.position;
    }
    if (!role) throw new Error('101.qq.com 暂无该英雄的位置数据');
    const { detail } = await this.request('confront', championId, role);
    // low_op_details gives this champion's win rate; recommendations need the opponent's rate.
    return { championId, role, dataSource: 'qq101',
      hardCounters: rows(detail.low_op_details).map(r => ({ championId: Number(r[1]), winRate: 100 - Number(r[2]), sampleSize: 0 })),
      easyMatchups: rows(detail.high_op_details).map(r => ({ championId: Number(r[1]), winRate: Number(r[2]), sampleSize: 0 })),
    };
  }
}
