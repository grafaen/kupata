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

// Зебра по центру дороги. paws — следы Купаты между полос (как на настоящем
// переходе в Батуми): светлые, по одному в каждом тёмном промежутке.
export const ZEBRA = {
  x1: 430,
  x2: 530,
  paws: {
    offsetX: 14, // шаги влево/вправо от центра зебры, попеременно, px
    padRx: 3.4, // подушечка-эллипс: полуоси, px
    padRy: 2.6,
    toeR: 1.2, // радиус пальца, px
    toeRise: 4.2, // насколько пальцы выше центра подушечки, px
    toeSpread: 3.4, // разлёт крайних пальцев по x, px
    alpha: 0.75,
  },
};

// Купата: управляемый персонаж. minY/maxY — границы разрешённой зоны (тротуары + дорога).
// «Наезд» невозможен: контакт с движущейся машиной лишь отбрасывает и оглушает
// («Ой!», лапки не тратятся); стоящая машина — твёрдая (внутрь не зайти).
export const DOG = {
  speed: 220,
  w: 48,
  h: 32,
  minY: 120,
  maxY: 440,
  stunDuration: 1.5, // сек оглушения после контакта с движущейся машиной
  knockback: 36, // на сколько отбрасывает от машины, px
  contactSpeed: 20, // машина быстрее — контакт считается «наездом», px/с
};

// Полосы дороги: y — центр полосы (из ZONES), dir — направление движения по x.
export const LANES = [
  { y: (ZONES.roadLaneUp.y1 + ZONES.roadLaneUp.y2) / 2, dir: -1 }, // 240, влево
  { y: (ZONES.roadLaneDown.y1 + ZONES.roadLaneDown.y2) / 2, dir: 1 }, // 320, вправо
];

// Машины: общая физика — здесь, всё видовое (размер, скорость, гавы) — в types
// (скорая — M5: строка типа + вес + спец-правила «лаять нельзя, −20 очков»).
export const CAR = {
  accel: 220, // разгон, px/с²
  decel: 380, // штатное торможение (дистанция/пробка), px/с²
  barkDecel: 900, // экстренное торможение после гава/испуга, px/с²
  followGap: 18, // зазор бампер-до-бампера в пробке, px
  dogGap: 30, // зазор до Купаты на полосе, px
  kidGap: 26, // зазор до ребёнка на полосе, px
  stopReleaseDelay: 1.0, // сек стоянки после конца перехода («стоит, пока идёт переход + 1 с»)
  scareStopDuration: 1.5, // сек стоянки испуганной машины (дети успевают разбежаться)
  honkDuration: 0.8, // сек показа «БИИП!» над машиной (испуг, срыв такси; звук — M4)
  spawnMargin: 12, // насколько за краем экрана появляется машина, px
  firstBarkSlow: 0.6, // «клевок» после недостаточного гава: доля крейсерской скорости
  barkHitDuration: 0.5, // сек мигания обводки после недостаточного гава
  impatienceRing: {
    // Кольцо-таймер нетерпения над стоящим такси (аналог кружка терпения детей).
    radius: 12,
    yOffset: 6, // зазор между верхом машины и низом кольца, px
    warnFrac: 0.3, // остаток доли таймера, с которого кольцо краснеет
    warnTime: 1.0, // за столько сек до срыва — пузырь «Би-би?»
  },
  pips: {
    // Пипсы гавов над машиной, которой нужно > 1 гава (маршрутка).
    radius: 5,
    gap: 14, // шаг между центрами пипсов, px
    yOffset: 10, // зазор между верхом машины и центрами пипсов, px
  },
  types: {
    // stopIdleDuration — сек стоянки после гава, если переход так и не начался;
    // impatience — суммарные сек в stopped без активного перехода до срыва с
    // «БИИП!» (у такси совпадает со stopIdleDuration: уезжает сигналя, не тихо).
    // colors и sprites — параллельные массивы: цвет остаётся фолбэком рендера.
    sedan: {
      w: 64,
      h: 36,
      speedMin: 130, // крейсерская скорость: случайная из диапазона, px/с
      speedMax: 180,
      barksToStop: 1,
      stopIdleDuration: 2.0,
      colors: ['#c94f3d', '#4a72c4', '#4f9d69', '#ece8e1', '#9a6fb8', '#b7bcc4'],
      sprites: ['carRed', 'carBlue', 'carGreen', 'carWhite', 'carPurple', 'carGray'],
    },
    taxi: {
      w: 64,
      h: 36,
      speedMin: 150,
      speedMax: 200,
      barksToStop: 1,
      stopIdleDuration: 4.0,
      impatience: 4.0,
      colors: ['#f4c430'],
      sprites: ['taxi'],
    },
    marshrutka: {
      w: 100,
      h: 40,
      speedMin: 90,
      speedMax: 120,
      barksToStop: 2,
      stopIdleDuration: 2.0,
      colors: ['#e8e4da'],
      sprites: ['marshrutka'],
    },
  },
  // Веса спавна по волнам: строка i — волна i+1, дальше последней — последняя.
  spawnWeights: [
    { sedan: 1.0, taxi: 0, marshrutka: 0 },
    { sedan: 0.75, taxi: 0.25, marshrutka: 0 },
    { sedan: 0.6, taxi: 0.25, marshrutka: 0.15 },
    { sedan: 0.5, taxi: 0.3, marshrutka: 0.2 },
    { sedan: 0.4, taxi: 0.35, marshrutka: 0.25 },
  ],
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
  khachapuri: 5, // за съеденный хачапури (без комбо-множителя)
};

