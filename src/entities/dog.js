import { WORLD, DOG } from '../config.js';

// x/y — центр прямоугольника. Старт: центр нижнего тротуара.
export function createDog() {
  return { x: 480, y: 400, w: DOG.w, h: DOG.h };
}

export function updateDog(dog, input, dt) {
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
  dog.x = clamp(dog.x, halfW, WORLD.width - halfW);
  dog.y = clamp(dog.y, DOG.minY, DOG.maxY);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
