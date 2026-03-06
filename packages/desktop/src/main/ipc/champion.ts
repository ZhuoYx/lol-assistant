/**
 * 英雄统计 IPC 处理器
 *
 * 通过 PUUID 请求 LCU API 获取最近 30 条战绩，
 * 不走缓存、不请求 detail 接口，仅通过 transformMatchList 转换数据后按英雄聚合统计
 *
 * 注意：MATCH_HISTORY_BY_PUUID 接口不支持分页（begIndex/endIndex 被忽略），
 * 因此只取一次请求返回的最近 30 条数据
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { logger } from '../utils/logger';
import { getChampionDisplayName } from '@lol-assistant/shared';
import type { ChampionStats, MatchSummary } from '@lol-assistant/shared';
import { transformMatchList } from './match';

/**
 * 获取最近战绩，通过 PUUID 请求 LCU API，不走缓存、不调 detail 接口
 */
async function fetchRecentMatches(puuid: string): Promise<MatchSummary[]> {
  const raw = await lcuAPI.getMatchListByPUUID(puuid);
  const matchList = transformMatchList(raw);
  return matchList.matches;
}

export function registerChampionIpcHandlers(): void {
  ipcMain.handle('champion:getStats', async (_event, puuid: string) => {
    try {
      if (!puuid) throw new Error('PUUID 不能为空');

      const matches = await fetchRecentMatches(puuid);
      logger.info(`champion:getStats 共获取 ${matches.length} 场对局`);

      if (matches.length === 0) {
        return [];
      }

      // 按英雄 ID 聚合
      const statsMap = new Map<number, {
        championId: number;
        wins: number;
        losses: number;
        totalKills: number;
        totalDeaths: number;
        totalAssists: number;
        totalDuration: number;
        mvpCount: number;
        svpCount: number;
        lastPlayed: number;
        gamesPlayed: number;
      }>();

      for (const match of matches) {
        const { championId, win, kills, deaths, assists, gameDuration, gameCreation, isMVP, isSVP } = match;
        if (!championId) continue;

        let entry = statsMap.get(championId);
        if (!entry) {
          entry = {
            championId,
            wins: 0,
            losses: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            totalDuration: 0,
            mvpCount: 0,
            svpCount: 0,
            lastPlayed: 0,
            gamesPlayed: 0,
          };
          statsMap.set(championId, entry);
        }

        entry.gamesPlayed++;
        if (win) entry.wins++;
        else entry.losses++;
        entry.totalKills += kills;
        entry.totalDeaths += deaths;
        entry.totalAssists += assists;
        entry.totalDuration += gameDuration || 0;
        if (isMVP) entry.mvpCount++;
        if (isSVP) entry.svpCount++;
        if (gameCreation > entry.lastPlayed) entry.lastPlayed = gameCreation;
      }

      // 转换为 ChampionStats 数组
      const result: ChampionStats[] = [];
      for (const entry of statsMap.values()) {
        const { championId, wins, losses, totalKills, totalDeaths, totalAssists, gamesPlayed, mvpCount, svpCount, lastPlayed } = entry;
        const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 10000) / 10000 : 0;
        const avgKills = gamesPlayed > 0 ? Math.round((totalKills / gamesPlayed) * 100) / 100 : 0;
        const avgDeaths = gamesPlayed > 0 ? Math.round((totalDeaths / gamesPlayed) * 100) / 100 : 0;
        const avgAssists = gamesPlayed > 0 ? Math.round((totalAssists / gamesPlayed) * 100) / 100 : 0;
        const avgKDA = totalDeaths > 0
          ? Math.round(((totalKills + totalAssists) / totalDeaths) * 100) / 100
          : totalKills + totalAssists > 0 ? 999 : 0;

        result.push({
          championId,
          championName: getChampionDisplayName(championId),
          gamesPlayed,
          wins,
          losses,
          winRate,
          avgKills,
          avgDeaths,
          avgAssists,
          avgKDA,
          mvpCount,
          svpCount,
          lastPlayed,
        });
      }

      // 按场次降序排列
      result.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

      logger.info(`英雄统计: ${result.length} 个英雄, 共 ${matches.length} 场对局`);
      return result;
    } catch (err) {
      logger.error(`IPC champion:getStats 失败 (puuid=${puuid}):`, err);
      throw err;
    }
  });
}
