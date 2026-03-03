/** 召唤师信息 */
export interface Summoner {
  puuid: string;
  summonerId: number;
  accountId: number;
  displayName: string;
  internalName: string;
  profileIconId: number;
  summonerLevel: number;
  xpSinceLastLevel: number;
  xpUntilNextLevel: number;
}
