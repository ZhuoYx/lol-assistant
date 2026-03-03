/**
 * 内置静态英雄克制关系表（兜底数据）
 * 当第三方数据源不可用时使用
 *
 * 格式: championId -> { counters: [被克制的英雄ID列表], counteredBy: [克制该英雄的英雄ID列表] }
 * 数据基于常见对线匹配的经验值
 */
export interface StaticCounterData {
  counters: number[];
  counteredBy: number[];
}

export const CHAMPION_COUNTERS: Record<number, StaticCounterData> = {
  // Aatrox
  266: {
    counters: [92, 58, 39], // Riven, Renekton, Irelia
    counteredBy: [114, 24, 85], // Fiora, Jax, Kennen
  },
  // Ahri
  103: {
    counters: [99, 134, 45], // Lux, Syndra, Veigar
    counteredBy: [38, 55, 238], // Kassadin, Katarina, Zed
  },
  // Darius
  122: {
    counters: [86, 54, 58], // Garen, Malphite, Renekton
    counteredBy: [17, 85, 150], // Teemo, Kennen, Gnar
  },
  // Garen
  86: {
    counters: [54, 14, 36], // Malphite, Sion, DrMundo
    counteredBy: [122, 67, 17], // Darius, Vayne, Teemo
  },
  // Jinx
  222: {
    counters: [22, 15, 21], // Ashe, Sivir, MissFortune
    counteredBy: [119, 236, 29], // Draven, Lucian, Twitch
  },
  // Lee Sin
  64: {
    counters: [32, 154, 120], // Amumu, Zac, Hecarim
    counteredBy: [107, 121, 141], // Rengar, Khazix, Kayn
  },
  // Yasuo
  157: {
    counters: [99, 101, 115], // Lux, Xerath, Ziggs
    counteredBy: [80, 58, 92], // Pantheon, Renekton, Riven
  },
  // Zed
  238: {
    counters: [99, 101, 45], // Lux, Xerath, Veigar
    counteredBy: [54, 127, 8], // Malphite, Lissandra, Vladimir
  },
};
