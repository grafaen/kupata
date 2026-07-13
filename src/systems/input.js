// Ввод: клавиатура (независима от раскладки — e.code) + touch-контролы
// (виртуальный джойстик и кнопка «ГАВ!», см. bindTouchControls).

import { TOUCH } from '../config.js';

const AXIS_X_NEG = new Set(['KeyA', 'ArrowLeft']);
const AXIS_X_POS = new Set(['KeyD', 'ArrowRight']);
const AXIS_Y_NEG = new Set(['KeyW', 'ArrowUp']);
const AXIS_Y_POS = new Set(['KeyS', 'ArrowDown']);

const PREVENT_DEFAULT_CODES = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

export function createInput(target = window) {
  const pressed = new Set();
  const justPressed = new Set();
  // Джойстик снапит вектор в {−1, 0, 1} по осям (8 направлений) — на выходе
  // то же, что у WASD: dog.js и game.js о touch не знают.
  const touchAxis = { x: 0, y: 0 };
  let touchBark = false;

  target.addEventListener('keydown', (e) => {
    pressed.add(e.code);
    if (!e.repeat) {
      justPressed.add(e.code);
    }
    if (PREVENT_DEFAULT_CODES.has(e.code)) {
      e.preventDefault();
    }
  });

  target.addEventListener('keyup', (e) => {
    pressed.delete(e.code);
  });

  target.addEventListener('blur', () => {
    pressed.clear();
    justPressed.clear();
  });

  function axisFrom(negCodes, posCodes, touchValue) {
    let value = touchValue;
    if (isAnyPressed(pressed, negCodes)) value -= 1;
    if (isAnyPressed(pressed, posCodes)) value += 1;
    return Math.max(-1, Math.min(1, value));
  }

  // Джойстик: Pointer Events с капчуром по pointerId — второй палец на кнопке
  // гава не сбивает движение (бег + гав одновременно — ядро геймплея).
  function bindTouchControls({ joystick, nub, barkButton }) {
    let pointerId = null;

    function updateFromPointer(e) {
      const rect = joystick.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const len = Math.hypot(dx, dy);

      if (len < TOUCH.deadZone) {
        touchAxis.x = 0;
        touchAxis.y = 0;
      } else {
        // Снап к ближайшему из 8 направлений: диагональ — сектор вокруг 45°.
        const angle = Math.atan2(dy, dx);
        touchAxis.x = Math.round(Math.cos(angle));
        touchAxis.y = Math.round(Math.sin(angle));
      }

      const travel = Math.min(len, TOUCH.nubTravel);
      const nx = len > 0 ? (dx / len) * travel : 0;
      const ny = len > 0 ? (dy / len) * travel : 0;
      nub.style.transform = `translate(${nx}px, ${ny}px)`;
    }

    function releaseJoystick() {
      pointerId = null;
      touchAxis.x = 0;
      touchAxis.y = 0;
      nub.style.transform = '';
    }

    joystick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pointerId = e.pointerId;
      try {
        joystick.setPointerCapture(e.pointerId);
      } catch {
        // капчур — надёжность ведения пальца; без него джойстик тоже работает
      }
      updateFromPointer(e);
    });
    joystick.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointerId) updateFromPointer(e);
    });
    joystick.addEventListener('pointerup', (e) => {
      if (e.pointerId === pointerId) releaseJoystick();
    });
    joystick.addEventListener('pointercancel', (e) => {
      if (e.pointerId === pointerId) releaseJoystick();
    });

    // Кнопка гава — edge-trigger, как Space: одно касание — один гав.
    barkButton.addEventListener('pointerdown', (e) => {
      e.preventDefault(); // не отдавать фокус: Space остаётся лаем
      touchBark = true;
    });
    barkButton.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  return {
    axisX: () => axisFrom(AXIS_X_NEG, AXIS_X_POS, touchAxis.x),
    axisY: () => axisFrom(AXIS_Y_NEG, AXIS_Y_POS, touchAxis.y),
    // Лай — edge-trigger: true один раз на физическое нажатие (удержание не спамит).
    consumeBark: () => {
      const keyboard = justPressed.delete('Space');
      const touch = touchBark;
      touchBark = false;
      return keyboard || touch;
    },
    consumeMuteToggle: () => justPressed.delete('KeyM'),
    // Оба ключа удаляем явно: `a || b` с delete пропустил бы второй.
    consumePauseToggle: () => {
      const p = justPressed.delete('KeyP');
      const esc = justPressed.delete('Escape');
      return p || esc;
    },
    // Сброс разовых нажатий при смене экрана: Space, нажатый на паузе,
    // не должен гавкнуть на первом кадре после резюме.
    clearTransient: () => {
      justPressed.clear();
      touchBark = false;
    },
    bindTouchControls,
  };
}

function isAnyPressed(pressed, codes) {
  for (const code of codes) {
    if (pressed.has(code)) return true;
  }
  return false;
}
