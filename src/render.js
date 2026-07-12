import { WORLD, ZONES, ZEBRA, BARK, KIDS, NPC, COLORS } from './config.js';
import { drawHud } from './systems/hud.js';
import { STRINGS } from './systems/strings.js';

// Полная перерисовка поля каждый кадр. Слои строго в порядке:
// фон (море, набережная, декор) → тротуары → дорога → разметка → зебра →
// машины → дети → житель → Купата → эффекты (кольца лая, «БИИП!», 💖, 💤) → HUD.
// state может быть null (до старта игры) — тогда рисуем только поле.
export function render(ctx, state) {
  const width = WORLD.width;

  drawBackground(ctx, width);
  drawSidewalks(ctx, width);
  drawRoad(ctx, width);
  drawDivider(ctx, width);
  drawZebra(ctx);

  if (state === null) return;

  for (const car of state.cars) {
    drawCar(ctx, car, state.time);
  }
  drawKidGroups(ctx, state);
  if (state.npc !== null) drawNpc(ctx, state.npc);
  drawEntity(ctx, state.dog, COLORS.dog);
  drawBarkRings(ctx, state.barkRings);
  drawHonks(ctx, state.cars);
  drawHearts(ctx, state.hearts);
  drawStuffedBubble(ctx, state.dog);
  drawHud(ctx, state);
}

// Машина: корпус + мигающая обводка, пока тикает barkHitTimer
// («гав засчитан, но маршрутке нужен второй»).
function drawCar(ctx, car, time) {
  drawEntity(ctx, car, car.color);

  if (car.barkHitTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 30);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(car.x - car.w / 2, car.y - car.h / 2, car.w, car.h);
  ctx.restore();
}

// Дети: ожидающие слегка «машут» (покачивание), над waiting-группой — кружок
// терпения: дуга тает по часовой, к концу краснеет.
function drawKidGroups(ctx, state) {
  for (const group of state.kidGroups) {
    group.kids.forEach((kid, i) => {
      const bob = group.state === 'waiting'
        ? Math.sin(state.time * 6 + i * 1.3) * 2
        : 0;
      ctx.fillStyle = kid.color;
      ctx.fillRect(kid.x - kid.w / 2, kid.y - kid.h / 2 + bob, kid.w, kid.h);
    });

    if (group.state === 'waiting') drawPatienceRing(ctx, group);
  }
}

function drawPatienceRing(ctx, group) {
  const { kids } = group;
  const cx = kids.reduce((sum, kid) => sum + kid.x, 0) / kids.length;
  const cy = kids[0].y - KIDS.h / 2 - KIDS.patienceRadius - 8;
  const frac = group.patience / group.patienceMax;

  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, KIDS.patienceRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = frac < 0.3 ? '#e63946' : '#43aa8b';
  ctx.beginPath();
  ctx.arc(cx, cy, KIDS.patienceRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  ctx.restore();
}

// «БИИП!» над испуганной машиной, пока тикает honkTimer (звук — M4).
function drawHonks(ctx, cars) {
  ctx.save();
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffd166';
  for (const car of cars) {
    if (car.honkTimer <= 0) continue;
    ctx.fillText(STRINGS.fx.honk, car.x, car.y - car.h / 2 - 4);
  }
  ctx.restore();
}

// Кольцо лая: расширяется ровно до радиуса своего гава (слабый лай — маленькое
// кольцо, игрок видит дальнобойность) и тает.
function drawBarkRings(ctx, rings) {
  for (const ring of rings) {
    const t = ring.age / BARK.ringDuration;

    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = BARK.ringColor;
    ctx.lineWidth = BARK.ringWidth;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 24 + (ring.radius - 24) * t, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Житель: зовёт репликой, уходя — пожимает плечами (анимации — M4).
function drawNpc(ctx, npc) {
  drawEntity(ctx, npc, NPC.colors[npc.kind]);

  ctx.save();
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffffff';
  const text = npc.state === 'calling' ? STRINGS.fx.khachapuriCall : STRINGS.fx.shrug;
  const halfText = ctx.measureText(text).width / 2;
  const x = Math.min(Math.max(npc.x, halfText + 4), WORLD.width - halfText - 4);
  ctx.fillText(text, x, npc.y - npc.h / 2 - 4);
  ctx.restore();
}

// 💖 над съеденным хачапури: всплывает и тает.
function drawHearts(ctx, hearts) {
  ctx.save();
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const heart of hearts) {
    const t = heart.age / NPC.heartDuration;
    ctx.globalAlpha = 1 - t;
    ctx.fillText(STRINGS.fx.heart, heart.x, heart.y - NPC.heartRise * t);
  }
  ctx.restore();
}

// 💤 над объевшимся Купатой (полноценная анимация — M4).
function drawStuffedBubble(ctx, dog) {
  if (dog.stuffedTimer <= 0) return;
  ctx.save();
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(STRINGS.fx.stuffed, dog.x, dog.y - dog.h / 2 - 4);
  ctx.restore();
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
