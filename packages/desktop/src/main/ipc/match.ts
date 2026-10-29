/**
 * 战绩相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { cacheStore } from '../cache/store';
import { logger } from '../utils/logger';
import type { MatchListParams, MatchList, MatchSummary, MatchDetail, Participant, Team } from '@lol-assistant/shared';
import { getChampionDisplayName, calculateKDA } from '@lol-assistant/shared';

/**
 * 从 LCU 原始数据中推断玩家的位置（lane）
 * 优先级：individualPosition > teamPosition > lane + role 组合推断
 *
 * 核心问题：Riot API 有多个字段表达"位置"：
 * - individualPosition / teamPosition：新版 API 直接给出 TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY
 * - timeline.lane + timeline.role：老版 API 的组合表示
 *   - lane=BOTTOM + role=DUO_CARRY → ADC (BOTTOM)
 *   - lane=BOTTOM + role=DUO_SUPPORT → 辅助 (UTILITY)
 * - stats.lane / stats.role：兜底字段
 *
 * 本函数统一处理所有情况，返回 TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY 中的一个
 */
function inferLane(fields: {
  individualPosition?: string;
  teamPosition?: string;
  timelineLane?: string;
  timelineRole?: string;
  rawLane?: string;
  rawRole?: string;
}): string {
  const {
    individualPosition = '',
    teamPosition = '',
    timelineLane = '',
    timelineRole = '',
    rawLane = '',
    rawRole = '',
  } = fields;

  // 合并所有 role 信息，用于辅助/ADC 的强制修正
  const effectiveRole = timelineRole || rawRole;

  // ★ 最高优先级：role 字段明确为 DUO_SUPPORT / DUO_CARRY 时，直接确定位置
  // Riot 的 individualPosition / teamPosition 是算法推测，可能完全错误
  //（如辅助英雄游走时间长被判为中路），但 role 是基于选位/行为的明确标记
  if (effectiveRole === 'DUO_SUPPORT' || effectiveRole === 'SUPPORT') {
    return 'UTILITY';
  }
  if (effectiveRole === 'DUO_CARRY') {
    return 'BOTTOM';
  }

  // 1. individualPosition（排除 BOTTOM，因为无法区分 ADC/辅助，上面已处理有 role 的情况）
  if (individualPosition && individualPosition !== 'NONE' && individualPosition !== 'Invalid') {
    return individualPosition;
  }

  // 2. teamPosition 次之
  if (teamPosition && teamPosition !== 'NONE' && teamPosition !== 'Invalid') {
    return teamPosition;
  }

  // 3. 通过 lane 兜底
  const baseLane = (timelineLane && timelineLane !== 'NONE') ? timelineLane : rawLane;

  if (baseLane && baseLane !== 'NONE') {
    return baseLane;
  }

  return '';
}

/**
 * 对已有 lane 字段进行纠正（用于"已是标准格式"的数据）
 * LCU 数据中 lane 可能完全错误（如辅助被标为 MIDDLE），需要结合 role 字段修正
 *
 * role 字段优先级高于 lane：
 * - role=DUO_SUPPORT/SUPPORT → 一定是辅助 → UTILITY
 * - role=DUO_CARRY → 一定是 ADC → BOTTOM
 */
function correctLane(lane: string, role: string): string {
  // role 明确为辅助时，无论 lane 是什么值，都修正为 UTILITY
  if (role === 'DUO_SUPPORT' || role === 'SUPPORT') {
    return 'UTILITY';
  }

  // role 明确为 ADC 时，修正为 BOTTOM
  if (role === 'DUO_CARRY') {
    return 'BOTTOM';
  }

  return lane || '';
}

/**
 * 将 LCU 原始战绩数据转换为标准 MatchList 格式
 * LCU 返回: { games: { games: [...], gameCount } }
 * 每个 game: { gameId, gameCreation, gameDuration, gameMode, gameType, participants: [{ stats, championId, ... }] }
 */
