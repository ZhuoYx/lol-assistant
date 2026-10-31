/**
 * 对局实时分析 IPC 处理器
 *
 * 10 人数据并发获取流程：
 * 1. 通过 /lol-gameflow/v1/session 获取当前对局 session
 * 2. 并发请求每位玩家数据（Promise.allSettled 容错，p-limit 控制并发 ≤5）
 * 3. 聚合数据为 LiveGameAnalysis 结构返回
 * 4. 通过战绩交叉对比检测预组队（双排/多排）
 */
import { ipcMain } from 'electron';
import pLimit from 'p-limit';
import { lcuAPI } from '../lcu/api';
import { logger } from '../utils/logger';
import { ErrorCode, createAppError } from '@lol-assistant/shared';
import type {
  LiveGameAnalysis,
  LiveGameTeam,
  LiveGamePlayer,
  RecentMatchSummary,
} from '@lol-assistant/shared';

/** 并发数限制 */
const limit = pLimit(5);

/** Gameflow session 中的玩家数据结构（LCU 原始格式） */
interface GameflowPlayer {
  puuid: string;
  summonerId: number;
  summonerName?: string;
  gameName?: string;
  gameTag?: string;
  tagLine?: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
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

/** 预组队检测阈值：同队中有 N 场以上相同对局认为是预组队 */
const PREMADE_THRESHOLD = 2;

export function registerLiveGameIpcHandlers(): void {
  ipcMain.handle('live-game:analyze', async () => {
    try {
      // 1. 获取 gameflow session
      const session = (await lcuAPI.getGameflowSession()) as GameflowSession;

      if (!session?.gameData) {
        throw createAppError(ErrorCode.LIVE_GAME_NOT_IN_GAME, '当前不在对局中');
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

      // 4. 检测预组队
      team1.premadeGroups = detectPremadeGroups(team1.players);
      team2.premadeGroups = detectPremadeGroups(team2.players);

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
      throw createAppError(ErrorCode.LIVE_GAME_NOT_IN_GAME, '获取对局数据失败', String(err));
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
 * 检测预组队分组
 * 算法：比较每两个玩家的近期战绩，如果有 >= PREMADE_THRESHOLD 场相同 gameId，
 * 则认为他们是预组队。使用并查集合并重叠的组。
 */
function detectPremadeGroups(players: LiveGamePlayer[]): string[][] {
  const loadedPlayers = players.filter(
    (p) => p.dataStatus === 'loaded' && p.recentMatches && p.recentMatches.length > 0,
  );
  if (loadedPlayers.length < 2) return [];

  // 构建每个玩家的 gameId 集合
  const playerGameIds = new Map<string, Set<number>>();
  for (const p of loadedPlayers) {
    const gameIds = new Set((p.recentMatches ?? []).map((m) => m.gameId));
    playerGameIds.set(p.puuid, gameIds);
  }

  // 并查集
  const parent = new Map<string, string>();
  for (const p of loadedPlayers) {
    parent.set(p.puuid, p.puuid);
  }

  function find(x: string): string {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: string, y: string): void {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  }

  // 两两比较玩家的 gameId 交集
  for (let i = 0; i < loadedPlayers.length; i++) {
    for (let j = i + 1; j < loadedPlayers.length; j++) {
      const p1 = loadedPlayers[i];
      const p2 = loadedPlayers[j];
      const ids1 = playerGameIds.get(p1.puuid)!;
      const ids2 = playerGameIds.get(p2.puuid)!;

      let commonCount = 0;
      for (const gid of ids1) {
        if (ids2.has(gid)) commonCount++;
      }

      if (commonCount >= PREMADE_THRESHOLD) {
        union(p1.puuid, p2.puuid);
      }
    }
  }

  // 收集分组
  const groups = new Map<string, string[]>();
  for (const p of loadedPlayers) {
    const root = find(p.puuid);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(p.puuid);
  }

  // 只返回 >= 2 人的组（单人不算预组队）
  return Array.from(groups.values()).filter((g) => g.length >= 2);
}

/**
 * 获取单个玩家的详细数据
 */
export async function resolvePlayerIdentity(player: GameflowPlayer) {
  let summoner;
  if (player.puuid && !/^0+$/.test(player.puuid.replace(/-/g, ''))) {
    summoner = await lcuAPI.getSummonerByPUUID(player.puuid).catch(() => undefined);
  }
  if (!summoner && player.summonerId > 0) {
    summoner = await lcuAPI.getSummonerById(player.summonerId).catch(() => undefined);
  }
  return {
    summonerName:
      summoner?.gameName ||
      player.gameName ||
      player.riotIdGameName ||
      summoner?.displayName ||
      player.summonerName ||
      '',
    tagLine: summoner?.tagLine || player.tagLine || player.gameTag || player.riotIdTagline || '',
  };
}

async function fetchPlayerData(
  player: GameflowPlayer,
  queueId: number = 0,
): Promise<LiveGamePlayer> {
  const { puuid, summonerId, championId } = player;

  // 并发请求：段位、英雄熟练度、近期战绩
  const [rankResult, masteryResult, recentResult, identityResult] = await Promise.allSettled([
    lcuAPI.getRankStats(puuid),
    lcuAPI.getChampionMastery(summonerId),
    lcuAPI.getMatchListByPUUID(puuid, { begIndex: 0, endIndex: 9 }),
    resolvePlayerIdentity(player),
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
  const recentMatches: RecentMatchSummary[] = [];

  if (recentResult.status === 'fulfilled') {
    const matchList = recentResult.value as unknown as Record<string, unknown>;
    // LCU 原始格式: { games: { games: [...], gameCount } } 或标准格式 { matches: [...] }
    let matches: Record<string, unknown>[] = [];
    if (Array.isArray(matchList.matches)) {
      matches = matchList.matches;
    } else if (matchList.games && typeof matchList.games === 'object') {
      const gamesWrapper = matchList.games as Record<string, unknown>;
      matches = (Array.isArray(gamesWrapper.games) ? gamesWrapper.games : []) as Record<
        string,
        unknown
      >[];
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
        const stats = (
          match.stats && typeof match.stats === 'object' ? match.stats : match
        ) as Record<string, unknown>;
        const participants = (match.participants ?? []) as Record<string, unknown>[];
        // 列表中只有一个 participant（当前玩家）
        const participant = participants[0];
        const pStats = participant
          ? ((participant.stats && typeof participant.stats === 'object'
              ? participant.stats
              : participant) as Record<string, unknown>)
          : stats;

        const isWin = Boolean(pStats.win ?? stats.win ?? match.win);
        if (isWin) wins++;
        const kills = (pStats.kills ?? stats.kills ?? 0) as number;
        const deaths = (pStats.deaths ?? stats.deaths ?? 0) as number;
        const assists = (pStats.assists ?? stats.assists ?? 0) as number;
        totalKills += kills;
        totalDeaths += deaths;
        totalAssists += assists;

        const matchChampId = (participant?.championId ?? match.championId ?? 0) as number;
        if (matchChampId === championId) {
          champGames++;
          if (isWin) champWins++;
        }

        // 构建近期战绩摘要
        recentMatches.push({
          gameId: (match.gameId ?? 0) as number,
          championId: matchChampId,
          win: isWin,
          kills,
          deaths,
          assists,
          queueId: (match.queueId ?? 0) as number,
          gameDuration: (match.gameDuration ?? 0) as number,
          gameCreation: (match.gameCreation ?? 0) as number,
        });
      }

      recentWinRate = matches.length > 0 ? wins / matches.length : 0;
      recentKDA =
        totalDeaths > 0
          ? Math.round(((totalKills + totalAssists) / totalDeaths) * 100) / 100
          : totalKills + totalAssists > 0
            ? 999
            : 0;

      championGamesPlayed = champGames;
      championWinRate = champGames > 0 ? champWins / champGames : 0;
    }
  }

  return {
    puuid,
    ...(identityResult.status === 'fulfilled'
      ? identityResult.value
      : { summonerName: player.gameName || player.summonerName || '' }),
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
    recentMatches,
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
    summonerName: player.gameName || player.riotIdGameName || player.summonerName || '',
    tagLine: player.tagLine || player.gameTag || player.riotIdTagline || '',
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
    recentMatches: [],
    position: player.selectedPosition ?? '',
    spell1Id: player.spell1Id ?? 0,
    spell2Id: player.spell2Id ?? 0,
    dataStatus: 'failed',
  };
}
