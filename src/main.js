import { MAX_DT, STORAGE, CAR } from './config.js';
import { render } from './render.js';
import { createInput } from './systems/input.js';
import { createGame, update } from './game.js';
import { STRINGS, setLanguage, currentLanguage, LANGUAGES } from './systems/i18n.js';
import { loadSprites } from './systems/sprites.js';
import { createAudio } from './systems/audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const input = createInput();
const audio = createAudio();

// AudioContext можно создать только после жеста пользователя.
window.addEventListener('keydown', () => audio.unlock(), { once: true });
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

// ── Экраны (impl-plan 3.3): menu → playing ⇄ paused → gameover → menu ──
// Состояние экрана живёт здесь: state.status в game.js — правило партии
// (тестируется в node), пауза и меню — забота UI.

const overlays = {
  menu: document.getElementById('menu'),
  howto: document.getElementById('howto'),
  about: document.getElementById('about'),
  paused: document.getElementById('pause'),
  gameover: document.getElementById('gameover'),
};

let screen = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover' | 'howto' | 'about'
let state = null;

function setScreen(name) {
  screen = name;
  for (const [key, el] of Object.entries(overlays)) {
    el.classList.toggle('hidden', key !== name);
  }
  input.clearTransient(); // нажатое на прошлом экране не «стреляет» на новом
}

function startGame() {
  state = createGame();
  setScreen('playing');
}

function togglePause() {
  if (screen === 'playing') setScreen('paused');
  else if (screen === 'paused') setScreen('playing');
}

function toMenu() {
  state = null; // render(null) рисует пустое поле под меню
  setScreen('menu');
}

// Свёрнутая вкладка/приложение — на паузу (телефоны; глушит и сирену).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'playing') setScreen('paused');
});

// ── i18n: тексты экранов по data-i18n, переключатель языка в меню ──

function applyTexts() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const [section, key] = el.dataset.i18n.split('.');
    el.textContent = STRINGS[section][key];
  }
  for (const button of document.querySelectorAll('.lang-switch button')) {
    button.setAttribute(
      'aria-pressed', String(button.dataset.lang === currentLanguage()),
    );
  }
}

for (const button of document.querySelectorAll('.lang-switch button')) {
  button.addEventListener('click', () => {
    if (LANGUAGES.includes(button.dataset.lang)) setLanguage(button.dataset.lang);
    applyTexts();
    button.blur();
  });
}

// ── Кнопки экранов и HUD ──

// У каждой кнопки blur(): иначе Space жмёт её вместо лая.
function onClick(id, handler) {
  const button = document.getElementById(id);
  button.addEventListener('click', () => {
    handler();
    button.blur();
  });
}

onClick('menu-play', startGame);
onClick('menu-howto', () => setScreen('howto'));
onClick('howto-back', () => setScreen('menu'));
onClick('menu-about', () => setScreen('about'));
onClick('about-back', () => setScreen('menu'));
onClick('pause-resume', togglePause);
onClick('pause-restart', startGame);
onClick('pause-menu', toMenu);
onClick('go-again', startGame);
onClick('go-menu', toMenu);
onClick('pause-btn', () => {
  if (screen === 'playing' || screen === 'paused') togglePause();
});

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
  muteButton.blur();
});
syncMuteButton();

input.bindTouchControls({
  joystick: document.getElementById('joystick'),
  nub: document.getElementById('joystick-nub'),
  barkButton: document.getElementById('bark-btn'),
});

// Поле видно сразу под меню; «Играть» ждёт загрузки спрайтов (локальные SVG —
// мгновенно; любой пропавший файл просто заменяется прямоугольником).
applyTexts();
render(ctx, null);
const playButton = document.getElementById('menu-play');
playButton.disabled = true;
loadSprites().then(() => {
  playButton.disabled = false;
});

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DT);
  last = now; // тикает и на паузе: при резюме нет скачка dt

  if (input.consumeMuteToggle()) toggleMute();
  if (input.consumePauseToggle() && (screen === 'playing' || screen === 'paused')) {
    togglePause();
  }

  // Пауза — просто пропуск update: мир (все анимации — от state.time)
  // замирает под оверлеем, render продолжает его рисовать.
  if (screen === 'playing' && state !== null) {
    update(state, input, dt);
    for (const event of state.events) audio.play(event);
    state.events.length = 0;
    if (state.status === 'gameover') {
      fillGameOver();
      setScreen('gameover');
    }
  }

  // Сирена — деривация от состояния, а не события: game.js звука не знает,
  // а пауза/меню/gameover глушат её сами собой.
  audio.setSiren(
    screen === 'playing' && state !== null
      && state.cars.some((car) => CAR.types[car.type].emergency),
  );

  render(ctx, state);

  requestAnimationFrame(frame);
}

function fillGameOver() {
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
