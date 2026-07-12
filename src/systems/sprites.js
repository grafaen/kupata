import { SPRITES } from '../config.js';

// Загрузчик спрайтов по манифесту (impl-plan 3.1). В sprites попадают только
// успешно загруженные Image — рендер для отсутствующих рисует цветной
// прямоугольник-заглушку, игра не ломается ни при какой пропаже файла.
export const sprites = {};

export function loadSprites() {
  const jobs = Object.entries(SPRITES).map(
    ([name, path]) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          sprites[name] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Спрайт не загрузился: ${path}`);
          resolve();
        };
        img.src = path;
      }),
  );
  return Promise.all(jobs);
}
