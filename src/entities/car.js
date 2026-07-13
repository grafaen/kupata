import { WORLD, LANES, CAR, BARK, ZEBRA, DANGER_ZONE } from '../config.js';

// Машина: x/y — центр прямоугольника (см. соглашение в config.js), y — центр
// полосы и не меняется. Состояния:
// - 'driving' — вся обычная динамика: разгон, торможение за препятствием,
//   стояние в пробке (speed = 0 из-за препятствия впереди);
// - 'stopped' — остановлена лаем или испугом: стоит, пока не истечёт stopTimer
//   (game.js прижимает таймер, пока идёт переход), затем сама уезжает.

export function createCar(laneIndex, type, speedFactor = 1) {
  const lane = LANES[laneIndex];
  const t = CAR.types[type];
  const cruiseSpeed =
    (t.speedMin + Math.random() * (t.speedMax - t.speedMin)) * speedFactor;
  const look = Math.floor(Math.random() * t.colors.length);

  return {
    x: spawnXFor(laneIndex, t.w),
    y: lane.y,
    w: t.w,
    h: t.h,
    lane: laneIndex,
    dir: lane.dir,
    type, // 'sedan' | 'taxi' | 'marshrutka' (ключ CAR.types)
    color: t.colors[look],
    sprite: t.sprites[look], // имя в манифесте SPRITES (цвет — фолбэк рендера)
    cruiseSpeed,
    speed: cruiseSpeed,
    state: 'driving',
    stopTimer: 0,
    honkTimer: 0, // > 0 — над машиной висит «БИИП!» (испуг, срыв такси)
    barksNeeded: t.barksToStop,
    barksGot: 0,
    impatienceTimer: 0, // суммарные сек в stopped без перехода (такси)
    barkHitTimer: 0, // > 0 — мигает обводка «гав засчитан, но мало» (маршрутка)
  };
}

// Тип спавнящейся машины: взвешенный ролл по строке волны в CAR.spawnWeights.
export function pickCarType(wave) {
  const rows = CAR.spawnWeights;
  const weights = rows[Math.min(wave, rows.length) - 1];

  let roll = Math.random() * Object.values(weights).reduce((sum, w) => sum + w, 0);
  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll < 0) return type;
  }
  return 'sedan';
}

// Обновление всех машин: в каждой полосе лидер каждой машины — предыдущая
// по ходу движения. Пробки и «один гав по головной держит колонну»
// получаются из правила дистанции сами.
// obstacles — [{ ent, gap }]: Купата и дети на дороге; у каждого свой зазор.
export function updateCars(cars, obstacles, dt) {
  for (let laneIndex = 0; laneIndex < LANES.length; laneIndex++) {
    const { dir } = LANES[laneIndex];
    const laneCars = cars.filter((car) => car.lane === laneIndex);
    laneCars.sort((a, b) => (b.x - a.x) * dir); // первая — самая передняя

    for (let i = 0; i < laneCars.length; i++) {
      updateCar(laneCars[i], laneCars[i - 1] ?? null, obstacles, dt);
    }
  }
}

function updateCar(car, leader, obstacles, dt) {
  car.honkTimer = Math.max(0, car.honkTimer - dt);
  car.barkHitTimer = Math.max(0, car.barkHitTimer - dt);

  const stopX = stopPointFor(car, leader, obstacles);
  const dist = stopX === null ? Infinity : Math.max((stopX - car.x) * car.dir, 0);

  // Равнозамедленное торможение: скорость, с которой ещё успеваем встать в стоп-точке.
  let targetSpeed = Math.min(car.cruiseSpeed, Math.sqrt(2 * CAR.decel * dist));
  if (car.state === 'stopped') targetSpeed = 0;

  if (car.speed > targetSpeed) {
    const decel = car.state === 'stopped' ? CAR.barkDecel : CAR.decel;
    car.speed = Math.max(targetSpeed, car.speed - decel * dt);
  } else {
    car.speed = Math.min(targetSpeed, car.speed + CAR.accel * dt);
  }

  const prevX = car.x;
  car.x += car.dir * car.speed * dt;

  // Страховка «никто никого не сбивает»: стоп-точку не пересекаем при любом dt.
  // Если препятствие возникло уже ближе стоп-точки (кто-то шагнул вплотную) —
  // просто резко встаём на месте, назад не телепортируемся.
  if (stopX !== null && (car.x - stopX) * car.dir > 0) {
    car.x = (prevX - stopX) * car.dir > 0 ? prevX : stopX;
    car.speed = 0;
  }

  if (car.state === 'stopped') {
    car.stopTimer -= dt;
    if (car.stopTimer <= 0) releaseCar(car);
  }
}

