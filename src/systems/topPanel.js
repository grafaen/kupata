import { TOP_PANEL, WORLD } from '../config.js';
import { STRINGS } from './i18n.js';

// Панель топ-10 глобальных рекордов в правом нижнем углу игрового поля (зона
// bottomDecor). Рисуется на canvas последним слоем (см. render.js): canvas
// растянут object-fit: contain, и только так панель сидит в углу самого поля,
// а не экрана, и масштабируется вместе с ним. Данные кладёт main.js через
// setTop; null (не загружено/офлайн) и [] панель не рисуют — недоступный API
// не мусорит поле.

let entries = null;
let myRank = null; // 1-based место игрока из ответа POST /score — подсветка строки

export function setTop(list, rank = null) {
  entries = list;
  myRank = rank;
}

export function drawTopPanel(ctx) {
  if (entries === null || entries.length === 0) return;

  const P = TOP_PANEL;
  const height = P.padY * 2 + P.titleGap + entries.length * P.rowHeight;
  const x = WORLD.width - P.margin - P.width;
  const y = WORLD.height - P.margin - height;

  ctx.save();
  ctx.fillStyle = P.bg;
  ctx.beginPath();
  roundRectPath(ctx, x, y, P.width, height, P.radius);
  ctx.fill();

  ctx.fillStyle = P.color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = P.titleFont;
  ctx.fillText(STRINGS.ui.records, x + P.padX, y + P.padY);

  ctx.font = P.rowFont;
  entries.forEach((entry, i) => {
    const rowY = y + P.padY + P.titleGap + i * P.rowHeight;

    if (i + 1 === myRank) {
      ctx.fillStyle = P.meBg;
      ctx.beginPath();
      roundRectPath(
        ctx, x + P.meInset, rowY - 1, P.width - P.meInset * 2, P.rowHeight, P.meRadius,
      );
      ctx.fill();
      ctx.fillStyle = P.color;
    }

    const score = String(entry.score);
    ctx.textAlign = 'right';
    ctx.fillText(score, x + P.width - P.padX, rowY);
    // Длинное имя ужимается четвёртым аргументом fillText, а не наезжает на очки.
    const nameMax = P.width - P.padX * 2 - ctx.measureText(score).width - 8;
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${entry.name}`, x + P.padX, rowY, nameMax);
  });
  ctx.restore();
}

// Как roundRectPath в render.js: скругление там, где браузер его умеет.
function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h); // старые браузеры: без скруглений
  }
}
