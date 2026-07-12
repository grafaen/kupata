import { MAX_DT } from './config.js';
import { render } from './render.js';
import { createInput } from './systems/input.js';
import { createGame, update } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const input = createInput();
let state = createGame();

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DT);
  last = now;

  update(state, input, dt);

  render(ctx, state);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
