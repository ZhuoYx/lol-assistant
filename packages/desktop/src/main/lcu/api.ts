/**
 * LCU API 封装模块
 * 封装常用的 LCU API 调用，含查询其他玩家战绩、英雄熟练度等接口
 */
import { LCU_ENDPOINTS } from '@lol-assistant/shared';
import type {
  Summoner,
  MatchList,
  MatchDetail,
  MatchListParams,
  RankStats,
  ChampionStats,
} from '@lol-assistant/shared';
import { lcuClient } from './client';
import { logger } from '../utils/logger';

/**
 * LCU API 封装
 * 提供类型安全的 LCU API 调用方法
 */
export const lcuAPI = {
  /**
   * 获取当前登录的召唤师信息
   */
  async getCurrentSummoner(): Promise<Summoner> {
    return lcuClient.get<Summoner>(LCU_ENDPOINTS.CURRENT_SUMMONER);
  },

  /**
   * 通过 PUUID 获取召唤师信息
   */
  async getSummonerByPUUID(puuid: string): Promise<Summoner> {
    return lcuClient.get<Summoner>(`/lol-summoner/v2/summoners/puuid/${puuid}`);
  },

  /**
   * 获取当前召唤师的战绩列表
   */
  async getMatchList(params: MatchListParams = {}): Promise<MatchList> {
    const query = buildMatchListQuery(params);
    return lcuClient.get<MatchList>(`${LCU_ENDPOINTS.MATCH_HISTORY}${query}`);
  },

  /**
   * 通过 PUUID 获取指定玩家的战绩列表
   */
  async getMatchListByPUUID(puuid: string, params: MatchListParams = {}): Promise<MatchList> {
    const query = buildMatchListQuery(params);
    return lcuClient.get<MatchList>(
      `${LCU_ENDPOINTS.MATCH_HISTORY_BY_PUUID}/${puuid}/matches${query}`,
    );
  },

  /**
   * 获取战绩详情
   */
  async getMatchDetail(gameId: string | number): Promise<MatchDetail> {
    return lcuClient.get<MatchDetail>(`${LCU_ENDPOINTS.MATCH_DETAIL}/${gameId}`);
  },

  /**
   * 获取排位信息
   */
  async getRankStats(puuid: string): Promise<RankStats> {
    return lcuClient.get<RankStats>(`${LCU_ENDPOINTS.RANKED_STATS}/${puuid}`);
  },

  /**
   * 获取英雄熟练度（通过 summonerId）
   */
  async getChampionMastery(summonerId: number): Promise<unknown[]> {
    return lcuClient.get<unknown[]>(
      `${LCU_ENDPOINTS.CHAMPION_MASTERY}/${summonerId}/champion-mastery`,
    );
  },

  /**
   * 获取英雄统计（通过 PUUID）
   */
  async getChampionStats(puuid: string): Promise<ChampionStats[]> {
    return lcuClient.get<ChampionStats[]>(
      `${LCU_ENDPOINTS.CAREER_STATS}/${puuid}`,
    );
  },

  /**
   * 获取游戏流程状态（对局 session）
   */
  async getGameflowSession(): Promise<unknown> {
    return lcuClient.get(LCU_ENDPOINTS.GAMEFLOW_SESSION);
  },

  /**
   * 获取英雄选择状态
   */
  async getChampSelectSession(): Promise<unknown> {
    return lcuClient.get(LCU_ENDPOINTS.CHAMP_SELECT_SESSION);
  },

  /**
   * 获取符文页列表
   */
  async getPerksPages(): Promise<unknown[]> {
    return lcuClient.get<unknown[]>(LCU_ENDPOINTS.PERKS_PAGES);
  },

  /**
   * 创建符文页
   */
  async createPerksPage(pageData: unknown): Promise<unknown> {
    return lcuClient.post(LCU_ENDPOINTS.PERKS_PAGES, pageData);
  },

  /**
   * 删除符文页
   */
  async deletePerksPage(pageId: number): Promise<void> {
    await lcuClient.delete(`${LCU_ENDPOINTS.PERKS_PAGES}/${pageId}`);
  },

  /**
   * 获取好友列表
   */
  async getFriends(): Promise<unknown[]> {
    return lcuClient.get<unknown[]>(LCU_ENDPOINTS.FRIENDS);
  },

  /**
   * 通用 LCU API 请求（供未封装的端点使用）
   */
  async request<T = unknown>(
    method: string,
    endpoint: string,
    data?: unknown,
  ): Promise<T> {
    return lcuClient.request<T>(endpoint, { method, data });
  },
};

/**
 * 构建战绩列表查询参数
 */
function buildMatchListQuery(params: MatchListParams): string {
  const queryParams: string[] = [];

  if (params.begIndex !== undefined) {
    queryParams.push(`begIndex=${params.begIndex}`);
  }
  if (params.endIndex !== undefined) {
    queryParams.push(`endIndex=${params.endIndex}`);
  }

  if (queryParams.length === 0) return '';
  return `?${queryParams.join('&')}`;
}

export default lcuAPI;
