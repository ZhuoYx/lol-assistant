import type { Summoner } from '../types/summoner';
import type { MatchList, MatchDetail, MatchListParams } from '../types/match';
import type { RankStats } from '../types/rank';
import type { ChampionStats } from '../types/champion';
import type { LiveGameAnalysis } from '../types/live-game';

/**
 * API 提供者接口（便于后续切换数据源）
 */
export interface IAPIProvider {
  /** 获取当前召唤师 */
  getCurrentSummoner(): Promise<Summoner>;

  /** 通过 PUUID 获取召唤师 */
  getSummonerByPUUID(puuid: string): Promise<Summoner>;

  /** 获取战绩列表 */
  getMatchList(params: MatchListParams): Promise<MatchList>;

  /** 获取战绩详情 */
  getMatchDetail(gameId: string): Promise<MatchDetail>;

  /** 获取排位信息 */
  getRankStats(puuid: string): Promise<RankStats>;

  /** 获取英雄统计 */
  getChampionStats(puuid: string): Promise<ChampionStats[]>;

  /** 对局实时分析 */
  getLiveGameAnalysis(): Promise<LiveGameAnalysis>;

  /** 查询对局中其他玩家的战绩 */
  getMatchListByPUUID(puuid: string, params: MatchListParams): Promise<MatchList>;
}

/** LCU API 端点常量 */
export const LCU_ENDPOINTS = {
  CURRENT_SUMMONER: '/lol-summoner/v1/current-summoner',
  MATCH_HISTORY: '/lol-match-history/v1/products/lol/current-summoner/matches',
  MATCH_DETAIL: '/lol-match-history/v1/matches',
  RANKED_STATS: '/lol-ranked/v1/ranked-stats',
  CHAMP_SELECT_SESSION: '/lol-champ-select/v1/session',
  PERKS_PAGES: '/lol-perks/v1/pages',
  FRIENDS: '/lol-chat/v1/friends',
  GAMEFLOW_SESSION: '/lol-gameflow/v1/session',
  CAREER_STATS: '/lol-career-stats/v1/summoner-stats',
  CHAMPION_MASTERY: '/lol-collections/v1/inventories',
  MATCH_HISTORY_BY_PUUID: '/lol-match-history/v1/products/lol',
} as const;
