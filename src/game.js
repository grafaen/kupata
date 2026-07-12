import { LANES, CAR, BARK } from './config.js';
import { createDog, updateDog, tryBark } from './entities/dog.js';
import {
  createCar, updateCars, tryStopByBark, isCarInRadius, isCarGone, canSpawnInLane,
} from './entities/car.js';

export function createGame() {
  return {
    dog: createDog(),
    cars: [],
    laneSpawnTimers: LANES.map(() => randomSpawnInterval()),
    barkRings: [], // эффекты лая: { x, y, age }
    time: 0,
  };
}

export function update(state, input, dt) {
  state.time += dt;

  updateDog(state.dog, input, dt);
  handleBark(state, input);

  for (const ring of state.barkRings) ring.age += dt;
  state.barkRings = state.barkRings.filter((ring) => ring.age < BARK.ringDuration);

  spawnCars(state, dt);
  updateCars(state.cars, state.dog, dt);
  state.cars = state.cars.filter((car) => !isCarGone(car));
}

// Гав: кольцо-эффект + остановка всех машин, чей корпус попал в радиус.
function handleBark(state, input) {
  if (!input.consumeBark() || !tryBark(state.dog)) return;

  const { dog } = state;
  state.barkRings.push({ x: dog.x, y: dog.y, age: 0 });

  for (const car of state.cars) {
    if (isCarInRadius(car, dog.x, dog.y, BARK.radius)) {
      tryStopByBark(car);
    }
  }
}

// Интервальный спавн по каждой полосе; занятый край не сбрасывает таймер —
// пробуем каждый кадр, пока место не освободится.
function spawnCars(state, dt) {
  for (let lane = 0; lane < LANES.length; lane++) {
    state.laneSpawnTimers[lane] -= dt;
    if (state.laneSpawnTimers[lane] > 0) continue;
    if (!canSpawnInLane(state.cars, lane)) continue;

    state.cars.push(createCar(lane));
    state.laneSpawnTimers[lane] = randomSpawnInterval();
  }
}

function randomSpawnInterval() {
  return CAR.spawnIntervalMin + Math.random() * (CAR.spawnIntervalMax - CAR.spawnIntervalMin);
}
