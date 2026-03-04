/**
 * 静态资源 URL 生成工具
 *
 * Data Dragon: Riot 官方 CDN，提供英雄/装备/召唤师头像等图片资源
 * CommunityDragon: 社区维护的 CDN，提供更完整的元数据 JSON 和资源
 */

// ============================================================
// Data Dragon (ddragon) - Riot 官方 CDN
// ============================================================

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const DDRAGON_CDN = `${DDRAGON_BASE}/cdn`;

/**
 * 获取当前最新游戏版本列表
 * 返回 URL，实际请求由调用方处理
 */
export function getDDragonVersionsUrl(): string {
  return `${DDRAGON_BASE}/api/versions.json`;
}

/**
 * 获取英雄方形头像图标 URL
 * @param championKey 英雄英文 key，如 "Aatrox"
 * @param version 游戏版本号，如 "14.10.1"
 */
export function getChampionIconUrl(championKey: string, version: string): string {
  return `${DDRAGON_CDN}/${version}/img/champion/${championKey}.png`;
}

/**
 * 获取英雄被动技能图标 URL
 * @param passiveImage 被动技能图片文件名
 * @param version 游戏版本号
 */
export function getChampionPassiveUrl(passiveImage: string, version: string): string {
  return `${DDRAGON_CDN}/${version}/img/passive/${passiveImage}`;
}

/**
 * 获取英雄技能图标 URL
 * @param spellImage 技能图片文件名
 * @param version 游戏版本号
 */
export function getChampionSpellUrl(spellImage: string, version: string): string {
  return `${DDRAGON_CDN}/${version}/img/spell/${spellImage}`;
}

/**
 * 获取装备图标 URL
 * @param itemId 装备 ID
 * @param version 游戏版本号
 */
export function getItemIconUrl(itemId: number, version: string): string {
  return `${DDRAGON_CDN}/${version}/img/item/${itemId}.png`;
}

/**
 * 获取召唤师头像图标 URL
 * @param profileIconId 头像 ID
 * @param version 游戏版本号
 */
export function getProfileIconUrl(profileIconId: number, version: string): string {
  return `${DDRAGON_CDN}/${version}/img/profileicon/${profileIconId}.png`;
}

/**
 * 获取召唤师技能图标 URL
 * @param spellKey 召唤师技能图片名称，如 "SummonerFlash"
 * @param version 游戏版本号
 */
export function getSummonerSpellIconUrl(spellKey: string, version: string): string {
  return `${DDRAGON_CDN}/${version}/img/spell/${spellKey}.png`;
}

/**
 * 获取英雄完整数据 JSON URL（Data Dragon）
 * @param version 游戏版本号
 * @param locale 语言，默认 "zh_CN"
 */
export function getDDragonChampionsDataUrl(version: string, locale: string = 'zh_CN'): string {
  return `${DDRAGON_CDN}/${version}/data/${locale}/champion.json`;
}

/**
 * 获取单个英雄详细数据 JSON URL（Data Dragon）
 * @param championKey 英雄英文 key
 * @param version 游戏版本号
 * @param locale 语言
 */
export function getDDragonChampionDetailUrl(
  championKey: string,
  version: string,
  locale: string = 'zh_CN'
): string {
  return `${DDRAGON_CDN}/${version}/data/${locale}/champion/${championKey}.json`;
}

/**
 * 获取装备完整数据 JSON URL（Data Dragon）
 * @param version 游戏版本号
 * @param locale 语言
 */
export function getDDragonItemsDataUrl(version: string, locale: string = 'zh_CN'): string {
  return `${DDRAGON_CDN}/${version}/data/${locale}/item.json`;
}

/**
 * 获取召唤师技能数据 JSON URL（Data Dragon）
 * @param version 游戏版本号
 * @param locale 语言
 */
export function getDDragonSummonerSpellsUrl(version: string, locale: string = 'zh_CN'): string {
  return `${DDRAGON_CDN}/${version}/data/${locale}/summoner.json`;
}

/**
 * 获取符文数据 JSON URL（Data Dragon）
 * @param version 游戏版本号
 * @param locale 语言
 */
export function getDDragonRunesUrl(version: string, locale: string = 'zh_CN'): string {
  return `${DDRAGON_CDN}/${version}/data/${locale}/runesReforged.json`;
}

