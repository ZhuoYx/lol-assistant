import type {
  IAPIProvider,
  Summoner,
  MatchList,
  MatchDetail,
  MatchListParams,
  RankStats,
  ChampionStats,
  LiveGameAnalysis,
} from '@lol-assistant/shared';

/**
 * LCU API 提供者 - 通过 IPC 调用主进程的 LCU API
 */
export class LCUAPIProvider implements IAPIProvider {
  async getCurrentSummoner(): Promise<Summoner> {
    return window.electronAPI.getCurrentSummoner();
  }

  async getSummonerByPUUID(puuid: string): Promise<Summoner> {
    return window.electronAPI.getSummonerById(puuid);
  }

  async getMatchList(params: MatchListParams): Promise<MatchList> {
    return window.electronAPI.getMatchList(params);
  }

  async getMatchDetail(gameId: string): Promise<MatchDetail> {
    return window.electronAPI.getMatchDetail(Number(gameId));
  }

  async getRankStats(puuid: string): Promise<RankStats> {
    return window.electronAPI.getRankStats(puuid);
  }

  async getChampionStats(_puuid: string): Promise<ChampionStats[]> {
    // Will be implemented in Task 6 with actual LCU career-stats API call
    return [];
  }

  async getLiveGameAnalysis(): Promise<LiveGameAnalysis> {
    return window.electronAPI.analyzeLiveGame();
  }

  async getMatchListByPUUID(puuid: string, params: MatchListParams): Promise<MatchList> {
    return window.electronAPI.getMatchList({ ...params, puuid });
  }
}