export function transformMatchList(raw: unknown): MatchList {
  const data = raw as Record<string, unknown>;

  // 兼容两种格式：直接 { matches, totalGames } 或 LCU 原始 { games: { games, gameCount } }
  if (data.matches && Array.isArray(data.matches)) {
    // 已是标准格式，但仍需补充 MVP/SVP 计算 + 位置纠正
    const result = data as unknown as MatchList;
    for (const match of result.matches) {
      // 修正位置：标准格式中 lane 可能不准确，需要结合 role 修正
      const oldLane = match.lane;
      match.lane = correctLane(match.lane, match.role);
      if (oldLane !== match.lane) {
        logger.debug(`[matchList-std] gameId=${match.gameId}, lane corrected: ${oldLane} → ${match.lane} (role=${match.role})`);
      }
      // 如果已经有 MVP/SVP 标记则跳过
      if (match.isMVP || match.isSVP) continue;
      // 列表数据无法获得同队其他玩家 KDA，保持原值
    }
    return result;
  }

  const gamesWrapper = (data.games ?? data) as Record<string, unknown>;
  const rawGames = (gamesWrapper.games ?? []) as Record<string, unknown>[];
  const gameCount = (gamesWrapper.gameCount ?? gamesWrapper.totalGames ?? 0) as number;

  const matches: MatchSummary[] = rawGames.map((game) => {
    const participants = (game.participants ?? []) as Record<string, unknown>[];
    const player = participants[0] ?? {};
    const playerStats = (player.stats && typeof player.stats === 'object' ? player.stats : player) as Record<string, unknown>;
    const championId = (player.championId ?? 0) as number;
    const playerTeamId = (player.teamId ?? 100) as number;
    const playerWin = Boolean(playerStats.win);
    const playerKills = (playerStats.kills ?? 0) as number;
    const playerDeaths = (playerStats.deaths ?? 0) as number;
    const playerAssists = (playerStats.assists ?? 0) as number;
    const playerKDA = calculateKDA(playerKills, playerDeaths, playerAssists);

    // 计算 MVP/SVP: 需要同队所有玩家数据才能比较
    let isMVP = false;
    let isSVP = false;

    // 只有当列表数据包含多个参与者时才能计算 MVP/SVP
    // LCU 列表接口通常只返回当前玩家，无法与队友比较，此时不标记
    const sameTeamPlayers = participants.filter(p => (p.teamId ?? 0) as number === playerTeamId);
    if (sameTeamPlayers.length > 1) {
      let isHighest = true;
      for (let i = 0; i < sameTeamPlayers.length; i++) {
        const p = sameTeamPlayers[i];
        if (p === player) continue;
        const pStats = (p.stats && typeof p.stats === 'object' ? p.stats : p) as Record<string, unknown>;
        const pKDA = calculateKDA(
          (pStats.kills ?? 0) as number,
          (pStats.deaths ?? 0) as number,
          (pStats.assists ?? 0) as number,
        );
        if (pKDA > playerKDA) {
          isHighest = false;
          break;
        }
      }

      if (isHighest) {
        if (playerWin) isMVP = true;
        else isSVP = true;
      }
    }
    // participants.length <= 1: 无法比较，不标记 MVP/SVP

    // lane/position 信息：使用统一的位置推断函数
    const timeline = (player.timeline ?? {}) as Record<string, unknown>;
    const rawRole = (playerStats.role ?? player.role ?? timeline.role ?? '') as string;

    const inferFields = {
      individualPosition: (playerStats.individualPosition ?? player.individualPosition ?? '') as string,
      teamPosition: (playerStats.teamPosition ?? player.teamPosition ?? '') as string,
      timelineLane: (timeline.lane ?? '') as string,
      timelineRole: (timeline.role ?? playerStats.role ?? '') as string,
      rawLane: (playerStats.lane ?? player.lane ?? '') as string,
      rawRole,
    };
    const effectiveLane = inferLane(inferFields);

    logger.debug(`[matchList] gameId=${(game.gameId ?? 0)}, champion=${championId}, ` +
      `inferFields=${JSON.stringify(inferFields)}, result=${effectiveLane}`);

    return {
      gameId: (game.gameId ?? 0) as number,
      gameMode: (game.gameMode ?? '') as string,
      gameType: (game.gameType ?? '') as string,
      queueId: (game.queueId ?? 0) as number,
      gameCreation: (game.gameCreation ?? 0) as number,
      gameDuration: (game.gameDuration ?? 0) as number,
      championId,
      championName: getChampionDisplayName(championId),
      win: playerWin,
      kills: playerKills,
      deaths: playerDeaths,
      assists: playerAssists,
      lane: effectiveLane,
      role: rawRole as string,
      isMVP,
      isSVP,
    };
  });

  return { matches, totalGames: gameCount };
}

/**
 * 将 LCU 原始战绩详情转换为标准 MatchDetail 格式
 * LCU API 可能返回多种格式：
 *  - 新版：participants[].stats 嵌套，participantIdentities 独立
 *  - 旧版：stats 可能已展平到 participant 上
 *  - 某些版本：kills 等字段直接在 participant 上
 */
