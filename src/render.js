import { WORLD, ZONES, ZEBRA, COLORS } from './config.js';

// Полная перерисовка поля каждый кадр. Слои строго в порядке:
// фон (море, набережная, декор) → тротуары → дорога → разметка → зебра →
// машины → Купата.
// state может быть null (до старта игры) — тогда рисуем только поле.
export function render(ctx, state) {
  const width = WORLD.width;

  drawBackground(ctx, width);
  drawSidewalks(ctx, width);
  drawRoad(ctx, width);
  drawDivider(ctx, width);
  drawZebra(ctx);

  if (state === null) return;

  drawEntity(ctx, state.demoCar, COLORS.demoCar);
  drawEntity(ctx, state.dog, COLORS.dog);
}

function drawEntity(ctx, entity, color) {
  ctx.fillStyle = color;
  ctx.fillRect(entity.x - entity.w / 2, entity.y - entity.h / 2, entity.w, entity.h);
}

function drawBackground(ctx, width) {
  const { sea, promenade, bottomDecor } = ZONES;

  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(0, sea.y1, width, sea.y2 - sea.y1);

  ctx.fillStyle = COLORS.promenade;
  ctx.fillRect(0, promenade.y1, width, promenade.y2 - promenade.y1);

  ctx.fillStyle = COLORS.bottomDecor;
  ctx.fillRect(0, bottomDecor.y1, width, bottomDecor.y2 - bottomDecor.y1);
}

function drawSidewalks(ctx, width) {
  const { topSidewalk, bottomSidewalk } = ZONES;

  ctx.fillStyle = COLORS.sidewalk;
  ctx.fillRect(0, topSidewalk.y1, width, topSidewalk.y2 - topSidewalk.y1);
  ctx.fillRect(0, bottomSidewalk.y1, width, bottomSidewalk.y2 - bottomSidewalk.y1);
}

function drawRoad(ctx, width) {
  const { roadLaneUp, roadLaneDown } = ZONES;

  ctx.fillStyle = COLORS.asphalt;
  ctx.fillRect(0, roadLaneUp.y1, width, roadLaneUp.y2 - roadLaneUp.y1);
  ctx.fillRect(0, roadLaneDown.y1, width, roadLaneDown.y2 - roadLaneDown.y1);
}

function drawDivider(ctx, width) {
  const { y } = ZONES.roadDivider;

  ctx.save();
  ctx.strokeStyle = COLORS.markings;
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 16]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.restore();
}

function drawZebra(ctx) {
  const { roadLaneUp, roadLaneDown } = ZONES;
  const top = roadLaneUp.y1;
  const bottom = roadLaneDown.y2;
  const stripeCount = 7;
  const gap = (bottom - top) / stripeCount;
  const stripeHeight = gap * 0.6;
  const stripeWidth = ZEBRA.x2 - ZEBRA.x1;

  ctx.fillStyle = COLORS.markings;
  for (let i = 0; i < stripeCount; i++) {
    const y = top + i * gap + (gap - stripeHeight) / 2;
    ctx.fillRect(ZEBRA.x1, y, stripeWidth, stripeHeight);
  }
}
