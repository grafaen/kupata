import { WORLD, DOG, BARK } from '../config.js';

// x/y — центр прямоугольника (см. соглашение в config.js). Старт: центр нижнего тротуара.
export function createDog() {
  return { x: 480, y: 400, w: DOG.w, h: DOG.h, barkCooldown: 0 };
}

export function updateDog(dog, input, dt) {
  dog.barkCooldown = Math.max(0, dog.barkCooldown - dt);

  let dx = input.axisX();
  let dy = input.axisY();

  if (dx !== 0 && dy !== 0) {
    const norm = Math.SQRT1_2; // 1/√2 — диагональ не быстрее прямой
    dx *= norm;
    dy *= norm;
  }

  dog.x += dx * DOG.speed * dt;
  dog.y += dy * DOG.speed * dt;

  const halfW = dog.w / 2;
  const halfH = dog.h / 2;
  dog.x = clamp(dog.x, halfW, WORLD.width - halfW);
  dog.y = clamp(dog.y, DOG.minY + halfH, DOG.maxY - halfH);
}

// Попытка гавкнуть: false, пока не прошёл кулдаун.
export function tryBark(dog) {
  if (dog.barkCooldown > 0) return false;
  dog.barkCooldown = BARK.cooldown;
  return true;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
