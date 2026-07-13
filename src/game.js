import {
  LANES, CAR, BARK, KIDS, WAVES, SCORE, GAME, ENERGY, OVERFEED, NPC, DOG,
  FLOATER,
} from './config.js';
import {
  createDog, updateDog, tryBark, barkRadius, clampDogPosition,
} from './entities/dog.js';
import {
  createCar, updateCars, tryStopByBark, isCarInRadius, isCarApproaching,
  isCarGone, canSpawnInLane,
  isCarThreat, isCarScare, scareBrake, holdStoppedCars, pickCarType,
  updateImpatientTaxis,
} from './entities/car.js';
import {
  createKidGroup, updateKidGroup, scareKidGroup, kidsOnRoad, isGroupExpired,
} from './entities/kids.js';
import { createNpc, updateNpc, isNpcGone, canEat } from './entities/npc.js';

export function createGame() {
  return {
    status: 'playing', // 'playing' | 'gameover'
    gameoverReason: null, // 'paws' | 'energy' — какой титул показать на экране
    dog: createDog(),
    cars: [],
    laneSpawnTimers: LANES.map(() => randomSpawnInterval(1)),
    barkRings: [], // эффекты лая: { x, y, age, radius }
    kidGroups: [],
    kidSpawnTimer: randomKidSpawnDelay(),
    npc: null, // житель с хачапури, на экране максимум один
    npcSpawnTimer: randomNpcDelay(), // тикает, только пока npc === null
    nextNpcKind: 'nino', // Нино и Гоги чередуются
    khachapuriTimes: [], // моменты съедения (state.time) для окна перекорма
    khachapuriEaten: 0,
    hearts: [], // эффекты 💖 над съеденным хачапури: { x, y, age }
    floaters: [], // всплывающие тексты («−20» за гав по скорой): { x, y, age, text }
    paws: GAME.paws,
    score: 0,
    wave: 1,
    successfulCrossings: 0,
    comboStreak: 0, // успешных переходов подряд; ≥ порога → множитель очков
    kidsCrossedTotal: 0,
    toast: null, // { kind: 'wave' | 'stuffed', wave?, age, duration }
    events: [], // звуковые события кадра: { type, … } — main.js передаёт в audio
    time: 0,
  };
}

export function update(state, input, dt) {
  if (state.status !== 'playing') return;
  state.time += dt;

  updateDog(state.dog, input, dt);
  handleBark(state, input);
  // Энергия — жизнь: проверять сразу после гава, в этом же кадре — реген
  // следующего кадра замаскирует точный ноль.
  if (state.dog.energy <= 0) {
    state.status = 'gameover';
    state.gameoverReason = 'energy';
  }

  for (const ring of state.barkRings) ring.age += dt;
  state.barkRings = state.barkRings.filter((ring) => ring.age < BARK.ringDuration);

  for (const heart of state.hearts) heart.age += dt;
  state.hearts = state.hearts.filter((heart) => heart.age < NPC.heartDuration);

  for (const floater of state.floaters) floater.age += dt;
  state.floaters = state.floaters.filter((f) => f.age < FLOATER.duration);

  if (state.toast !== null) {
    state.toast.age += dt;
    if (state.toast.age >= state.toast.duration) state.toast = null;
  }

  updateNpcLifecycle(state, dt);

  // Правило перехода: считаем по позициям машин на начало кадра.
  const canGo = state.cars.every((car) => !isCarThreat(car));

  spawnKidGroups(state, dt);
  for (const group of state.kidGroups) {
    const { completed } = updateKidGroup(group, dt, canGo);
    if (completed) scoreCrossing(state, group);
  }

  handleScare(state);

  spawnCars(state, dt);
  // Держать остановленных и срывать нетерпеливые такси строго ДО updateCars,
  // с crossingActive после апдейта групп: иначе машина с истёкшим таймером
  // «сбежит» (или такси сорвётся) ровно в кадр начала перехода.
  const crossingActive = state.kidGroups.some((group) => group.state === 'crossing');
  if (crossingActive) holdStoppedCars(state.cars);
  if (updateImpatientTaxis(state.cars, dt, crossingActive)) {
    // Сигнал слышала вся улица: ждущие группы теряют бонус «чисто».
    for (const group of state.kidGroups) {
      if (group.state === 'waiting') group.honked = true;
    }
    state.events.push({ type: 'honk' });
  }
  updateCars(state.cars, obstaclesFor(state), dt);
  handleDogCarContact(state);

  state.cars = state.cars.filter((car) => !isCarGone(car));
  state.kidGroups = state.kidGroups.filter((group) => !isGroupExpired(group));
}

