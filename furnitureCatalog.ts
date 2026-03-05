import { FurnitureType, PlacedFurniture } from './types';

export const ROOM_WIDTH = 14;
export const ROOM_DEPTH = 10;
export const HALF_W = ROOM_WIDTH / 2;
export const HALF_D = ROOM_DEPTH / 2;
export const WALL_HEIGHT = 3.5;

export interface FurnitureCatalogEntry {
  name: string;
  size: [number, number];
  interactionType?: string;
  interactionLabel?: string;
  wallMounted?: boolean;
  fixed?: boolean;
  passthrough?: boolean;
}

export const FURNITURE_CATALOG: Record<FurnitureType, FurnitureCatalogEntry> = {
  [FurnitureType.PODIUM]:       { name: 'Podium',       size: [1, 1], interactionType: 'podium', interactionLabel: 'Start Lesson' },
  [FurnitureType.TEACHER_DESK]: { name: 'Teacher Desk', size: [2, 1], interactionType: 'desk',   interactionLabel: 'Settings' },
  [FurnitureType.STUDENT_DESK]: { name: 'Student Desk', size: [1, 2] },
  [FurnitureType.BLACKBOARD]:   { name: 'Blackboard',   size: [5, 1], wallMounted: true },
  [FurnitureType.BOOKSHELF]:    { name: 'Bookshelf',    size: [2, 1] },
  [FurnitureType.POTTED_PLANT]: { name: 'Plant',        size: [1, 1] },
  [FurnitureType.AREA_RUG]:     { name: 'Rug',          size: [5, 3], passthrough: true },
  [FurnitureType.WALL_CLOCK]:   { name: 'Clock',        size: [1, 1], wallMounted: true },
  [FurnitureType.DOOR]:         { name: 'Door',         size: [1, 1], fixed: true, interactionType: 'door', interactionLabel: 'Exit' },
};

export function getEffectiveSize(size: [number, number], rotation: 0 | 1 | 2 | 3): [number, number] {
  return rotation % 2 === 0 ? size : [size[1], size[0]];
}

export function getWorldCenter(gridX: number, gridZ: number, size: [number, number], rotation: 0 | 1 | 2 | 3): [number, number] {
  const [w, d] = getEffectiveSize(size, rotation);
  return [
    gridX - HALF_W + w / 2,
    gridZ - HALF_D + d / 2,
  ];
}

export function worldToGrid(worldX: number, worldZ: number): [number, number] {
  return [
    Math.floor(worldX + HALF_W),
    Math.floor(worldZ + HALF_D),
  ];
}

export function getOccupiedCells(gridX: number, gridZ: number, size: [number, number], rotation: 0 | 1 | 2 | 3): [number, number][] {
  const [w, d] = getEffectiveSize(size, rotation);
  const cells: [number, number][] = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      cells.push([gridX + dx, gridZ + dz]);
    }
  }
  return cells;
}

export function isInBounds(gridX: number, gridZ: number, size: [number, number], rotation: 0 | 1 | 2 | 3): boolean {
  const [w, d] = getEffectiveSize(size, rotation);
  return gridX >= 0 && gridZ >= 0 && gridX + w <= ROOM_WIDTH && gridZ + d <= ROOM_DEPTH;
}

export function canPlace(
  gridX: number, gridZ: number,
  size: [number, number], rotation: 0 | 1 | 2 | 3,
  placedFurniture: PlacedFurniture[],
  ignoreId?: string
): boolean {
  if (!isInBounds(gridX, gridZ, size, rotation)) return false;

  const newCells = getOccupiedCells(gridX, gridZ, size, rotation);

  for (const item of placedFurniture) {
    if (item.id === ignoreId) continue;
    const catalog = FURNITURE_CATALOG[item.type];
    if (catalog.passthrough) continue;

    const existingCells = getOccupiedCells(item.gridX, item.gridZ, catalog.size, item.rotation);
    for (const [nx, nz] of newCells) {
      for (const [ex, ez] of existingCells) {
        if (nx === ex && nz === ez) return false;
      }
    }
  }

  return true;
}

export function findFurnitureAtCell(gx: number, gz: number, placed: PlacedFurniture[]): PlacedFurniture | null {
  for (const item of placed) {
    const catalog = FURNITURE_CATALOG[item.type];
    const cells = getOccupiedCells(item.gridX, item.gridZ, catalog.size, item.rotation);
    for (const [cx, cz] of cells) {
      if (cx === gx && cz === gz) return item;
    }
  }
  return null;
}

export const DEFAULT_FURNITURE: PlacedFurniture[] = [
  { id: 'def-podium',    type: FurnitureType.PODIUM,       gridX: 5,  gridZ: 1, rotation: 0 },
  { id: 'def-tdesk',     type: FurnitureType.TEACHER_DESK, gridX: 9,  gridZ: 1, rotation: 0 },
  { id: 'def-board',     type: FurnitureType.BLACKBOARD,   gridX: 4,  gridZ: 0, rotation: 0 },
  { id: 'def-sdesk1',    type: FurnitureType.STUDENT_DESK, gridX: 3,  gridZ: 2, rotation: 0 },
  { id: 'def-sdesk2',    type: FurnitureType.STUDENT_DESK, gridX: 6,  gridZ: 2, rotation: 0 },
  { id: 'def-sdesk3',    type: FurnitureType.STUDENT_DESK, gridX: 9,  gridZ: 2, rotation: 0 },
  { id: 'def-sdesk4',    type: FurnitureType.STUDENT_DESK, gridX: 2,  gridZ: 5, rotation: 0 },
  { id: 'def-sdesk5',    type: FurnitureType.STUDENT_DESK, gridX: 8,  gridZ: 5, rotation: 0 },
  { id: 'def-door',      type: FurnitureType.DOOR,         gridX: 11, gridZ: 9, rotation: 0 },
  { id: 'def-shelf',     type: FurnitureType.BOOKSHELF,    gridX: 0,  gridZ: 0, rotation: 0 },
  { id: 'def-plant1',    type: FurnitureType.POTTED_PLANT, gridX: 1,  gridZ: 8, rotation: 0 },
  { id: 'def-plant2',    type: FurnitureType.POTTED_PLANT, gridX: 12, gridZ: 0, rotation: 0 },
  { id: 'def-clock',     type: FurnitureType.WALL_CLOCK,   gridX: 9,  gridZ: 0, rotation: 0 },
  { id: 'def-rug',       type: FurnitureType.AREA_RUG,     gridX: 4,  gridZ: 4, rotation: 0 },
];
