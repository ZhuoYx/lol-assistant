/** 排位信息 */
export interface RankStats {
  queueMap: {
    RANKED_SOLO_5x5: QueueInfo;
    RANKED_FLEX_SR: QueueInfo;
  };
}

/** 队列排位信息 */
export interface QueueInfo {
  tier: string;
  division: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  miniSeries?: MiniSeries;
}

/** 晋级赛信息 */
export interface MiniSeries {
  target: number;
  wins: number;
  losses: number;
  progress: string;
}
