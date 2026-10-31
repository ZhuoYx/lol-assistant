import type { Participant } from '../types/match';
import { formatNumber } from './format';

export interface ParticipantHighlight {
  key: string;
  label: string;
  description: string;
}

const METRICS = [
  ['totalDamageDealtToChampions', '输出最高', '对英雄伤害', ''],
  ['totalDamageTaken', '承伤最高', '承受伤害', ''],
  ['goldEarned', '经济最高', '获得金币', ''],
  ['kills', '击杀最多', '击杀', '次'],
  ['assists', '助攻最多', '助攻', '次'],
  ['visionScore', '视野最高', '视野得分', ''],
  ['totalHeal', '总治疗最多', '总治疗（包含自身）', ''],
  ['totalHealsOnTeammates', '治疗队友最多', '治疗队友', ''],
  ['totalDamageShieldedOnTeammates', '护盾最多', '为队友提供护盾', ''],
  ['timeCCingOthers', '控制最长', '控制敌方英雄时长', '秒'],
  ['damageDealtToTurrets', '推塔伤害最高', '对防御塔伤害', ''],
  ['damageSelfMitigated', '减伤最多', '自我减免伤害', ''],
] as const;

/** Compare only complete, positive metrics; missing statistics never become awards. */
export function getMatchHighlights(
  participants: Participant[],
): Record<number, ParticipantHighlight[]> {
  const result: Record<number, ParticipantHighlight[]> = {};
  for (const player of participants) result[player.participantId] = [];
  if (participants.length < 2) return result;
  for (const [key, label, description, unit] of METRICS) {
    const values = participants.map((p) => p[key]);
    if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0))
      continue;
    const highest = Math.max(...(values as number[]));
    if (highest <= 0) continue;
    const winners = participants.filter((p) => p[key] === highest);
    if (winners.length === participants.length) continue;
    for (const player of winners) {
      result[player.participantId].push({
        key,
        label: `${winners.length > 1 ? '并列' : ''}${label}`,
        description: `全场${description}最高：${formatNumber(highest)}${unit}${winners.length > 1 ? `（${winners.length}人并列）` : ''}`,
      });
    }
  }
  for (const player of participants) {
    if (player.firstBloodKill)
      result[player.participantId].push({
        key: 'firstBlood',
        label: '一血',
        description: '获得本场首次击杀',
      });
    if ((player.largestMultiKill ?? 0) >= 3) {
      const label =
        player.largestMultiKill! >= 5 ? '五杀' : player.largestMultiKill === 4 ? '四杀' : '三杀';
      result[player.participantId].unshift({
        key: 'multiKill',
        label,
        description: `本场最高连续击杀：${label}`,
      });
    }
  }
  return result;
}