// Энергия лая (game-design §3.1): тратится гавом, восстанавливается сама и хачапури.
// Энергия — жизнь: на нуле — game over («Купата выдохся…»), реген скупой,
// хачапури — «аптечка».
export const ENERGY = {
  max: 100,
  start: 100,
  barkCost: 8,
  regenPerSec: 2,
  khachapuri: 50, // сколько энергии даёт один хачапури
  weakThreshold: 15, // ниже — слабый лай (радиус BARK.weakRadius, лай не блокируется)
};

// Перекорм (game-design §3.4, отсылка к реальной истории Купаты).
export const OVERFEED = {
  count: 3, // столько хачапури…
  window: 30, // …за столько сек → «Купата объелся!»
  duration: 5, // сек: вдвое медленнее и не может лаять
  speedFactor: 0.5,
  toastDuration: 2.0, // сек жизни тоста «Купата объелся!»
};

// Житель с хачапури (game-design §3.4): Нино и Гоги чередуются.
export const NPC = {
  w: 26,
  h: 34,
  spawnDelayMin: 12, // пауза между жителями, сек (тикает, пока экран пуст)
  spawnDelayMax: 20,
  ignoreDuration: 8, // сек зова, потом пожимает плечами и уходит
  shrugDuration: 1.2, // сек показа «🤷» перед исчезновением
  eatGap: 6, // «вплотную»: зазор краёв прямоугольников Купаты и жителя, px
  zebraGap: 60, // отступ точки появления от зебры (не мешать ждущим детям), px
  edgeMargin: 40, // отступ от краёв экрана, px
  heartDuration: 0.9, // сек жизни сердечка
  heartRise: 28, // на сколько сердечко всплывает за жизнь, px
  colors: { nino: '#b56576', gogi: '#7a5c3e' }, // заглушки до SVG M4
};

// Волны сложности (game-design §4): рост после каждых 3 успешных переходов.
export const WAVES = {
  crossingsPerWave: 3,
  carSpawnStart: 3.2, // базовый интервал спавна машин на волне 1, сек
  carSpawnStep: 0.2, // на сколько сжимается интервал за волну
  carSpawnMin: 1.2,
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
  energy: {
    width: 150, // полоса энергии справа, px
    height: 14,
    rightOffset: 64, // отступ от правого края: не перекрываться с кнопкой звука
    color: '#ffd166',
    lowColor: '#e63946', // энергия < ENERGY.weakThreshold — слабый лай
    bg: 'rgba(255, 255, 255, 0.3)',
    pulseHz: 2.5, // пульс заливки на низкой энергии (энергия = жизнь)
  },
};

export const STORAGE = { best: 'kupata.best', muted: 'kupata.muted' };

// Манифест спрайтов (impl-plan 3.1): замена любого файла на PNG — одна строка.
// Не загрузившийся спрайт не ломает игру: render рисует цветной прямоугольник.
export const SPRITES = {
  kupata: 'assets/sprites/kupata.svg',
  kupataRun2: 'assets/sprites/kupata-run2.svg',
  kupataBark: 'assets/sprites/kupata-bark.svg',
  kupataStuffed: 'assets/sprites/kupata-stuffed.svg',
  carRed: 'assets/sprites/car-red.svg',
  carBlue: 'assets/sprites/car-blue.svg',
  carGreen: 'assets/sprites/car-green.svg',
  carWhite: 'assets/sprites/car-white.svg',
  carPurple: 'assets/sprites/car-purple.svg',
  carGray: 'assets/sprites/car-gray.svg',
  taxi: 'assets/sprites/taxi.svg',
  marshrutka: 'assets/sprites/marshrutka.svg',
  kid1: 'assets/sprites/kid-1.svg',
  kid2: 'assets/sprites/kid-2.svg',
  kid3: 'assets/sprites/kid-3.svg',
  kid4: 'assets/sprites/kid-4.svg',
  granny: 'assets/sprites/granny.svg',
  baker: 'assets/sprites/baker.svg',
  khachapuri: 'assets/sprites/khachapuri.svg',
  bgTop: 'assets/sprites/bg-top.svg',
  bgBottom: 'assets/sprites/bg-bottom.svg',
};

// Пузыри реплик («Гав!», «БИИП!», зов жителя…) — рисуются на canvas.
export const BUBBLE = {
  font: 'bold 15px system-ui, sans-serif',
  padX: 8,
  padY: 5,
  radius: 8,
  tail: 6, // высота хвостика, px
  bg: 'rgba(255, 255, 255, 0.95)',
  text: '#333333',
  barkShowFor: 0.35, // сек показа «Гав!» после гава (= окно позы лая)
};

// Лай Купаты. Действует только на приближающиеся машины: поравнявшаяся или
// проехавшая не реагирует («водитель видит собаку впереди»).
export const BARK = {
  radius: 105, // px от центра собаки до ближайшей точки машины
  weakRadius: 55, // радиус слабого лая (энергия < ENERGY.weakThreshold), px
  frontMargin: 10, // машина ещё реагирует, пока её нос не дальше этого за Купатой, px
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
  dog: '#f2efe9', // настоящий Купата белый (фолбэк-прямоугольник без спрайта)
};