function transformMatchDetail(raw: unknown): MatchDetail {
  const data = raw as Record<string, unknown>;

  // 如果已经是标准格式（有 participants[].kills 且有 summonerName），仍需计算 MVP/SVP
  if (
    Array.isArray(data.participants) &&
    data.participants.length > 0 &&
    typeof (data.participants[0] as Record<string, unknown>).kills === 'number' &&
    typeof (data.participants[0] as Record<string, unknown>).summonerName === 'string'
  ) {
    const result = data as unknown as MatchDetail;
    const identities = (data.participantIdentities ?? []) as Record<string, unknown>[];
    // 补充 participantId 和 tagLine（如果缺失）
    result.participants.forEach((p, idx) => {
      if (!p.participantId) p.participantId = idx + 1;
      if (!p.tagLine) {
        // 尝试从 participantIdentities 提取
        if (identities.length > idx) {
          const playerInfo = ((identities[idx] as Record<string, unknown>).player ?? {}) as Record<string, unknown>;
          p.tagLine = (playerInfo.tagLine ?? '') as string;
        }
        // 或从 participant 原始数据提取
        const rawP = (data.participants as Record<string, unknown>[])[idx];
        if (!p.tagLine && rawP?.tagLine) {
          p.tagLine = rawP.tagLine as string;
        }
      }
      // 修正位置：标准格式数据中 lane 可能不准确
      // 如辅助被算法标为 MIDDLE/BOTTOM，需结合 role 修正
      const rawP = (data.participants as Record<string, unknown>[])[idx];
      const rawRole = (rawP?.role ?? '') as string;
      const oldLane = p.lane;
      p.lane = correctLane(p.lane, p.role || rawRole);
      if (oldLane !== p.lane) {
        logger.debug(`[matchDetail-std] participant=${p.participantId}, lane corrected: ${oldLane} → ${p.lane} (role=${p.role || rawRole})`);
      }
    });
    // 计算 MVP/SVP
    const stdTeamIds = [...new Set(result.participants.map(p => p.teamId))];
    for (const tid of stdTeamIds) {
      const teamPlayers = result.participants.filter(p => p.teamId === tid);
      if (teamPlayers.length === 0) continue;
      let bestIdx = 0;
      let bestKDA = calculateKDA(teamPlayers[0].kills, teamPlayers[0].deaths, teamPlayers[0].assists);
      for (let i = 1; i < teamPlayers.length; i++) {
        const kda = calculateKDA(teamPlayers[i].kills, teamPlayers[i].deaths, teamPlayers[i].assists);
        if (kda > bestKDA) {
          bestKDA = kda;
          bestIdx = i;
        }
      }
      // 先清除旧标记
      teamPlayers.forEach(p => { p.isMVP = false; p.isSVP = false; });
      if (teamPlayers[bestIdx].win) {
        teamPlayers[bestIdx].isMVP = true;
      } else {
        teamPlayers[bestIdx].isSVP = true;
      }
    }
    return result;
  }

  const gameId = (data.gameId ?? 0) as number;
  const queueId = (data.queueId ?? 0) as number;
  const gameMode = (data.gameMode ?? '') as string;
  const gameType = (data.gameType ?? '') as string;
  const gameCreation = (data.gameCreation ?? 0) as number;
  const gameDuration = (data.gameDuration ?? 0) as number;

  // 转换 teams
  const rawTeams = (data.teams ?? []) as Record<string, unknown>[];
  const teams: Team[] = rawTeams.map((t) => ({
    teamId: (t.teamId ?? 100) as number,
    win: t.win === 'Win' || t.win === true || (t.win as string) === 'true',
    bans: ((t.bans ?? []) as { championId: number; pickTurn: number }[]),
    objectives: (t.objectives ?? {}) as Record<string, { first: boolean; kills: number }>,
  }));


  // 转换 participants
  const rawParticipants = (data.participants ?? []) as Record<string, unknown>[];
  const participantIdentities = (data.participantIdentities ?? []) as Record<string, unknown>[];

  const participants: Participant[] = rawParticipants.map((p, idx) => {
    // stats 可能嵌套在 p.stats 中，也可能直接在 p 上
    const hasNestedStats = p.stats && typeof p.stats === 'object';
    const stats = (hasNestedStats ? p.stats : p) as Record<string, unknown>;
    const championId = (p.championId ?? 0) as number;
    const teamId = (p.teamId ?? 100) as number;
    const participantId = (p.participantId ?? idx + 1) as number;

    // 从 participantIdentities 获取玩家信息（可能没有此字段）
    let puuid = '';
    let summonerName = '';
    let tagLine = '';

    if (participantIdentities.length > idx) {
      const identity = participantIdentities[idx];
      const playerInfo = (identity.player ?? {}) as Record<string, unknown>;
      puuid = (playerInfo.puuid ?? identity.puuid ?? '') as string;
      summonerName = (playerInfo.gameName ?? playerInfo.summonerName ?? '') as string;
      tagLine = (playerInfo.tagLine ?? '') as string;
    }

    // 如果 participant 本身有 puuid/summonerName，优先使用
    if (!puuid && p.puuid) puuid = p.puuid as string;
    if (!summonerName && p.summonerName) summonerName = p.summonerName as string;
    if (!summonerName && p.gameName) summonerName = p.gameName as string;
    if (!tagLine && p.tagLine) tagLine = p.tagLine as string;

    // 提取装备 (item0-item6)
    const items: number[] = [];
    for (let i = 0; i <= 6; i++) {
      items.push((stats[`item${i}`] ?? 0) as number);
    }

    // 提取符文
    const perkIds: number[] = [];
    for (let i = 0; i <= 5; i++) {
      const perkId = (stats[`perk${i}`] ?? 0) as number;
      if (perkId) perkIds.push(perkId);
    }

    // 判断胜负：从 stats.win 或对应 team
    const teamData = teams.find((t) => t.teamId === teamId);
    const win = stats.win !== undefined ? Boolean(stats.win) : (teamData?.win ?? false);

    // lane/position 信息：使用统一的位置推断函数
    const timeline = (p.timeline ?? {}) as Record<string, unknown>;
    const rawRole = (stats.role ?? p.role ?? timeline.role ?? '') as string;

    const inferFields = {
      individualPosition: (p.individualPosition ?? stats.individualPosition ?? '') as string,
      teamPosition: (p.teamPosition ?? stats.teamPosition ?? '') as string,
      timelineLane: (timeline.lane ?? '') as string,
      timelineRole: (timeline.role ?? '') as string,
      rawLane: (stats.lane ?? p.lane ?? '') as string,
      rawRole,
    };
    const lane = inferLane(inferFields);

    logger.debug(`[matchDetail] participant=${participantId}, champion=${championId}, ` +
      `inferFields=${JSON.stringify(inferFields)}, result=${lane}`);

    return {
      participantId,
      puuid,
      summonerName,
      tagLine,
      championId,
      championName: getChampionDisplayName(championId),
      teamId,
      win,
      kills: (stats.kills ?? 0) as number,
      deaths: (stats.deaths ?? 0) as number,
      assists: (stats.assists ?? 0) as number,
      totalDamageDealt: (stats.totalDamageDealtToChampions ?? stats.totalDamageDealt ?? 0) as number,
      totalDamageTaken: (stats.totalDamageTaken ?? 0) as number,
      goldEarned: (stats.goldEarned ?? 0) as number,
      visionScore: (stats.visionScore ?? 0) as number,
      items,
      perks: {
        perkStyle: (stats.perkPrimaryStyle ?? 0) as number,
        perkSubStyle: (stats.perkSubStyle ?? 0) as number,
        perkIds,
      },
      lane,
      role: rawRole as string,
    };
  });

  // 计算每个队伍的 MVP（胜方 KDA 最高）和 SVP（败方 KDA 最高）
  const teamIds = [...new Set(participants.map(p => p.teamId))];
  for (const tid of teamIds) {
    const teamPlayers = participants.filter(p => p.teamId === tid);
    if (teamPlayers.length === 0) continue;

    let bestIdx = 0;
    let bestKDA = calculateKDA(teamPlayers[0].kills, teamPlayers[0].deaths, teamPlayers[0].assists);
    for (let i = 1; i < teamPlayers.length; i++) {
      const kda = calculateKDA(teamPlayers[i].kills, teamPlayers[i].deaths, teamPlayers[i].assists);
      if (kda > bestKDA) {
        bestKDA = kda;
        bestIdx = i;
      }
    }

    if (teamPlayers[bestIdx].win) {
      teamPlayers[bestIdx].isMVP = true;
    } else {
      teamPlayers[bestIdx].isSVP = true;
    }
  }

  return {
    gameId,
    queueId,
    gameMode,
    gameType,
    gameCreation,
    gameDuration,
    teams,
    participants,
  };
}

