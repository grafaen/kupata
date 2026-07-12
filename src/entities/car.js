import { WORLD, LANES, CAR } from '../config.js';

// Машина: x/y — центр прямоугольника (см. соглашение в config.js), y — центр
// полосы и не меняется. Состояния:
// - 'driving' — вся обычная динамика: разгон, торможение за препятствием,
//   стояние в пробке (speed = 0 из-за препятствия впереди);
// - 'stopped' — остановлена лаем, стоит stopTimer секунд, затем сама уезжает.

export function createCar(laneIndex) {
  const lane = LANES[laneIndex];
  const cruiseSpeed = CAR.speedMin + Math.random() * (CAR.speedMax - CAR.speedMin);

  return {
    x: spawnXFor(laneIndex),
    y: lane.y,
    w: CAR.w,
    h: CAR.h,
    lane: laneIndex,
    dir: lane.dir,
    color: CAR.bodyColors[Math.floor(Math.random() * CAR.bodyColors.length)],
    cruiseSpeed,
    speed: cruiseSpeed,
    state: 'driving',
    stopTimer: 0,
  };
}

// Обновление всех машин: в каждой полосе лидер каждой машины — предыдущая
// по ходу движения. Пробки и «один гав по головной держит колонну»
// получаются из правила дистанции сами.
export function updateCars(cars, dog, dt) {
  for (let laneIndex = 0; laneIndex < LANES.length; laneIndex++) {
    const { dir } = LANES[laneIndex];
    const laneCars = cars.filter((car) => car.lane === laneIndex);
    laneCars.sort((a, b) => (b.x - a.x) * dir); // первая — самая передняя

    for (let i = 0; i < laneCars.length; i++) {
      updateCar(laneCars[i], laneCars[i - 1] ?? null, dog, dt);
    }
  }
}

function updateCar(car, leader, dog, dt) {
  const stopX = stopPointFor(car, leader, dog);
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
  // Если препятствие возникло уже ближе стоп-точки (Купата шагнула вплотную) —
  // просто резко встаём на месте, назад не телепортируемся.
  if (stopX !== null && (car.x - stopX) * car.dir > 0) {
    car.x = (prevX - stopX) * car.dir > 0 ? prevX : stopX;
    car.speed = 0;
  }

  if (car.state === 'stopped') {
    car.stopTimer -= dt;
    if (car.stopTimer <= 0) car.state = 'driving';
  }
}

// Стоп-точка (x центра машины): ближайшее из «за лидером» и «за Купатой на полосе».
// null — препятствий впереди нет.
function stopPointFor(car, leader, dog) {
  let stopX = null;

  if (leader !== null) {
    const leaderRear = leader.x - car.dir * (leader.w / 2);
    stopX = leaderRear - car.dir * (CAR.followGap + car.w / 2);
  }

  if (dogBlocksCar(car, dog)) {
    const dogNear = dog.x - car.dir * (dog.w / 2);
    const dogStopX = dogNear - car.dir * (CAR.dogGap + car.w / 2);
    if (stopX === null || (dogStopX - stopX) * car.dir < 0) stopX = dogStopX;
  }

  return stopX;
}

// Купата — препятствие, если пересекается с полосой машины и находится впереди.
function dogBlocksCar(car, dog) {
  const inLane = Math.abs(dog.y - car.y) < (dog.h + car.h) / 2;
  const ahead = (dog.x - car.x) * car.dir > 0;
  return inLane && ahead;
}

// Гав по машине: остановка; повторный гав по стоящей обновляет таймер
// (игрок может «держать» колонну).
export function tryStopByBark(car) {
  car.state = 'stopped';
  car.stopTimer = CAR.stopDuration;
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

// Машина целиком уехала за противоположный край экрана.
export function isCarGone(car) {
  return car.dir === 1 ? car.x - car.w / 2 > WORLD.width : car.x + car.w / 2 < 0;
}

// «Движется ли машина» — понадобится правилу перехода в M2.
export function isCarMoving(car) {
  return car.speed > 0.5;
}

// Можно ли спавнить в полосе: у точки спавна не должно быть машины ближе
// корпуса с зазором — при пробке очередь копится за экраном без наложений.
export function canSpawnInLane(cars, laneIndex) {
  const spawnX = spawnXFor(laneIndex);
  const { dir } = LANES[laneIndex];

  for (const car of cars) {
    if (car.lane !== laneIndex) continue;
    if ((car.x - spawnX) * dir < car.w + CAR.followGap) return false;
  }
  return true;
}

// Точка спавна: центр машины за краем экрана по ходу движения полосы.
function spawnXFor(laneIndex) {
  const offset = CAR.w / 2 + CAR.spawnMargin;
  return LANES[laneIndex].dir === 1 ? -offset : WORLD.width + offset;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
