import { MAX_DT, STORAGE } from './config.js';
import { render } from './render.js';
import { createInput } from './systems/input.js';
import { createGame, update } from './game.js';
import { STRINGS } from './systems/strings.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const overlay = document.getElementById('gameover');
const againButton = document.getElementById('go-again');
document.getElementById('go-title').textContent = STRINGS.ui.gameoverTitle;
againButton.textContent = STRINGS.ui.again;

const input = createInput();
let state = createGame();

againButton.addEventListener('click', () => {
  overlay.classList.add('hidden');
  state = createGame(); // рестарт — полное пересоздание состояния
  againButton.blur(); // иначе Space жмёт кнопку вместо лая
});

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DT);
  last = now;

  if (state.status === 'playing') {
    update(state, input, dt);
    if (state.status === 'gameover') showGameOver();
  }

  render(ctx, state);

  requestAnimationFrame(frame);
}

function showGameOver() {
  const best = readBest();
  const isNewBest = state.score > best;
  if (isNewBest) writeBest(state.score);

  document.getElementById('go-score').textContent =
    `${STRINGS.ui.score}: ${state.score}`;
  document.getElementById('go-best').textContent = isNewBest
    ? `${STRINGS.ui.newBest} ${state.score}`
    : `${STRINGS.ui.best}: ${best}`;
  document.getElementById('go-kids').textContent =
    STRINGS.ui.kidsCrossed(state.kidsCrossedTotal);
  document.getElementById('go-khachapuri').textContent =
    STRINGS.ui.khachapuriEaten(state.khachapuriEaten);
  overlay.classList.remove('hidden');
}

// localStorage может быть недоступен (приватный режим) — тогда без рекорда.
function readBest() {
  try {
    return Number(localStorage.getItem(STORAGE.best)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    localStorage.setItem(STORAGE.best, String(value));
  } catch {
    // рекорд не сохранится — не критично
  }
}

requestAnimationFrame(frame);
