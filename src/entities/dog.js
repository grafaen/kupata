import { WORLD, DOG, BARK, ENERGY, OVERFEED } from '../config.js';

// x/y — центр прямоугольника (см. соглашение в config.js). Старт: центр нижнего тротуара.
export function createDog() {
  return {
    x: 480,
    y: 400,
    w: DOG.w,
    h: DOG.h,
    barkCooldown: 0,
    energy: ENERGY.start,
    stuffedTimer: 0, // > 0 — «объелся»: вдвое медленнее и не может лаять
    stunTimer: 0, // > 0 — оглушён после контакта с движущейся машиной («Ой!»)
    facing: 1, // 1 — вправо, -1 — влево (для отражения спрайта)
    moving: false, // для анимации бега
  };
}

export function updateDog(dog, input, dt) {
  dog.barkCooldown = Math.max(0, dog.barkCooldown - dt);
  dog.stuffedTimer = Math.max(0, dog.stuffedTimer - dt);
  dog.stunTimer = Math.max(0, dog.stunTimer - dt);
  dog.energy = Math.min(ENERGY.max, dog.energy + ENERGY.regenPerSec * dt);

  let dx = dog.stunTimer > 0 ? 0 : input.axisX();
  let dy = dog.stunTimer > 0 ? 0 : input.axisY();

  if (dx !== 0 && dy !== 0) {
    const norm = Math.SQRT1_2; // 1/√2 — диагональ не быстрее прямой
    dx *= norm;
    dy *= norm;
  }

  dog.moving = dx !== 0 || dy !== 0;
  if (dx !== 0) dog.facing = dx > 0 ? 1 : -1;

  const speed = dog.stuffedTimer > 0 ? DOG.speed * OVERFEED.speedFactor : DOG.speed;
  dog.x += dx * speed * dt;
  dog.y += dy * speed * dt;

  clampDogPosition(dog);
}

// Кламп в разрешённую зону — нужен и после отброса машиной (game.js).
export function clampDogPosition(dog) {
  const halfW = dog.w / 2;
  const halfH = dog.h / 2;
  dog.x = clamp(dog.x, halfW, WORLD.width - halfW);
  dog.y = clamp(dog.y, DOG.minY + halfH, DOG.maxY - halfH);
}

// Попытка гавкнуть: false на кулдауне, при перекорме и оглушении.
// Успех списывает энергию.
export function tryBark(dog) {
  if (dog.barkCooldown > 0 || dog.stuffedTimer > 0 || dog.stunTimer > 0) return false;
  dog.barkCooldown = BARK.cooldown;
  dog.energy = Math.max(0, dog.energy - ENERGY.barkCost);
  return true;
}

// Радиус текущего гава: на низкой энергии лай слабый — мягкий лимит вместо
// блокировки. Считать ДО tryBark: радиус — по энергии до списания.
export function barkRadius(dog) {
  return dog.energy < ENERGY.weakThreshold ? BARK.weakRadius : BARK.radius;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
