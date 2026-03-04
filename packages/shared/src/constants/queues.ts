/** 游戏队列类型 */
export interface QueueType {
  id: number;
  name: string;
  description: string;
}

/**
 * 队列类型映射（来自 Riot 官方 queues.json）
 */
export const QUEUE_TYPE_MAP: Record<number, QueueType> = {
  0: { id: 0, name: '自定义', description: '自定义对局' },
  400: { id: 400, name: '匹配征召', description: '匹配模式 征召模式' },
  420: { id: 420, name: '单排/双排', description: '排位赛 单人/双人排位' },
  430: { id: 430, name: '匹配盲选', description: '匹配模式 盲选' },
  440: { id: 440, name: '灵活组排', description: '排位赛 灵活组排' },
  450: { id: 450, name: '极地大乱斗', description: '极地大乱斗' },
  480: { id: 480, name: '快速模式', description: '快速模式' },
  490: { id: 490, name: '快速对局', description: '匹配模式 快速对局' },
  700: { id: 700, name: '冠军杯赛', description: '召唤师峡谷冠军杯赛' },
  720: { id: 720, name: '大乱斗杯赛', description: '极地大乱斗冠军杯赛' },
  830: { id: 830, name: '人机入门', description: '人机对战 入门' },
  840: { id: 840, name: '人机新手', description: '人机对战 新手' },
  850: { id: 850, name: '人机一般', description: '人机对战 一般' },
  870: { id: 870, name: '人机入门', description: '人机对战 入门' },
  880: { id: 880, name: '人机新手', description: '人机对战 新手' },
  890: { id: 890, name: '人机一般', description: '人机对战 一般' },
  900: { id: 900, name: '无限火力', description: '无限火力' },
  920: { id: 920, name: '魄罗大乱斗', description: '魄罗大乱斗' },
  1020: { id: 1020, name: '克隆大作战', description: '克隆大作战' },
  1300: { id: 1300, name: '极限闪击', description: '极限闪击' },
  1400: { id: 1400, name: '终极魔典', description: '终极魔典' },
  1700: { id: 1700, name: '竞技场', description: '竞技场 2v2v2v2' },
  1710: { id: 1710, name: '竞技场', description: '竞技场 16人' },
  1900: { id: 1900, name: '无限火力', description: '无限火力 Pick URF' },
  2400: { id: 2400, name: '海克斯乱斗', description: '海克斯乱斗模式' },
};

/**
 * 通过队列 ID 获取队列名称
 */
export function getQueueNameById(id: number): string {
  return QUEUE_TYPE_MAP[id]?.name ?? '其他模式';
}