/**
 * 获取战绩分页（含缓存、数据转换和本地筛选）
 * 可被 match:getList IPC handler 和 champion:getStats 等其他模块复用
 */
export async function fetchMatchList(params: MatchListParams): Promise<MatchList> {
  params = { ...params, begIndex: params.begIndex ?? 0, endIndex: params.endIndex ?? (params.begIndex ?? 0) + 19 };
  const puuid = params.puuid;
  const cacheKey = `list_v2_${puuid ?? 'me'}_${params.begIndex}_${params.endIndex}_q${params.queue ?? 'all'}_c${params.championId ?? 'all'}`;
  const cached = cacheStore.get<MatchList>('matchList', cacheKey);
  if (cached) {
    // 对缓存数据做位置修正（旧缓存中 lane 可能是错误值）
    for (const match of cached.matches) {
      match.lane = correctLane(match.lane, match.role);
    }
    return cached;
  }

  // LCU API 不支持 queue 参数，先拿全部数据再前端过滤
  const apiParams: MatchListParams = {
    ...params,
    puuid: undefined,  // 移除 puuid，API 不需要
    queue: undefined,  // 移除 queue，避免 400 错误
  };

  // 如果指定了 puuid，使用按 PUUID 查询的接口；否则使用当前用户接口
  const raw = puuid
    ? await lcuAPI.getMatchListByPUUID(puuid, apiParams)
    : await lcuAPI.getMatchList(apiParams);
  const matchList = transformMatchList(raw);
  const rawCount = matchList.matches.length;
  matchList.pageGameIds = matchList.matches.map(m => m.gameId);
  matchList.nextIndex = (params.begIndex ?? 0) + rawCount;
  matchList.hasMore = rawCount >= (params.endIndex ?? 19) - (params.begIndex ?? 0) + 1;

  // 按队列类型过滤
  if (params.queue !== undefined) {
    matchList.matches = matchList.matches.filter(m => m.queueId === params.queue);
  }
  if (params.championId !== undefined) {
    matchList.matches = matchList.matches.filter(m => m.championId === params.championId);
  }

  // 列表不预取每局详情
  // Detail requests are deferred until the user opens a match, avoiding N+1 calls per page.

  logger.debug(`fetchMatchList 转换完成: ${matchList.matches.length} 场, 共 ${matchList.totalGames} 场`);
  cacheStore.set('matchList', cacheKey, matchList);
  return matchList;
}

