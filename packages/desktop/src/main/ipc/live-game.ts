/**
 * 对局实时分析 IPC 处理器
 *
 * 10 人数据并发获取流程：
 * 1. 通过 /lol-gameflow/v1/session 获取当前对局 session
 * 2. 并发请求每位玩家数据（Promise.allSettled 容错，p-limit 控制并发 ≤5）
 * 3. 聚合数据为 LiveGameAnalysis 结构返回
 */
import { ipcMain } from 'electron';
import pLimit from 'p-limit';
import { lcuAPI } from '../lcu/api';
import { logger } from '../utils/logger';
import { ErrorCode, createAppError } from '@lol-assistant/shared';
import type { LiveGameAnalysis, LiveGameTeam, LiveGamePlayer } from '@lol-assistant/shared';

/** 并发数限制 */
const limit = pLimit(5);

/** Gameflow session 中的玩家数据结构（LCU 原始格式） */
interface GameflowPlayer {
  puuid: string;
  summonerId: number;
  summonerName?: string;
  championId: number;
  teamId: number;
}

/** Gameflow session 结构（LCU 原始格式） */
interface GameflowSession {
  gameData: {
    gameId: number;
    queue: { gameMode: string };
    teamOne: GameflowPlayer[];
    teamTwo: GameflowPlayer[];
  };
  phase: string;
}

export function registerLiveGameIpcHandlers(): void {
  ipcMain.handle('live-game:analyze', async () => {
    try {
      // 1. 获取 gameflow session
      const session = (await lcuAPI.getGameflowSession()) as GameflowSession;

      if (!session?.gameData) {
        throw createAppError(
          ErrorCode.LIVE_GAME_NOT_IN_GAME,
          '当前不在对局中',
        );
      }

      const { gameData } = session;
      const gameId = gameData.gameId;
      const gameMode = gameData.queue?.gameMode ?? 'UNKNOWN';

      // 2. 提取所有玩家
      const teamOnePlayers = gameData.teamOne ?? [];
      const teamTwoPlayers = gameData.teamTwo ?? [];

      // 3. 并发获取每位玩家的详细数据
      const [team1, team2] = await Promise.all([
        fetchTeamData(teamOnePlayers, 100),
        fetchTeamData(teamTwoPlayers, 200),
      ]);

      const analysis: LiveGameAnalysis = {
        gameId,
        gameMode,
        teams: [team1, team2],
      };

      return analysis;
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err) {
        throw err; // AppError，直接抛出
      }
      logger.error('IPC live-game:analyze 失败:', err);
      throw createAppError(
        ErrorCode.LIVE_GAME_NOT_IN_GAME,
        '获取对局数据失败',
        String(err),
      );
    }
  });
}

/**
 * 并发获取一个队伍所有玩家的数据
 */
async function fetchTeamData(
  players: GameflowPlayer[],
  teamId: number,
): Promise<LiveGameTeam> {
  const results = await Promise.allSettled(
    players.map((p) => limit(() => fetchPlayerData(p))),
  );

  const teamPlayers: LiveGamePlayer[] = results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    // 获取失败时返回带 failed 状态的占位数据
    const raw = players[idx];
    logger.warn(`玩家 ${raw.puuid} 数据获取失败:`, result.reason);
    return createFailedPlayer(raw);
  });

  return { teamId, players: teamPlayers };
}

/**
 * 获取单个玩家的详细数据
 */
async function fetchPlayerData(player: GameflowPlayer): Promise<LiveGamePlayer> {
  const { puuid, summonerId, championId, summonerName: rawName } = player;

  // 并发请求：段位、英雄熟练度、近期战绩
  const [rankResult, masteryResult, recentResult] = await Promise.allSettled([
    lcuAPI.getRankStats(puuid),
    lcuAPI.getChampionMastery(summonerId),
    lcuAPI.getMatchListByPUUID(puuid, { begIndex: 0, endIndex: 10 }),
  ]);

  // 段位信息
  let tier = '';
  let division = '';
  let leaguePoints = 0;
  if (rankResult.status === 'fulfilled') {
    const ranked = rankResult.value;
    const soloQueue = ranked.queueMap?.RANKED_SOLO_5x5;
    if (soloQueue) {
      tier = soloQueue.tier ?? '';
      division = soloQueue.division ?? '';
      leaguePoints = soloQueue.leaguePoints ?? 0;
    }
  }

  // 英雄熟练度
  let championMasteryLevel = 0;
  let championGamesPlayed = 0;
  if (masteryResult.status === 'fulfilled') {
    const masteryList = masteryResult.value as Array<{
      championId: number;
      championLevel?: number;
      championPoints?: number;
    }>;
    const mastery = masteryList.find((m) => m.championId === championId);
    if (mastery) {
      championMasteryLevel = mastery.championLevel ?? 0;
    }
  }

  // 近期战绩
  let recentWinRate = 0;
  let recentKDA = 0;
  let championWinRate = 0;
  if (recentResult.status === 'fulfilled') {
    const matchList = recentResult.value;
    const matches = matchList.matches ?? [];

    if (matches.length > 0) {
      let wins = 0;
      let totalKills = 0;
      let totalDeaths = 0;
      let totalAssists = 0;
      let champWins = 0;
      let champGames = 0;

      for (const match of matches) {
        if (match.win) wins++;
        totalKills += match.kills ?? 0;
        totalDeaths += match.deaths ?? 0;
        totalAssists += match.assists ?? 0;

        if (match.championId === championId) {
          champGames++;
          if (match.win) champWins++;
        }
      }

      recentWinRate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;
      recentKDA = totalDeaths > 0
        ? Math.round(((totalKills + totalAssists) / totalDeaths) * 100) / 100
        : totalKills + totalAssists > 0 ? 999 : 0;

      championGamesPlayed = champGames;
      championWinRate = champGames > 0 ? Math.round((champWins / champGames) * 100) : 0;
    }
  }

  return {
    puuid,
    summonerName: rawName ?? '',
    championId,
    championName: '',
    tier,
    division,
    leaguePoints,
    championWinRate,
    championGamesPlayed,
    championMasteryLevel,
    recentWinRate,
    recentKDA,
    dataStatus: 'loaded',
  };
}

/**
 * 创建失败的玩家占位数据
 */
function createFailedPlayer(player: GameflowPlayer): LiveGamePlayer {
  return {
    puuid: player.puuid,
    summonerName: player.summonerName ?? '',
    championId: player.championId,
    championName: '',
    tier: '',
    division: '',
    leaguePoints: 0,
    championWinRate: 0,
    championGamesPlayed: 0,
    championMasteryLevel: 0,
    recentWinRate: 0,
    recentKDA: 0,
    dataStatus: 'failed',
  };
}
