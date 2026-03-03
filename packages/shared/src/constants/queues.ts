/** 游戏队列类型 */
export interface QueueType {
  id: number;
  name: string;
  description: string;
}

/**
 * 队列类型映射
 */
export const QUEUE_TYPE_MAP: Record<number, QueueType> = {
  420: { id: 420, name: '单排/双排', description: '排位赛 单人/双人排位' },
  440: { id: 440, name: '灵活组排', description: '排位赛 灵活组排' },
  400: { id: 400, name: '匹配模式', description: '匹配模式 召唤师峡谷' },
  430: { id: 430, name: '匹配模式', description: '匹配模式（盲选）' },
  450: { id: 450, name: '极地大乱斗', description: '极地大乱斗' },
  900: { id: 900, name: 'URF', description: '无限火力' },
  1700: { id: 1700, name: '竞技场', description: '竞技场 2v2v2v2' },
};

/**
 * 通过队列 ID 获取队列名称
 */
export function getQueueNameById(id: number): string {
  return QUEUE_TYPE_MAP[id]?.name ?? '其他模式';
}
