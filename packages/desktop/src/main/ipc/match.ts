/**
 * 战绩相关 IPC 处理器
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { cacheStore } from '../cache/store';
import { logger } from '../utils/logger';
import type { MatchListParams, MatchList, MatchSummary } from '@lol-assistant/shared';
import { getChampionDisplayName } from '@lol-assistant/shared';

/**
 * 将 LCU 原始战绩数据转换为标准 MatchList 格式
 * LCU 返回: { games: { games: [...], gameCount } }
 * 每个 game: { gameId, gameCreation, gameDuration, gameMode, gameType, participants: [{ stats, championId, ... }] }
 */
function transformMatchList(raw: unknown): MatchList {
  const data = raw as Record<string, unknown>;

  // 兼容两种格式：直接 { matches, totalGames } 或 LCU 原始 { games: { games, gameCount } }
  if (data.matches && Array.isArray(data.matches)) {
    return data as unknown as MatchList;
  }

  const gamesWrapper = (data.games ?? data) as Record<string, unknown>;
  const rawGames = (gamesWrapper.games ?? []) as Record<string, unknown>[];
  const gameCount = (gamesWrapper.gameCount ?? gamesWrapper.totalGames ?? 0) as number;

  const matches: MatchSummary[] = rawGames.map((game) => {
    const participants = (game.participants ?? []) as Record<string, unknown>[];
    const player = participants[0] ?? {};
    const stats = (player.stats ?? {}) as Record<string, unknown>;
    const championId = (player.championId ?? 0) as number;

    return {
      gameId: (game.gameId ?? 0) as number,
      gameMode: (game.gameMode ?? '') as string,
      gameType: (game.gameType ?? '') as string,
      queueId: (game.queueId ?? 0) as number,
      gameCreation: (game.gameCreation ?? 0) as number,
      gameDuration: (game.gameDuration ?? 0) as number,
      championId,
      championName: getChampionDisplayName(championId),
      win: Boolean(stats.win),
      kills: (stats.kills ?? 0) as number,
      deaths: (stats.deaths ?? 0) as number,
      assists: (stats.assists ?? 0) as number,
      lane: (player.timeline?.lane ?? stats.lane ?? '') as string,
      role: (player.timeline?.role ?? stats.role ?? '') as string,
    };
  });

  return { matches, totalGames: gameCount };
}

export function registerMatchIpcHandlers(): void {
  // 获取战绩列表
  ipcMain.handle('match:getList', async (_event, params: MatchListParams) => {
    try {
      const cacheKey = `list_${params.begIndex ?? 0}_${params.endIndex ?? 20}`;
      const cached = cacheStore.get('matchList', cacheKey);
      if (cached) return cached;

      const raw = await lcuAPI.getMatchList(params);
      const matchList = transformMatchList(raw);
      logger.debug(`match:getList 转换完成: ${matchList.matches.length} 场, 共 ${matchList.totalGames} 场`);
      cacheStore.set('matchList', cacheKey, matchList);
      return matchList;
    } catch (err) {
      logger.error('IPC match:getList 失败:', err);
      throw err;
    }
  });

  // 获取战绩详情
  ipcMain.handle('match:getDetail', async (_event, gameId: number) => {
    try {
      const cacheKey = String(gameId);
      const cached = cacheStore.get('matchDetail', cacheKey);
      if (cached) return cached;

      const detail = await lcuAPI.getMatchDetail(gameId);
      cacheStore.set('matchDetail', cacheKey, detail);
      return detail;
    } catch (err) {
      logger.error(`IPC match:getDetail 失败 (gameId=${gameId}):`, err);
      throw err;
    }
  });
}
