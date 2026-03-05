import { FurnitureType, WallpaperTheme, FloorTheme, ShopItem } from './types';

export const WALLPAPER_THEMES: WallpaperTheme[] = [
  { id: 'default',     name: 'Classic Cream',     wallColor: '#FFF8E1', trimColor: '#D7CCC8', price: 0 },
  { id: 'sage',        name: 'Sage Garden',       wallColor: '#E8F5E9', trimColor: '#A5D6A7', price: 150 },
  { id: 'lavender',    name: 'Lavender Dream',    wallColor: '#F3E5F5', trimColor: '#CE93D8', price: 150 },
  { id: 'ocean',       name: 'Ocean Breeze',      wallColor: '#E3F2FD', trimColor: '#90CAF9', price: 150 },
  { id: 'sunset',      name: 'Sunset Peach',      wallColor: '#FFF3E0', trimColor: '#FFAB91', price: 200 },
  { id: 'midnight',    name: 'Midnight Study',    wallColor: '#37474F', trimColor: '#546E7A', price: 300 },
  { id: 'rose',        name: 'Rose Cottage',      wallColor: '#FCE4EC', trimColor: '#F48FB1', price: 200 },
  { id: 'forest',      name: 'Forest Cabin',      wallColor: '#E8F5E9', trimColor: '#795548', price: 250 },
];

export const FLOOR_THEMES: FloorTheme[] = [
  { id: 'default',     name: 'Warm Oak',          floorColor: '#DEB887', plankColor: '#C8A96E', price: 0 },
  { id: 'dark_walnut', name: 'Dark Walnut',       floorColor: '#795548', plankColor: '#5D4037', price: 150 },
  { id: 'birch',       name: 'Light Birch',       floorColor: '#EFEBE9', plankColor: '#D7CCC8', price: 150 },
  { id: 'cherry',      name: 'Cherry Wood',       floorColor: '#A1887F', plankColor: '#8D6E63', price: 200 },
  { id: 'marble',      name: 'White Marble',      floorColor: '#F5F5F5', plankColor: '#E0E0E0', price: 300 },
  { id: 'slate',       name: 'Slate Tile',        floorColor: '#78909C', plankColor: '#607D8B', price: 250 },
  { id: 'bamboo',      name: 'Bamboo',            floorColor: '#E6D690', plankColor: '#D4C36A', price: 200 },
];

export const FURNITURE_PRICES: Partial<Record<FurnitureType, number>> = {
  [FurnitureType.STUDENT_DESK]: 50,
  [FurnitureType.BOOKSHELF]: 75,
  [FurnitureType.POTTED_PLANT]: 30,
  [FurnitureType.AREA_RUG]: 100,
  [FurnitureType.WALL_CLOCK]: 40,
  [FurnitureType.PODIUM]: 120,
  [FurnitureType.TEACHER_DESK]: 100,
};

export function getShopItems(): ShopItem[] {
  const items: ShopItem[] = [];

  for (const [ft, price] of Object.entries(FURNITURE_PRICES)) {
    items.push({
      type: 'furniture',
      furnitureType: ft as FurnitureType,
      name: ft.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      price,
      description: 'Place in your classroom',
    });
  }

  for (const wp of WALLPAPER_THEMES) {
    if (wp.price === 0) continue;
    items.push({
      type: 'wallpaper',
      wallpaperId: wp.id,
      name: wp.name,
      price: wp.price,
      description: 'Wallpaper theme',
    });
  }

  for (const fl of FLOOR_THEMES) {
    if (fl.price === 0) continue;
    items.push({
      type: 'floor',
      floorId: fl.id,
      name: fl.name,
      price: fl.price,
      description: 'Floor theme',
    });
  }

  return items;
}