// Гав: кольцо-эффект + гав машинам, чей корпус попал в радиус И которые ещё
// приближаются к Купате (поравнявшиеся/проехавшие не реагируют — в т.ч. нет
// «клевка» маршрутки и нельзя «освежить» стоянку поравнявшейся машины).
// Радиус — по энергии ДО списания (barkRadius раньше tryBark).
// Скорую гав не останавливает — только штраф очками (не чаще раза за гав,
// даже если скорых в радиусе две); остальные машины того же гава реагируют
// как обычно.
function handleBark(state, input) {
  if (!input.consumeBark()) return;

  const { dog } = state;
  const radius = barkRadius(dog);
  if (!tryBark(dog)) return;

  state.barkRings.push({ x: dog.x, y: dog.y, age: 0, radius });
  state.events.push({ type: 'bark', weak: radius < BARK.radius });

  let penalized = false;
  for (const car of state.cars) {
    if (!isCarApproaching(car, dog.x) || !isCarInRadius(car, dog.x, dog.y, radius)) {
      continue;
    }
    if (CAR.types[car.type].emergency) {
      if (!penalized) {
        penalized = true;
        state.score = Math.max(0, state.score - SCORE.ambulanceBark);
        state.floaters.push({
          x: car.x,
          y: car.y - car.h / 2 - 8,
          age: 0,
          text: `−${SCORE.ambulanceBark}`,
        });
        state.events.push({ type: 'penalty' });
      }
      continue;
    }
    tryStopByBark(car);
  }
}

// Контакт Купаты с машиной (после updateCars — по финальным позициям кадра).
// Движущаяся машина «наезжает»: экстренно тормозит с «БИИП!», Купату
// отбрасывает и оглушает («Ой!», лапки не тратятся — game-design §3.1);
// стоящая — просто твёрдая: внутрь не зайти.
function handleDogCarContact(state) {
  const { dog } = state;

  for (const car of state.cars) {
    const overlapX = (dog.w + car.w) / 2 - Math.abs(dog.x - car.x);
    const overlapY = (dog.h + car.h) / 2 - Math.abs(dog.y - car.y);
    if (overlapX <= 0 || overlapY <= 0) continue;

    // Выталкиваем по оси наименьшего проникновения.
    let pushX = 0;
    let pushY = 0;
    if (overlapX < overlapY) pushX = dog.x < car.x ? -overlapX : overlapX;
    else pushY = dog.y < car.y ? -overlapY : overlapY;

    const hit = car.speed > DOG.contactSpeed && dog.stunTimer <= 0;
    if (hit) {
      pushX += Math.sign(pushX) * DOG.knockback;
      pushY += Math.sign(pushY) * DOG.knockback;
      dog.stunTimer = DOG.stunDuration;
      scareBrake(car);
      state.events.push({ type: 'honk' });
    }

    dog.x += pushX;
    dog.y += pushY;
    clampDogPosition(dog);
  }
}

// Житель: на экране максимум один; таймер следующего тикает, пока экран пуст.
function updateNpcLifecycle(state, dt) {
  if (state.npc === null) {
    state.npcSpawnTimer -= dt;
    if (state.npcSpawnTimer > 0) return;

    state.npc = createNpc(state.nextNpcKind);
    state.nextNpcKind = state.nextNpcKind === 'nino' ? 'gogi' : 'nino';
    state.npcSpawnTimer = randomNpcDelay();
    return;
  }

  updateNpc(state.npc, dt);
  if (canEat(state.npc, state.dog)) {
    eatKhachapuri(state);
  } else if (isNpcGone(state.npc)) {
    state.npc = null;
  }
}

// Съедение хачапури: энергия, очки (без комбо — множитель только за переходы),
// сердечко. Перекорм: OVERFEED.count штук за скользящее окно — Купата объелся,
// времена очищаются (следующий перекорм — снова с трёх новых).
function eatKhachapuri(state) {
  const { npc, dog } = state;

  dog.energy = Math.min(ENERGY.max, dog.energy + ENERGY.khachapuri);
  state.score += SCORE.khachapuri;
  state.khachapuriEaten += 1;
  state.hearts.push({ x: npc.x, y: npc.y - npc.h / 2 - 8, age: 0 });
  state.events.push({ type: 'nyam' });
  state.npc = null;

  state.khachapuriTimes.push(state.time);
  state.khachapuriTimes = state.khachapuriTimes.filter(
    (t) => state.time - t <= OVERFEED.window,
  );
  if (state.khachapuriTimes.length >= OVERFEED.count) {
    dog.stuffedTimer = OVERFEED.duration;
    state.khachapuriTimes = [];
    state.toast = { kind: 'stuffed', age: 0, duration: OVERFEED.toastDuration };
  }
}