// Выход из stopped: гавы «сгорают» — снова остановить машину стоит полной цены.
function releaseCar(car) {
  car.state = 'driving';
  car.barksGot = 0;
  car.impatienceTimer = 0;
}

// Стоп-точка (x центра машины): ближайшее из «за лидером» и «за препятствием
// на полосе» (Купата, дети). null — препятствий впереди нет.
function stopPointFor(car, leader, obstacles) {
  let stopX = null;

  if (leader !== null) {
    const leaderRear = leader.x - car.dir * (leader.w / 2);
    stopX = leaderRear - car.dir * (CAR.followGap + car.w / 2);
  }

  for (const { ent, gap } of obstacles) {
    if (!obstacleBlocksCar(car, ent)) continue;
    const entNear = ent.x - car.dir * (ent.w / 2);
    const entStopX = entNear - car.dir * (gap + car.w / 2);
    if (stopX === null || (entStopX - stopX) * car.dir < 0) stopX = entStopX;
  }

  return stopX;
}

// Препятствие, если пересекается с полосой машины и находится впереди.
function obstacleBlocksCar(car, ent) {
  const inLane = Math.abs(ent.y - car.y) < (ent.h + car.h) / 2;
  const ahead = (ent.x - car.x) * car.dir > 0;
  return inLane && ahead;
}

// Гав по машине: остановка; повторный гав по стоящей обновляет таймер
// (игрок может «держать» колонну). Если переход так и не начнётся, машина
// уедет через свой stopIdleDuration. Маршрутке нужно barksToStop = 2: первый
// гав не останавливает — только «клевок» скоростью и мигание обводки.
export function tryStopByBark(car) {
  car.barksGot += 1;
  if (car.barksGot < car.barksNeeded) {
    car.speed = Math.min(car.speed, car.cruiseSpeed * CAR.firstBarkSlow);
    car.barkHitTimer = CAR.barkHitDuration;
    return;
  }
  car.state = 'stopped';
  car.stopTimer = CAR.types[car.type].stopIdleDuration;
}

// Нетерпеливое такси: суммарно простояв impatience сек в stopped, пока дети
// так и не пошли, сигналит и уезжает. Активный переход «смиряет» такси —
// таймер сбрасывается, машину держит holdStoppedCars (дети в безопасности
// всегда). Повторный гав обновляет stopTimer, но НЕ этот таймер — держать
// такси дольше impatience суммарно нельзя. Возвращает true, если в этом кадре
// кто-то просигналил (game.js лишит waiting-группы бонуса «чисто»).
// Вызывать строго ПОСЛЕ holdStoppedCars и ДО updateCars, с crossingActive,
// вычисленным после апдейта групп, — иначе такси сорвётся в кадр начала перехода.
export function updateImpatientTaxis(cars, dt, crossingActive) {
  let honked = false;

  for (const car of cars) {
    const { impatience } = CAR.types[car.type];
    if (!impatience) continue;

    if (car.state !== 'stopped' || crossingActive) {
      car.impatienceTimer = 0;
      continue;
    }

    car.impatienceTimer += dt;
    if (car.impatienceTimer >= impatience) {
      releaseCar(car);
      car.stopTimer = 0;
      car.honkTimer = CAR.honkDuration;
      honked = true;
    }
  }

  return honked;
}

// Испуг: экстренное торможение + «БИИП!». После разбегания детей перехода нет,
// таймер дотикает — машина уезжает сама.
export function scareBrake(car) {
  car.state = 'stopped';
  car.stopTimer = Math.max(car.stopTimer, CAR.scareStopDuration);
  car.honkTimer = CAR.honkDuration;
}

// Пока идёт переход, остановленные машины не отпускаем: таймер прижат снизу →
// машина уедет ровно через stopReleaseDelay после конца перехода.
// Вызывать строго ДО updateCars в кадре, иначе машина с истёкшим таймером
// «сбежит» ровно в кадр начала перехода.
export function holdStoppedCars(cars) {
  for (const car of cars) {
    if (car.state === 'stopped') {
      car.stopTimer = Math.max(car.stopTimer, CAR.stopReleaseDelay);
    }
  }
}

