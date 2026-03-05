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
// 符文/碎片图标 URL（使用 CommunityDragon）
// ============================================================

/** 符文 ID → CDragon 图标相对路径 */
const PERK_ICON_MAP: Record<number, string> = {
  // Stat Mods
  5001: 'v1/perk-images/statmods/statmodshealthplusicon.png',
  5002: 'v1/perk-images/statmods/statmodsarmoricon.png',
  5003: 'v1/perk-images/statmods/statmodsmagicresicon.png',
  5005: 'v1/perk-images/statmods/statmodsattackspeedicon.png',
  5007: 'v1/perk-images/statmods/statmodscdrscalingicon.png',
  5008: 'v1/perk-images/statmods/statmodsadaptiveforceicon.png',
  5010: 'v1/perk-images/statmods/statmodsmovementspeedicon.png',
  5011: 'v1/perk-images/statmods/statmodshealthscalingicon.png',
  5012: 'v1/perk-images/statmods/statmodsadaptiveforcescalingicon.png',
  5013: 'v1/perk-images/statmods/statmodstenacityicon.png',
  // Precision
  8005: 'v1/perk-images/styles/precision/presstheattack/presstheattack.png',
  8008: 'v1/perk-images/styles/precision/lethaltempo/lethaltempotemp.png',
  8009: 'v1/perk-images/styles/precision/presenceofmind/presenceofmind.png',
  8010: 'v1/perk-images/styles/precision/conqueror/conqueror.png',
  8014: 'v1/perk-images/styles/precision/coupdegrace/coupdegrace.png',
  8017: 'v1/perk-images/styles/precision/cutdown/cutdown.png',
  8021: 'v1/perk-images/styles/precision/fleetfootwork/fleetfootwork.png',
  9101: 'v1/perk-images/styles/precision/absorblife/absorblife.png',
  9103: 'v1/perk-images/styles/precision/legendbloodline/legendbloodline.png',
  9104: 'v1/perk-images/styles/precision/legendalacrity/legendalacrity.png',
  9105: 'v1/perk-images/styles/precision/legendhaste/legendhaste.png',
  9111: 'v1/perk-images/styles/precision/triumph.png',
  8299: 'v1/perk-images/styles/sorcery/laststand/laststand.png',
  // Domination
  8105: 'v1/perk-images/styles/domination/relentlesshunter/relentlesshunter.png',
  8106: 'v1/perk-images/styles/domination/ultimatehunter/ultimatehunter.png',
  8112: 'v1/perk-images/styles/domination/electrocute/electrocute.png',
  8120: 'v1/perk-images/styles/domination/ghostporo/ghostporo.png',
  8124: 'v1/perk-images/styles/domination/predator/predator.png',
  8126: 'v1/perk-images/styles/domination/cheapshot/cheapshot.png',
  8128: 'v1/perk-images/styles/domination/darkharvest/darkharvest.png',
  8134: 'v1/perk-images/styles/domination/ingenioushunter/ingenioushunter.png',
  8135: 'v1/perk-images/styles/domination/treasurehunter/treasurehunter.png',
  8136: 'v1/perk-images/styles/domination/zombieward/zombieward.png',
  8137: 'v1/perk-images/styles/domination/sixthsense/sixthsense.png',
  8138: 'v1/perk-images/styles/domination/eyeballcollection/eyeballcollection.png',
  8139: 'v1/perk-images/styles/domination/tasteofblood/greenterror_tasteofblood.png',
  8140: 'v1/perk-images/styles/domination/grislymementos/grislymementos.png',
  8141: 'v1/perk-images/styles/domination/deepward/deepward.png',
  8143: 'v1/perk-images/styles/domination/suddenimpact/suddenimpact.png',
  9923: 'v1/perk-images/styles/domination/hailofblades/hailofblades.png',
  // Sorcery
  8210: 'v1/perk-images/styles/sorcery/transcendence/transcendence.png',
  8214: 'v1/perk-images/styles/sorcery/summonaery/summonaery.png',
  8224: 'v1/perk-images/styles/sorcery/nullifyingorb/axiom_arcanist.png',
  8226: 'v1/perk-images/styles/sorcery/manaflowband/manaflowband.png',
  8229: 'v1/perk-images/styles/sorcery/arcanecomet/arcanecomet.png',
  8230: 'v1/perk-images/styles/sorcery/phaserush/phaserush.png',
  8232: 'v1/perk-images/styles/sorcery/waterwalking/waterwalking.png',
  8233: 'v1/perk-images/styles/sorcery/absolutefocus/absolutefocus.png',
  8234: 'v1/perk-images/styles/sorcery/celerity/celeritytemp.png',
  8236: 'v1/perk-images/styles/sorcery/gatheringstorm/gatheringstorm.png',
  8237: 'v1/perk-images/styles/sorcery/scorch/scorch.png',
  8242: 'v1/perk-images/styles/sorcery/unflinching/unflinching.png',
  8275: 'v1/perk-images/styles/sorcery/nimbuscloak/6361.png',
  // Inspiration
  8304: 'v1/perk-images/styles/inspiration/magicalfootwear/magicalfootwear.png',
  8306: 'v1/perk-images/styles/inspiration/hextechflashtraption/hextechflashtraption.png',
  8313: 'v1/perk-images/styles/inspiration/perfecttiming/alchemistcabinet.png',
  8316: 'v1/perk-images/styles/inspiration/jackofalltrades/jackofalltrades2.png',
  8321: 'v1/perk-images/styles/inspiration/cashback/cashback2.png',
  8339: 'v1/perk-images/styles/inspiration/celestialbody/celestialbody.png',
  8345: 'v1/perk-images/styles/inspiration/biscuitdelivery/biscuitdelivery.png',
  8347: 'v1/perk-images/styles/inspiration/cosmicinsight/cosmicinsight.png',
  8351: 'v1/perk-images/styles/inspiration/glacialaugment/glacialaugment.png',
  8352: 'v1/perk-images/styles/inspiration/timewarptonic/timewarptonic.png',
  8360: 'v1/perk-images/styles/inspiration/unsealedspellbook/unsealedspellbook.png',
  8369: 'v1/perk-images/styles/inspiration/firststrike/firststrike.png',
  // Resolve
  8401: 'v1/perk-images/styles/resolve/mirrorshell/mirrorshell.png',
  8410: 'v1/perk-images/styles/resolve/approachvelocity/approachvelocity.png',
  8429: 'v1/perk-images/styles/resolve/conditioning/conditioning.png',
  8430: 'v1/perk-images/styles/resolve/ironskin/ironskin.png',
  8435: 'v1/perk-images/styles/resolve/mirrorshell/mirrorshell.png',
  8437: 'v1/perk-images/styles/resolve/graspoftheundying/graspoftheundying.png',
  8439: 'v1/perk-images/styles/resolve/veteranaftershock/veteranaftershock.png',
  8444: 'v1/perk-images/styles/resolve/secondwind/secondwind.png',
  8446: 'v1/perk-images/styles/resolve/demolish/demolish.png',
  8451: 'v1/perk-images/styles/resolve/overgrowth/overgrowth.png',
  8453: 'v1/perk-images/styles/resolve/revitalize/revitalize.png',
  8463: 'v1/perk-images/styles/resolve/fontoflife/fontoflife.png',
  8465: 'v1/perk-images/styles/resolve/guardian/guardian.png',
  8472: 'v1/perk-images/styles/resolve/chrysalis/chrysalis.png',
  8473: 'v1/perk-images/styles/resolve/boneplating/boneplating.png',
};

