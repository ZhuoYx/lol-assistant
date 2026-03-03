/**
 * 装备 ID 映射表（部分核心装备）
 * 完整数据应通过 Data Dragon 获取
 */
export const ITEM_ID_MAP: Record<number, string> = {
  // 鞋子
  3006: '狂战士胫甲',
  3009: '速度之靴',
  3020: '法师之靴',
  3047: '铠甲靴',
  3111: '水银之靴',
  3117: '灵巧之靴',
  3158: '明朗之靴',

  // 出门装
  1054: '多兰之盾',
  1055: '多兰之刃',
  1056: '多兰之戒',
  1082: '黑暗封印',
  2033: '腐蚀药水',
  3850: '圣物残骸',
  3858: '钢铁肩甲',
  3862: '幽魂之牙',
  3854: '嗜血法器',
};

/**
 * 通过装备 ID 获取装备名称
 */
export function getItemNameById(id: number): string {
  return ITEM_ID_MAP[id] ?? 'Unknown';
}