// ── Предикаты опасной зоны (правило перехода, impl-plan 3.4) ──

export function carIntersectsZone(car) {
  return car.x + car.w / 2 > DANGER_ZONE.x1 && car.x - car.w / 2 < DANGER_ZONE.x2;
}

// Задний край миновал дальний край зебры: машина физически не может задеть
// детей на переходе — не угроза и не повод для испуга.
export function hasPassedZebra(car) {
  const rear = car.x - car.dir * (car.w / 2);
  return car.dir === 1
    ? rear > ZEBRA.x2 + DANGER_ZONE.passMargin
    : rear < ZEBRA.x1 - DANGER_ZONE.passMargin;
}

// Сколько секунд машине ехать до входного края зоны:
// 0 — уже в зоне; Infinity — стоит или зона позади по ходу.
export function timeToDangerZone(car) {
  if (carIntersectsZone(car)) return 0;
  if (!isCarMoving(car)) return Infinity;

  const front = car.x + car.dir * (car.w / 2);
  const entryEdge = car.dir === 1 ? DANGER_ZONE.x1 : DANGER_ZONE.x2;
  const dist = (entryEdge - front) * car.dir;
  return dist < 0 ? Infinity : dist / car.speed;
}

// Угроза для canGo. Облаянная (stopped) гарантированно встанет — не угроза,
// даже если ещё юзом доезжает; пробочная (driving, speed 0) в зоне — тоже
// не угроза, поэтому «один гав по головной держит колонну» работает.
export function isCarThreat(car) {
  if (car.state === 'stopped') return false;
  if (hasPassedZebra(car)) return false;
  if (carIntersectsZone(car)) return isCarMoving(car);
  return timeToDangerZone(car) < DANGER_ZONE.lookahead;
}

// Испуг: по-настоящему движущаяся в зоне не остановленная машина.
// Скорая не пугает: остановить её нельзя — у игрока нет контрплея, лапку
// не отнимаем. Физически дети в безопасности и так: ребёнок на дороге —
// препятствие (obstaclesFor), скорая тормозит по стоп-точке, как все.
export function isCarScare(car) {
  if (CAR.types[car.type].emergency) return false;
  return car.state !== 'stopped' && isCarMoving(car)
    && carIntersectsZone(car) && !hasPassedZebra(car);
}

// Попадание машины в радиус лая: окружность против прямоугольника
// (ближайшая точка корпуса к центру собаки).
export function isCarInRadius(car, cx, cy, r) {
  const nearX = clamp(cx, car.x - car.w / 2, car.x + car.w / 2);
  const nearY = clamp(cy, car.y - car.h / 2, car.y + car.h / 2);
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy <= r * r;
}

// Машина реагирует на гав, только пока её нос не поравнялся с Купатой
// (небольшой запас frontMargin): поравнявшуюся или проехавшую лай не берёт.
export function isCarApproaching(car, x) {
  const front = car.x + car.dir * (car.w / 2);
  return (x - front) * car.dir > -BARK.frontMargin;
}

// Машина целиком уехала за противоположный край экрана.
export function isCarGone(car) {
  return car.dir === 1 ? car.x - car.w / 2 > WORLD.width : car.x + car.w / 2 < 0;
}

// «Движется ли машина» — общий порог для правила перехода и испуга.
export function isCarMoving(car) {
  return car.speed > 0.5;
}

// Можно ли спавнить машину шириной w в полосе: у точки спавна не должно быть
// машины ближе полукорпусов с зазором — при пробке очередь копится за экраном
// без наложений.
export function canSpawnInLane(cars, laneIndex, w) {
  const spawnX = spawnXFor(laneIndex, w);
  const { dir } = LANES[laneIndex];

  for (const car of cars) {
    if (car.lane !== laneIndex) continue;
    if ((car.x - spawnX) * dir < (car.w + w) / 2 + CAR.followGap) return false;
  }
  return true;
}

// Точка спавна: центр машины шириной w за краем экрана по ходу движения полосы.
function spawnXFor(laneIndex, w) {
  const offset = w / 2 + CAR.spawnMargin;
  return LANES[laneIndex].dir === 1 ? -offset : WORLD.width + offset;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
