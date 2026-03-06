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
} from '@lol-assistant/shared';
import { lcuClient } from './client';

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
   * 通过召唤师名称搜索
   * LCU 端点 /lol-summoner/v1/summoners 需要 GET + form-encoded body { name: "xxx" }
   */
  async getSummonerByName(name: string): Promise<Summoner> {
    return lcuClient.request<Summoner>('/lol-summoner/v1/summoners', {
      method: 'GET',
      data: { name },
      contentType: 'form',
    });
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

  // ─── 自动接受对局 ──────────────────────────────────────

  /**
   * 接受对局匹配
   */
  async acceptMatch(): Promise<void> {
    await lcuClient.post('/lol-matchmaking/v1/ready-check/accept');
  },

  // ─── ARAM 板凳英雄交换 ────────────────────────────────

  /**
   * 交换 ARAM 板凳上的英雄（用板凳英雄替换自己当前的英雄）
   * @param championId 板凳上要交换的英雄 ID
   */
  async benchSwap(championId: number): Promise<void> {
    await lcuClient.post(`/lol-champ-select/v1/session/bench/swap/${championId}`);
  },

  // ─── 藏品背景皮肤 ──────────────────────────────────────

  /**
   * 获取当前藏品背景配置
   */
  async getCollectionsBackdrop(summonerId: number): Promise<unknown> {
    return lcuClient.get(`/lol-collections/v1/inventories/${summonerId}/backdrop`);
  },

  /**
   * 设置藏品背景皮肤
   * 通过 summoner-profile 端点设置，skinId 格式为 championId * 1000 + skinIndex
   */
  async setCollectionsBackdrop(_summonerId: number, data: { championId: number; skinId: number }): Promise<unknown> {
    return lcuClient.post('/lol-summoner/v1/current-summoner/summoner-profile', {
      key: 'backgroundSkinId',
      value: data.skinId,
    });
  },

  // ─── 个性签名 ──────────────────────────────────────────

  /**
   * 获取当前聊天信息（含个性签名）
   */
  async getChatMe(): Promise<unknown> {
    return lcuClient.get('/lol-chat/v1/me');
  },

  /**
   * 修改个性签名
   */
  async setStatusMessage(statusMessage: string): Promise<unknown> {
    return lcuClient.request('/lol-chat/v1/me', {
      method: 'PUT',
      data: { statusMessage },
    });
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
  // 注意：LCU API 不支持 queue 参数，队列筛选在前端完成
  if (params.championId !== undefined) {
    queryParams.push(`championId=${params.championId}`);
  }

  if (queryParams.length === 0) return '';
  return `?${queryParams.join('&')}`;
}

export default lcuAPI;
