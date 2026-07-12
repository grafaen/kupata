import { WORLD, DEMO_CAR } from './config.js';
import { createDog, updateDog } from './entities/dog.js';

export function createGame() {
  return {
    dog: createDog(),
    demoCar: { x: -DEMO_CAR.w / 2, y: DEMO_CAR.y, w: DEMO_CAR.w, h: DEMO_CAR.h },
    time: 0,
  };
}

export function update(state, input, dt) {
  state.time += dt;

  updateDog(state.dog, input, dt);
  updateDemoCar(state.demoCar, dt);
}

function updateDemoCar(car, dt) {
  car.x += DEMO_CAR.speed * dt;

  if (car.x - car.w / 2 > WORLD.width) {
    car.x = -car.w / 2;
  }
}
