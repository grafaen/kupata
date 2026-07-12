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

// Легковушка (единственный тип в M2; такси/маршрутка/скорая — M3).
export const CAR = {
  w: 64,
  h: 36,
  speedMin: 130, // крейсерская скорость: случайная из диапазона, px/с
  speedMax: 180,
  accel: 220, // разгон, px/с²
  decel: 380, // штатное торможение (дистанция/пробка), px/с²
  barkDecel: 900, // экстренное торможение после гава/испуга, px/с²
  followGap: 18, // зазор бампер-до-бампера в пробке, px
  dogGap: 30, // зазор до Купаты на полосе, px
  kidGap: 26, // зазор до ребёнка на полосе, px
  stopIdleDuration: 2.0, // сек стоянки после гава, если переход так и не начался
  stopReleaseDelay: 1.0, // сек стоянки после конца перехода («стоит, пока идёт переход + 1 с»)
  scareStopDuration: 1.5, // сек стоянки испуганной машины (дети успевают разбежаться)
  honkDuration: 0.8, // сек показа «БИИП!» над испуганной машиной (звук — M4)
  spawnMargin: 12, // насколько за краем экрана появляется машина, px
  bodyColors: ['#c94f3d', '#4a72c4', '#4f9d69', '#ece8e1', '#9a6fb8', '#b7bcc4'],
};

// Дети: группа ждёт у зебры, переходит гуськом, при испуге разбегается домой.
export const KIDS = {
  w: 18,
  h: 24,
  countMin: 2,
  countMax: 4,
  walkSpeed: 60, // переход, px/с
  scatterSpeed: 150, // разбегание при испуге, px/с
  fileDelay: 0.4, // стагер старта i-го ребёнка в гуське, сек
  braveFileDelay: 0.7, // стагер при brave-переходе («смелый идёт сам, остальные за ним»)
  startDelay: 0.25, // canGo должен продержаться столько, прежде чем группа пойдёт, сек
  xConvergeRate: 5, // скорость схождения x к центру зебры (экспон. lerp), 1/с
  waitOffset: 20, // отступ точки ожидания от края дороги вглубь тротуара, px
  spacing: 24, // шаг ряда ожидающих по x, px
  spawnDelayMin: 2.0, // пауза до появления следующей группы, сек
  spawnDelayMax: 4.0,
  doneLinger: 1.0, // сколько «дошедшая» группа машет на тротуаре до удаления, сек
  patienceRadius: 14, // радиус кружка терпения над группой, px
  colors: ['#e05780', '#5b8def', '#43aa8b', '#f9c74f'],
};

// Опасная зона перехода: участок дороги вокруг зебры (game-design §2, impl-plan 3.4).
// По y обе полосы всегда внутри — предикаты проверяют только x.
export const DANGER_ZONE = {
  x1: ZEBRA.x1 - 140,
  x2: ZEBRA.x2 + 140,
  lookahead: 1.5, // машина «доедет до зоны за < столько сек» — уже угроза
  passMargin: 12, // задний край за дальним краем зебры + столько — машина «проехала», px
};

// Очки (game-design §4).
export const SCORE = {
  perKid: 10,
  cleanGroupBonus: 20, // вся группа перешла без единого сигнала
  comboThreshold: 3, // столько успешных переходов подряд включают множитель
  comboMultiplier: 2,
};

// Волны сложности (game-design §4): рост после каждых 3 успешных переходов.
export const WAVES = {
  crossingsPerWave: 3,
  carSpawnStart: 2.5, // базовый интервал спавна машин на волне 1, сек
  carSpawnStep: 0.2, // на сколько сжимается интервал за волну
  carSpawnMin: 0.9,
  carSpawnJitter: 0.2, // случайный разброс интервала, ±доля
  speedPerWave: 0.05, // +5% скорости машин за волну…
  speedCap: 1.6, // …но не более +60%
  patienceStart: 20, // терпение детей, сек
  patienceStep: 1.0,
  patienceMin: 12,
  bothSidesFrom: 6, // с этой волны группы могут ждать на обоих тротуарах
  toastDuration: 2.5, // сек жизни тоста «Волна N»
};

export const GAME = { paws: 3 };

// HUD рисуется на canvas поверх зоны моря (верх поля).
export const HUD = {
  font: 'bold 22px system-ui, sans-serif',
  toastFont: 'bold 26px system-ui, sans-serif',
  color: '#ffffff',
  margin: 16,
  toastY: 60,
};

export const STORAGE = { best: 'kupata.best' };

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
