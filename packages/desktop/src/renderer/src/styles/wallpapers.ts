import anime from '@/assets/backgrounds/jinx-lux-anime.webp';
import ink from '@/assets/backgrounds/yasuo-yone-ink.webp';
import fantasy from '@/assets/backgrounds/teemo-lulu-fantasy.webp';

export const wallpapers = [
  { id: 'anime', label: '星光同行', description: '金克丝 · 拉克丝 / 二次元动漫', image: anime },
  { id: 'ink', label: '风过山河', description: '亚索 · 永恩 / 国风水墨', image: ink },
  { id: 'fantasy', label: '班德尔之梦', description: '提莫 · 露露 / 奇幻插画', image: fantasy },
  { id: 'none', label: '纯净渐层', description: '简洁背景，专注数据', image: '' },
] as const;
export type WallpaperId = typeof wallpapers[number]['id'];
