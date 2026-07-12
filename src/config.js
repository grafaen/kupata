// Единственное место тюнинга: весь баланс, размеры и цвета — только здесь.
//
// Соглашение о границах сущностей:
// - x/y сущности — центр её прямоугольника, w/h — размеры;
// - клампы по зонам — через полуразмеры (сущность целиком внутри зоны);
// - взаимные дистанции (пробки, радиус лая) — по краям прямоугольников.

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

// Купата: управляемый персонаж. minY/maxY — границы разрешённой зоны (тротуары + дорога).
export const DOG = { speed: 220, w: 48, h: 32, minY: 120, maxY: 440 };

// Полосы дороги: y — центр полосы (из ZONES), dir — направление движения по x.
export const LANES = [
  { y: (ZONES.roadLaneUp.y1 + ZONES.roadLaneUp.y2) / 2, dir: -1 }, // 240, влево
  { y: (ZONES.roadLaneDown.y1 + ZONES.roadLaneDown.y2) / 2, dir: 1 }, // 320, вправо
];

// Легковушка (единственный тип в M1; такси/маршрутка/скорая — M3).
export const CAR = {
  w: 64,
  h: 36,
  speedMin: 130, // крейсерская скорость: случайная из диапазона, px/с
  speedMax: 180,
  accel: 220, // разгон, px/с²
  decel: 380, // штатное торможение (дистанция/пробка), px/с²
  barkDecel: 900, // экстренное торможение после гава, px/с²
  followGap: 18, // зазор бампер-до-бампера в пробке, px
  dogGap: 30, // зазор до Купаты на полосе, px
  // ВРЕМЕННО (M1): фиксированная пауза остановленной лаем машины.
  // В M2 заменить на правило «стоит, пока идёт переход + 1 с» (game-design 3.2).
  stopDuration: 4.0, // сек
  spawnIntervalMin: 2.0, // сек между спавнами на полосу (волны M2 будут сжимать)
  spawnIntervalMax: 3.0,
  spawnMargin: 12, // насколько за краем экрана появляется машина, px
  bodyColors: ['#c94f3d', '#4a72c4', '#4f9d69', '#ece8e1', '#9a6fb8', '#b7bcc4'],
};

// Лай Купаты (энергия лая — M3, здесь её нет).
export const BARK = {
  radius: 130, // px от центра собаки до ближайшей точки машины
  cooldown: 0.5, // сек
  ringDuration: 0.4, // сек жизни расходящегося кольца
  ringColor: '#ffd166',
  ringWidth: 3,
};

// Палитра «тёплый Батуми».
export const COLORS = {
  sea: '#3bb8ae',
  promenade: '#e9d8a6',
  sidewalk: '#d8d3c8',
  asphalt: '#43454b',
  markings: '#f4f4f2',
  bottomDecor: '#a3c585',
  dog: '#e8842c',
};