// Испуг — одно событие на кадр: все переходящие группы разбегаются,
// лапка теряется одна, комбо сгорает, виновные машины экстренно тормозят.
function handleScare(state) {
  const crossing = state.kidGroups.filter((group) => group.state === 'crossing');
  if (crossing.length === 0) return;

  const scaryCars = state.cars.filter((car) => isCarScare(car));
  if (scaryCars.length === 0) return;

  for (const car of scaryCars) scareBrake(car);
  for (const group of crossing) scareKidGroup(group);
  state.events.push({ type: 'honk' });

  state.paws -= 1;
  state.comboStreak = 0;
  if (state.paws <= 0) {
    state.paws = 0;
    state.status = 'gameover';
    state.gameoverReason = 'paws';
  }
}

// Начисление за завершённый переход: очки, комбо, счётчики, рост волны.
function scoreCrossing(state, group) {
  const multiplier =
    state.comboStreak >= SCORE.comboThreshold ? SCORE.comboMultiplier : 1;
  let points = group.kids.length * SCORE.perKid;
  if (!group.honked) points += SCORE.cleanGroupBonus;
  state.score += points * multiplier;

  state.kidsCrossedTotal += group.kids.length;
  state.comboStreak += 1;
  state.successfulCrossings += 1;
  state.events.push({ type: 'yay' });

  const wave =
    Math.floor(state.successfulCrossings / WAVES.crossingsPerWave) + 1;
  if (wave > state.wave) {
    state.wave = wave;
    state.toast = { kind: 'wave', wave, age: 0, duration: WAVES.toastDuration };
    state.events.push({ type: 'wave' });
  }
}

// Спавн групп: до волны bothSidesFrom — одна, дальше — до двух на разных
// тротуарах. Таймер тикает, только когда есть свободный слот.
function spawnKidGroups(state, dt) {
  const maxGroups = state.wave >= WAVES.bothSidesFrom ? 2 : 1;
  if (state.kidGroups.length >= maxGroups) return;

  state.kidSpawnTimer -= dt;
  if (state.kidSpawnTimer > 0) return;

  const takenSides = new Set(state.kidGroups.map((group) => group.side));
  const freeSides = [0, 1].filter((side) => !takenSides.has(side));
  if (freeSides.length === 0) return;

  const side = freeSides[Math.floor(Math.random() * freeSides.length)];
  state.kidGroups.push(createKidGroup(side, state.wave));
  state.kidSpawnTimer = randomKidSpawnDelay();
}

// Интервальный спавн по каждой полосе; занятый край не сбрасывает таймер —
// пробуем каждый кадр (с новым роллом типа), пока место не освободится.
function spawnCars(state, dt) {
  for (let lane = 0; lane < LANES.length; lane++) {
    state.laneSpawnTimers[lane] -= dt;
    if (state.laneSpawnTimers[lane] > 0) continue;

    const type = pickCarType(state.wave);
    if (!canSpawnInLane(state.cars, lane, CAR.types[type].w)) continue;

    state.cars.push(createCar(lane, type, waveSpeedFactor(state.wave)));
    state.laneSpawnTimers[lane] = randomSpawnInterval(state.wave);
  }
}

// Препятствия для машин: Купата и все дети на дороге, у каждого свой зазор.
function obstaclesFor(state) {
  const obstacles = [{ ent: state.dog, gap: CAR.dogGap }];
  for (const group of state.kidGroups) {
    for (const kid of kidsOnRoad(group)) {
      obstacles.push({ ent: kid, gap: CAR.kidGap });
    }
  }
  return obstacles;
}

// Интервал спавна машин: сжимается с волнами (2.5 с → 0.9 с) + джиттер.
function randomSpawnInterval(wave) {
  const base = Math.max(
    WAVES.carSpawnMin,
    WAVES.carSpawnStart - (wave - 1) * WAVES.carSpawnStep,
  );
  return base * (1 + (Math.random() * 2 - 1) * WAVES.carSpawnJitter);
}

// Скорость машин: +5% за волну, кап +60%.
function waveSpeedFactor(wave) {
  return Math.min(1 + (wave - 1) * WAVES.speedPerWave, WAVES.speedCap);
}

function randomKidSpawnDelay() {
  return KIDS.spawnDelayMin
    + Math.random() * (KIDS.spawnDelayMax - KIDS.spawnDelayMin);
}

function randomNpcDelay() {
  return NPC.spawnDelayMin
    + Math.random() * (NPC.spawnDelayMax - NPC.spawnDelayMin);
}