// ============================================================
// CommunityDragon (CDragon) - 社区维护 CDN
// ============================================================

const CDRAGON_BASE = 'https://raw.communitydragon.org';

/**
 * 获取 CommunityDragon 英雄列表 JSON URL
 * @param patch 版本号 "latest" 或 具体版本如 "14.10"
 */
export function getCDragonChampionsUrl(patch: string = 'latest'): string {
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/champion-summary.json`;
}

/**
 * 获取 CommunityDragon 单个英雄详细数据 URL
 * @param championId 英雄 ID
 * @param patch 版本号
 */
export function getCDragonChampionDetailUrl(
  championId: number,
  patch: string = 'latest'
): string {
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/champions/${championId}.json`;
}

/**
 * 获取 CommunityDragon 装备列表 JSON URL
 * @param patch 版本号
 */
export function getCDragonItemsUrl(patch: string = 'latest'): string {
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/items.json`;
}

/**
 * 获取 CommunityDragon 符文树 JSON URL
 * @param patch 版本号
 */
export function getCDragonRuneTreesUrl(patch: string = 'latest'): string {
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/perkstyles.json`;
}

/**
 * 获取 CommunityDragon 符文详情 JSON URL
 * @param patch 版本号
 */
export function getCDragonPerksUrl(patch: string = 'latest'): string {
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/perks.json`;
}

/**
 * 获取 CommunityDragon 召唤师技能列表 JSON URL
 * @param patch 版本号
 */
export function getCDragonSummonerSpellsUrl(patch: string = 'latest'): string {
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/summoner-spells.json`;
}

/**
 * 将 CommunityDragon 相对路径转换为完整 URL
 * CDragon JSON 数据中图片路径格式为 "/lol-game-data/assets/..."
 * @param assetPath CDragon 资源路径
 * @param patch 版本号
 */
export function resolveCDragonAssetUrl(assetPath: string, patch: string = 'latest'): string {
  // CDragon 路径格式: /lol-game-data/assets/v1/champion-icons/1.png
  // 需要转换为: https://raw.communitydragon.org/{patch}/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/1.png
  const normalizedPath = assetPath
    .replace('/lol-game-data/assets/', '')
    .toLowerCase();
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/default/${normalizedPath}`;
}

// ============================================================
// 段位图标 URL（使用 CommunityDragon）
// ============================================================

/** 段位名称映射到资源文件名 */
const TIER_ICON_MAP: Record<string, string> = {
  IRON: 'iron',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  EMERALD: 'emerald',
  DIAMOND: 'diamond',
  MASTER: 'master',
  GRANDMASTER: 'grandmaster',
  CHALLENGER: 'challenger',
};

/**
 * 获取段位图标 URL（CommunityDragon）
 * 使用 rcp-fe-lol-shared-components 路径，所有段位均有 PNG 格式
 * @param tier 段位名称，如 "GOLD"、"PLATINUM"
 * @param patch 版本号
 */
export function getTierIconUrl(tier: string, patch: string = 'latest'): string {
  const tierKey = TIER_ICON_MAP[tier.toUpperCase()];
  if (!tierKey) {
    return `${CDRAGON_BASE}/${patch}/plugins/rcp-fe-lol-shared-components/global/default/images/unranked.png`;
  }
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-fe-lol-shared-components/global/default/images/${tierKey}.png`;
}

/**
 * 获取未定级图标 URL
 * @param patch 版本号
 */
export function getUnrankedIconUrl(patch: string = 'latest'): string {
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-fe-lol-shared-components/global/default/images/unranked.png`;
}

// ============================================================
// 辅助工具
// ============================================================

/**
 * 从完整版本号提取主版本号
 * @param fullVersion 如 "14.10.1"
 * @returns 如 "14.10"
 */
export function extractMajorVersion(fullVersion: string): string {
  const parts = fullVersion.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : fullVersion;
}

/**
 * 生成资源缓存 key
 * @param assetType 资源类型
 * @param assetId 资源 ID（如英雄 key、装备 ID）
 */
export function getAssetCacheKey(assetType: string, assetId: string | number): string {
  return `${assetType}/${assetId}`;
}
