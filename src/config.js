// Единственное место тюнинга: весь баланс, размеры и цвета — только здесь.

export const WORLD = { width: 960, height: 640 };

export const MAX_DT = 0.1;

// Горизонтальные полосы поля (координаты y из дизайн-дока, менять нельзя).
export const ZONES = {
  sea: { y1: 0, y2: 90 },
  promenade: { y1: 90, y2: 120 },
  topSidewalk: { y1: 120, y2: 200 },
  roadLaneUp: { y1: 200, y2: 280 },
  roadDivider: { y: 280 },
  roadLaneDown: { y1: 280, y2: 360 },
  bottomSidewalk: { y1: 360, y2: 440 },
  bottomDecor: { y1: 440, y2: 640 },
};

// Зебра по центру дороги.
export const ZEBRA = { x1: 430, x2: 530 };

// Прото-Купата: управляемый персонаж (центр нижнего тротуара).
export const DOG = { speed: 220, w: 48, h: 32, minY: 120, maxY: 440 };

// Демо-машина: едет по нижней полосе (y=320 — центр полосы 280–360).
export const DEMO_CAR = { speed: 160, w: 64, h: 36, y: 320 };

// Палитра «тёплый Батуми».
export const COLORS = {
  sea: '#3bb8ae',
  promenade: '#e9d8a6',
  sidewalk: '#d8d3c8',
  asphalt: '#43454b',
  markings: '#f4f4f2',
  bottomDecor: '#a3c585',
  dog: '#e8842c',
  demoCar: '#c94f3d',
};
