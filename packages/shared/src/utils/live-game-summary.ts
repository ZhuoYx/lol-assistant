import type { LiveGamePlayer } from '../types/live-game';
import { calculateKDA } from './calculate';

export const LIVE_GAME_SHARE_LABELS = {
  low: '下等马',
  average: '中等马',
  high: '上等马',
  carry: '小代',
  topCarry: '通天代',
} as const;

function rateRecentForm(games: number, winRate: number, kda: number) {
  const labels = LIVE_GAME_SHARE_LABELS;
  if (games < 5) return labels.average;
  if (games >= 8 && winRate >= 0.9 && kda >= 10) return labels.topCarry;
  if (winRate >= 0.8 && kda >= 7) return labels.carry;
  if (winRate >= 0.7 && kda >= 4.5) return labels.high;
  if (winRate <= 0.3 && kda < 2) return labels.low;
  return labels.average;
}

export function formatLiveGameSummary(
  player: Pick<LiveGamePlayer, 'summonerName' | 'tagLine' | 'recentMatches'>,
): string | null {
  const matches = player.recentMatches?.slice(0, 10) ?? [];
  const name = player.summonerName.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim();
  if (!matches.length || !name) return null;
  const tag = player.tagLine?.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim();

  let wins = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  for (const match of matches) {
    if (match.win) wins++;
    kills += match.kills;
    deaths += match.deaths;
    assists += match.assists;
  }

  const games = matches.length;
  // 评级时以场次数作为死亡数的下限，避免极少死亡把评级抬得过高。
  const ratingKda = (kills + assists) / Math.max(deaths, games);
  const label = rateRecentForm(games, wins / games, ratingKda);
  const kda =
    deaths === 0 && kills + assists > 0
      ? '完美（零死亡）'
      : calculateKDA(kills, deaths, assists).toFixed(2);
  const riotId = tag ? `${name}#${tag}` : name;
  return `【${label}】${riotId} · 近${games}场 ${wins}胜${games - wins}负 · KDA ${kda}`;
}
