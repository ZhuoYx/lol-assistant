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
  selectedPosition?: string;
  spell1Id?: number;
  spell2Id?: number;
}

/** Gameflow session 结构（LCU 原始格式） */
interface GameflowSession {
  gameData: {
    gameId: number;
    queue: { id: number; gameMode: string };
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
      const queueId = gameData.queue?.id ?? 0;

      // 2. 提取所有玩家
      const teamOnePlayers = gameData.teamOne ?? [];
      const teamTwoPlayers = gameData.teamTwo ?? [];

      // 3. 并发获取每位玩家的详细数据
      const [team1, team2] = await Promise.all([
        fetchTeamData(teamOnePlayers, 100, queueId),
        fetchTeamData(teamTwoPlayers, 200, queueId),
      ]);

      const analysis: LiveGameAnalysis = {
        gameId,
        gameMode,
        queueId,
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

/** 位置排序优先级 */
const POSITION_ORDER: Record<string, number> = {
  TOP: 1,
  JUNGLE: 2,
  MIDDLE: 3,
  BOTTOM: 4,
  UTILITY: 5,
  // LCU 可能使用的其他格式
  top: 1,
  jungle: 2,
  middle: 3,
  bottom: 4,
  utility: 5,
  MID: 3,
  ADC: 4,
  SUPPORT: 5,
  SUP: 5,
  FILL: 6,
  UNSELECTED: 7,
};

/**
 * 并发获取一个队伍所有玩家的数据
 */
async function fetchTeamData(
  players: GameflowPlayer[],
  teamId: number,
  queueId: number = 0,
): Promise<LiveGameTeam> {
  const results = await Promise.allSettled(
    players.map((p) => limit(() => fetchPlayerData(p, queueId))),
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

  // 按位置排序：上路 > 打野 > 中路 > 下路 > 辅助
  teamPlayers.sort((a, b) => {
    const orderA = POSITION_ORDER[(a.position ?? '').toUpperCase()] ?? 99;
    const orderB = POSITION_ORDER[(b.position ?? '').toUpperCase()] ?? 99;
    return orderA - orderB;
  });

  return { teamId, players: teamPlayers };
}

/**
 * 获取单个玩家的详细数据
 */
async function fetchPlayerData(player: GameflowPlayer, queueId: number = 0): Promise<LiveGamePlayer> {
  const { puuid, summonerId, championId, summonerName: rawName } = player;

  // 并发请求：段位、英雄熟练度、近期战绩
  const [rankResult, masteryResult, recentResult] = await Promise.allSettled([
    lcuAPI.getRankStats(puuid),
    lcuAPI.getChampionMastery(summonerId),
    lcuAPI.getMatchListByPUUID(puuid, { begIndex: 0, endIndex: 10 }),
  ]);

  // 段位信息：根据队列类型优先显示对应段位
  // 灵活排位 queueId=440 显示灵活段位，其余显示单双段位
  let tier = '';
  let division = '';
  let leaguePoints = 0;
  if (rankResult.status === 'fulfilled') {
    const ranked = rankResult.value;
    const isFlexQueue = queueId === 440;
    const primaryQueue = isFlexQueue
      ? ranked.queueMap?.RANKED_FLEX_SR
      : ranked.queueMap?.RANKED_SOLO_5x5;
    const fallbackQueue = isFlexQueue
      ? ranked.queueMap?.RANKED_SOLO_5x5
      : ranked.queueMap?.RANKED_FLEX_SR;
    const queueInfo = primaryQueue?.tier ? primaryQueue : fallbackQueue;
    if (queueInfo) {
      tier = queueInfo.tier ?? '';
      division = queueInfo.division ?? '';
      leaguePoints = queueInfo.leaguePoints ?? 0;
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
    const matchList = recentResult.value as Record<string, unknown>;
    // LCU 原始格式: { games: { games: [...], gameCount } } 或标准格式 { matches: [...] }
    let matches: Record<string, unknown>[] = [];
    if (Array.isArray(matchList.matches)) {
      matches = matchList.matches;
    } else if (matchList.games && typeof matchList.games === 'object') {
      const gamesWrapper = matchList.games as Record<string, unknown>;
      matches = (Array.isArray(gamesWrapper.games) ? gamesWrapper.games : []) as Record<string, unknown>[];
    }

    if (matches.length > 0) {
      let wins = 0;
      let totalKills = 0;
      let totalDeaths = 0;
      let totalAssists = 0;
      let champWins = 0;
      let champGames = 0;

      for (const match of matches) {
        // 兼容两种格式：stats 嵌套或直接在 match 上
        const stats = (match.stats && typeof match.stats === 'object' ? match.stats : match) as Record<string, unknown>;
        const participants = (match.participants ?? []) as Record<string, unknown>[];
        // 列表中只有一个 participant（当前玩家）
        const participant = participants[0];
        const pStats = participant
          ? ((participant.stats && typeof participant.stats === 'object' ? participant.stats : participant) as Record<string, unknown>)
          : stats;

        const isWin = Boolean(pStats.win ?? stats.win ?? match.win);
        if (isWin) wins++;
        totalKills += (pStats.kills ?? stats.kills ?? 0) as number;
        totalDeaths += (pStats.deaths ?? stats.deaths ?? 0) as number;
        totalAssists += (pStats.assists ?? stats.assists ?? 0) as number;

        const matchChampId = (participant?.championId ?? match.championId ?? 0) as number;
        if (matchChampId === championId) {
          champGames++;
          if (isWin) champWins++;
        }
      }

      recentWinRate = matches.length > 0 ? wins / matches.length : 0;
      recentKDA = totalDeaths > 0
        ? Math.round(((totalKills + totalAssists) / totalDeaths) * 100) / 100
        : totalKills + totalAssists > 0 ? 999 : 0;

      championGamesPlayed = champGames;
      championWinRate = champGames > 0 ? champWins / champGames : 0;
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
    position: player.selectedPosition ?? '',
    spell1Id: player.spell1Id ?? 0,
    spell2Id: player.spell2Id ?? 0,
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
    position: player.selectedPosition ?? '',
    spell1Id: player.spell1Id ?? 0,
    spell2Id: player.spell2Id ?? 0,
    dataStatus: 'failed',
  };
}