/**
 * 获取符文/碎片图标 URL（CommunityDragon）
 * @param perkId 符文或碎片 ID
 * @param patch 版本号
 */
export function getPerkIconUrl(perkId: number, patch: string = 'latest'): string {
  const path = PERK_ICON_MAP[perkId];
  if (!path) return '';
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/default/${path}`;
}

/** 符文树 ID → CDragon 图标路径 */
const RUNE_TREE_ICON_MAP: Record<number, string> = {
  8000: 'v1/perk-images/styles/7201_precision.png',
  8100: 'v1/perk-images/styles/7200_domination.png',
  8200: 'v1/perk-images/styles/7202_sorcery.png',
  8300: 'v1/perk-images/styles/7203_whimsy.png',
  8400: 'v1/perk-images/styles/7204_resolve.png',
};

/**
 * 获取符文树图标 URL（CommunityDragon）
 * @param treeId 符文树 ID (8000/8100/8200/8300/8400)
 * @param patch 版本号
 */
export function getRuneTreeIconUrl(treeId: number, patch: string = 'latest'): string {
  const path = RUNE_TREE_ICON_MAP[treeId];
  if (!path) return '';
  return `${CDRAGON_BASE}/${patch}/plugins/rcp-be-lol-game-data/global/default/${path}`;
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
