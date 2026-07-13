import { MAX_DT, STORAGE } from './config.js';
import { render } from './render.js';
import { createInput } from './systems/input.js';
import { createGame, update } from './game.js';
import { STRINGS } from './systems/strings.js';
import { loadSprites } from './systems/sprites.js';
import { createAudio } from './systems/audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const overlay = document.getElementById('gameover');
const againButton = document.getElementById('go-again');
againButton.textContent = STRINGS.ui.again;

const input = createInput();
const audio = createAudio();

// AudioContext можно создать только после жеста пользователя.
window.addEventListener('keydown', () => audio.unlock(), { once: true });
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

const muteButton = document.getElementById('mute-btn');
function toggleMute() {
  audio.setMuted(!audio.isMuted());
  syncMuteButton();
}
function syncMuteButton() {
  muteButton.textContent = audio.isMuted() ? '🔇' : '🔊';
}
muteButton.addEventListener('click', () => {
  toggleMute();
  muteButton.blur(); // иначе Space жмёт кнопку вместо лая
});
syncMuteButton();

// Поле видно сразу, игра стартует после загрузки спрайтов (локальные SVG —
// мгновенно; любой пропавший файл просто заменяется прямоугольником).
render(ctx, null);
let state = null;
loadSprites().then(() => {
  state = createGame();
});

againButton.addEventListener('click', () => {
  overlay.classList.add('hidden');
  state = createGame(); // рестарт — полное пересоздание состояния
  againButton.blur();
});

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DT);
  last = now;

  if (input.consumeMuteToggle()) toggleMute();

  if (state !== null && state.status === 'playing') {
    update(state, input, dt);
    for (const event of state.events) audio.play(event);
    state.events.length = 0;
    if (state.status === 'gameover') showGameOver();
  }

  render(ctx, state);

  requestAnimationFrame(frame);
}

function showGameOver() {
  const best = readBest();
  const isNewBest = state.score > best;
  if (isNewBest) writeBest(state.score);

  // Титул — по причине конца: лапки кончились или энергия на нуле.
  document.getElementById('go-title').textContent =
    state.gameoverReason === 'energy'
      ? STRINGS.ui.gameoverTitleEnergy
      : STRINGS.ui.gameoverTitle;
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
