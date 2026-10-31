import type { Participant } from '../types/match';

export const MATCH_RADAR_AXES = [
  { key: 'damage', label: '输出', description: '对英雄造成的伤害', unit: '' },
  { key: 'taken', label: '承伤', description: '承受的总伤害', unit: '' },
  { key: 'gold', label: '经济', description: '获得的总金币', unit: '' },
  {
    key: 'participation',
    label: '参团',
    description: '（击杀＋助攻）÷本队击杀；本队无击杀时记为 0',
    unit: '%',
  },
  { key: 'vision', label: '视野', description: '视野得分', unit: '' },
  { key: 'control', label: '控制', description: '控制敌方英雄的时长', unit: '秒' },
] as const;

export type MatchRadarValues = (number | null)[];

function stat(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** One scale per match, shared by both teams and every player overlay. */
export function buildMatchRadar(participants: Participant[]) {
  const teams = [...new Set(participants.map((p) => p.teamId))].map((teamId) => ({
    teamId,
    players: participants.filter((p) => p.teamId === teamId),
  }));
  const players: Record<number, MatchRadarValues> = {};
  for (const team of teams) {
    const kills = team.players.map((p) => stat(p.kills));
    const teamKills = kills.every((value) => value !== null)
      ? (kills as number[]).reduce((sum, value) => sum + value, 0)
      : null;
    for (const p of team.players) {
      const combatKnown = stat(p.kills) !== null && stat(p.assists) !== null;
      const participation =
        teamKills === null || !combatKnown
          ? null
          : teamKills === 0
            ? 0
            : Math.min(100, ((p.kills + p.assists) / teamKills) * 100);
      players[p.participantId] = [
        stat(p.totalDamageDealtToChampions),
        stat(p.totalDamageTaken),
        stat(p.goldEarned),
        participation,
        stat(p.visionScore),
        stat(p.timeCCingOthers),
      ];
    }
  }
  const limits = MATCH_RADAR_AXES.map((axis, index) =>
    axis.key === 'participation'
      ? 100
      : Math.max(0, ...Object.values(players).map((values) => values[index] ?? 0)),
  );
  return {
    players,
    limits,
    teams: teams.map((team) => {
      const coverage = MATCH_RADAR_AXES.map(
        (_, index) =>
          team.players.filter((player) => players[player.participantId][index] !== null).length,
      );
      const average = MATCH_RADAR_AXES.map((_, index) =>
        coverage[index] === team.players.length && team.players.length > 0
          ? team.players.reduce((sum, player) => sum + players[player.participantId][index]!, 0) /
            team.players.length
          : null,
      );
      return { ...team, coverage, average };
    }),
  };
}
