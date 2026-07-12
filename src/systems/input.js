// Клавиатурный ввод: независим от раскладки (используем e.code, не e.key).

const AXIS_X_NEG = new Set(['KeyA', 'ArrowLeft']);
const AXIS_X_POS = new Set(['KeyD', 'ArrowRight']);
const AXIS_Y_NEG = new Set(['KeyW', 'ArrowUp']);
const AXIS_Y_POS = new Set(['KeyS', 'ArrowDown']);

const PREVENT_DEFAULT_CODES = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

export function createInput(target = window) {
  const pressed = new Set();

  target.addEventListener('keydown', (e) => {
    pressed.add(e.code);
    if (PREVENT_DEFAULT_CODES.has(e.code)) {
      e.preventDefault();
    }
  });

  target.addEventListener('keyup', (e) => {
    pressed.delete(e.code);
  });

  target.addEventListener('blur', () => {
    pressed.clear();
  });

  function axisFrom(negCodes, posCodes) {
    let value = 0;
    if (isAnyPressed(pressed, negCodes)) value -= 1;
    if (isAnyPressed(pressed, posCodes)) value += 1;
    return value;
  }

  return {
    axisX: () => axisFrom(AXIS_X_NEG, AXIS_X_POS),
    axisY: () => axisFrom(AXIS_Y_NEG, AXIS_Y_POS),
  };
}

function isAnyPressed(pressed, codes) {
  for (const code of codes) {
    if (pressed.has(code)) return true;
  }
  return false;
}