export function registerMatchIpcHandlers(): void {
  // 获取战绩分页；单局详情按需请求
  ipcMain.handle('match:getList', async (_event, params: MatchListParams) => {
    try {
      return await fetchMatchList(params);
    } catch (err) {
      logger.error('IPC match:getList 失败:', err);
      throw err;
    }
  });

  // 获取战绩详情
  ipcMain.handle('match:getDetail', async (_event, gameId: number) => {
    try {
      const cacheKey = String(gameId);
      const cached = cacheStore.get<MatchDetail>('matchDetail', cacheKey);
      if (cached) {
        logger.debug(`match:getDetail 缓存命中: gameId=${gameId}`);
        // 对缓存数据做位置修正（旧缓存中 lane 可能是错误值）
        for (const p of cached.participants) {
          p.lane = correctLane(p.lane, p.role);
        }
        return cached;
      }

      const raw = await lcuAPI.getMatchDetail(gameId);
      logger.debug(`match:getDetail 原始数据类型: ${typeof raw}, is null: ${raw === null}`);
      if (raw && typeof raw === 'object') {
        const rawObj = raw as unknown as Record<string, unknown>;
        logger.debug(`match:getDetail 原始数据顶层 keys: ${Object.keys(rawObj).join(', ')}`);
        const rawP = rawObj.participants as unknown[] | undefined;
        const rawPI = rawObj.participantIdentities as unknown[] | undefined;
        logger.debug(`match:getDetail participants=${rawP?.length ?? 0}, identities=${rawPI?.length ?? 0}, teams=${(rawObj.teams as unknown[])?.length ?? 0}`);
      }

      const detail = transformMatchDetail(raw);
      logger.debug(`match:getDetail 转换完成: gameId=${gameId}, participants=${detail.participants.length}`);
      cacheStore.set('matchDetail', cacheKey, detail);
      return detail;
    } catch (err) {
      logger.error(`IPC match:getDetail 失败 (gameId=${gameId}):`, err);
      throw err;
    }
  });
}
