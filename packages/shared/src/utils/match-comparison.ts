import type { Participant } from '../types/match';

export interface MatchComparisonMetric {
  key: string;
  group: string;
  label: string;
  description: string;
  unit: string;
  decimals: number;
  read: (player: Participant, duration: number) => number | null;
}

function stat(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function field(
  key: keyof Participant,
  group: string,
  label: string,
  description = label,
  unit = '',
): MatchComparisonMetric {
  return {
    key,
    group,
    label,
    description,
    unit,
    decimals: unit === '秒' ? 1 : 0,
    read: (player) => stat(player[key]),
  };
}

export const MATCH_COMPARISON_METRICS: MatchComparisonMetric[] = [
  field('totalDamageDealtToChampions', '对英雄造成伤害', '对英雄的总伤害'),
  field('physicalDamageDealtToChampions', '对英雄造成伤害', '对英雄的物理伤害'),
  field('magicDamageDealtToChampions', '对英雄造成伤害', '对英雄的魔法伤害'),
  field('trueDamageDealtToChampions', '对英雄造成伤害', '对英雄的真实伤害'),
  {
    key: 'damagePerMinute',
    group: '对英雄造成伤害',
    label: '分均对英雄伤害',
    description: '对英雄总伤害 ÷ 对局分钟数',
    unit: '/分钟',
    decimals: 0,
    read: (p, duration) => {
      const damage = stat(p.totalDamageDealtToChampions);
      return damage !== null && Number.isFinite(duration) && duration > 0
        ? (damage * 60) / duration
        : null;
    },
  },
  field(
    'totalDamageDealtAllTargets',
    '总造成伤害',
    '造成的总伤害',
    '对英雄、小兵、野怪等所有目标造成的总伤害',
  ),
  field('physicalDamageDealt', '总造成伤害', '造成的物理伤害'),
  field('magicDamageDealt', '总造成伤害', '造成的魔法伤害'),
  field('trueDamageDealt', '总造成伤害', '造成的真实伤害'),
  field('damageDealtToTurrets', '总造成伤害', '对防御塔的伤害'),
  field(
    'damageDealtToObjectives',
    '总造成伤害',
    '对战略目标的伤害',
    '接口统计的战略目标伤害，可能包括防御塔，不与塔伤相加',
  ),
  field('totalDamageTaken', '承受与减免伤害', '承受的总伤害'),
  field('physicalDamageTaken', '承受与减免伤害', '承受的物理伤害'),
  field('magicDamageTaken', '承受与减免伤害', '承受的魔法伤害'),
  field('trueDamageTaken', '承受与减免伤害', '承受的真实伤害'),
  field('damageSelfMitigated', '承受与减免伤害', '自我减免的伤害'),
  field('totalHeal', '治疗与护盾', '总治疗量', '接口的总治疗量，包含自身回复'),
  field('totalHealsOnTeammates', '治疗与护盾', '治疗队友', '为队友提供的治疗量'),
  field(
    'totalDamageShieldedOnTeammates',
    '治疗与护盾',
    '为队友提供的护盾',
    '接口统计的队友护盾吸收量',
  ),
  field('goldEarned', '经济与补刀', '获得金币', '整场获得的金币'),
  field('goldSpent', '经济与补刀', '花费金币'),
  {
    key: 'totalCS',
    group: '经济与补刀',
    label: '总补刀',
    description: '小兵击杀数 + 野怪击杀数',
    unit: '',
    decimals: 0,
    read: (p) => {
      const minions = stat(p.totalMinionsKilled),
        monsters = stat(p.neutralMinionsKilled);
      return minions !== null && monsters !== null ? minions + monsters : null;
    },
  },
  field('totalMinionsKilled', '经济与补刀', '小兵击杀数'),
  field('neutralMinionsKilled', '经济与补刀', '野怪击杀数'),
  field('visionScore', '视野与控制', '视野得分'),
  field('wardsPlaced', '视野与控制', '放置守卫数'),
  field('wardsKilled', '视野与控制', '摧毁守卫数'),
  field('visionWardsBoughtInGame', '视野与控制', '购买控制守卫数'),
  field('timeCCingOthers', '视野与控制', '控制英雄时长', '对敌方英雄施加控制的时长', '秒'),
  field('kills', '击杀与生存', '击杀数'),
  field('deaths', '击杀与生存', '死亡数'),
  field('assists', '击杀与生存', '助攻数'),
  field('totalTimeSpentDead', '击杀与生存', '阵亡总时长', '整场处于阵亡状态的总时长', '秒'),
];

/** Only offer statistics actually returned in this match; zero is valid data. */
export function availableMatchMetrics(participants: Participant[], duration: number) {
  return MATCH_COMPARISON_METRICS.filter((metric) =>
    participants.some((player) => stat(metric.read(player, duration)) !== null),
  );
}

/** Both teams use one axis. Missing values remain null and never become zero bars. */
export function buildMatchComparison(
  participants: Participant[],
  metric: MatchComparisonMetric,
  duration: number,
) {
  const rows = participants.map((participant) => ({
    participant,
    value: stat(metric.read(participant, duration)),
  }));
  const max = Math.max(0, ...rows.map((row) => row.value ?? 0));
  const target = max / 4 || 1;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const factor = [1, 2, 2.5, 5, 10].find((n) => n >= target / magnitude) ?? 10;
  const step = Math.max(metric.decimals ? 0.1 : 1, factor * magnitude);
  const count = Math.max(1, Math.ceil(max / step));
  const limit = step * count;
  return {
    limit,
    ticks: Array.from({ length: count + 1 }, (_, i) => ({
      value: i * step,
      percent: (i / count) * 100,
    })),
    available: rows.filter((row) => row.value !== null).length,
    teams: [...new Set(participants.map((p) => p.teamId))]
      .sort((a, b) => a - b)
      .map((teamId) => ({
        teamId,
        rows: rows
          .filter((row) => row.participant.teamId === teamId)
          .map((row) => ({
            ...row,
            percent: row.value === null ? 0 : (row.value / limit) * 100,
          })),
      })),
  };
}
