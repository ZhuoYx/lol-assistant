export type MayhemAugmentRarity = 'prismatic' | 'gold' | 'silver';

export interface MayhemAugmentRecommendation {
  slug: string;
  name: string;
  rarity: MayhemAugmentRarity;
  iconUrl?: string;
  sourceUrl: string;
  /** Percentage reported for this champion, never the global augment pick rate. */
  pickRate?: number;
  sourceTier?: string;
  sourceRank?: number;
  overallTier?: string;
  overallRank?: number;
}

export type MayhemEquipmentCategory = 'starting' | 'boots' | 'core' | 'situational';

export interface MayhemItemRecommendation {
  slug: string;
  name: string;
  iconUrl?: string;
  sourceUrl: string;
}

export interface MayhemEquipmentOption {
  items: MayhemItemRecommendation[];
  pickRate?: number;
  winRate?: number;
}

export interface MayhemEquipmentGroup {
  category: MayhemEquipmentCategory;
  options: MayhemEquipmentOption[];
}

export interface MayhemChampionRecommendations {
  championId: number;
  championName: string;
  source: 'ARAMMayhem';
  sourceUrl: string;
  patch?: string;
  statsDate?: string;
  fetchedAt: number;
  partial: boolean;
  stale: boolean;
  augments: MayhemAugmentRecommendation[];
  equipmentGroups: MayhemEquipmentGroup[];
}
