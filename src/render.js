import {
  WORLD, ZONES, ZEBRA, BARK, KIDS, NPC, BUBBLE, COLORS,
} from './config.js';
import { drawHud } from './systems/hud.js';
import { STRINGS } from './systems/strings.js';
import { sprites } from './systems/sprites.js';

// Полная перерисовка поля каждый кадр. Слои строго в порядке:
// фон (заливки зон → SVG-панорамы) → тротуары → дорога → разметка → зебра →
// машины → дети → житель → Купата → эффекты (кольца, 💖, «!») → пузыри → HUD.
// Любой не загрузившийся спрайт рисуется цветным прямоугольником — игра
// работает и без графики. state может быть null (до старта) — только поле.
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
  drawDog(ctx, state);
  drawBarkRings(ctx, state.barkRings);
  drawHearts(ctx, state.hearts);
  drawBubbles(ctx, state);
  drawHud(ctx, state);
}

// Спрайт по имени из манифеста; нет — прямоугольник-заглушка цветом fallback.
// flip — отражение по горизонтали (спрайты нарисованы «носом вправо»).
function drawSprite(ctx, name, x, y, w, h, flip, fallback) {
  const img = sprites[name];
  if (!img) {
    ctx.fillStyle = fallback;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    return;
  }
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  }
}

// Машина: спрайт по полосе (верхняя едет влево — отражаем) + мигающая
// обводка, пока тикает barkHitTimer («гав засчитан, но маршрутке нужен второй»).
function drawCar(ctx, car, time) {
  drawSprite(ctx, car.sprite, car.x, car.y, car.w, car.h, car.dir === -1, car.color);

  if (car.barkHitTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 30);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(car.x - car.w / 2, car.y - car.h / 2, car.w, car.h);
  ctx.restore();
}

// Купата: поза по состоянию (объелся → лает → бежит 8 кадров/с → стоит),
// отражение по направлению взгляда, дрожь при оглушении.
function drawDog(ctx, state) {
  const { dog } = state;
  const shake = dog.stunTimer > 0 ? Math.sin(state.time * 40) * 1.5 : 0;
  drawSprite(
    ctx, dogSpriteName(dog, state.time),
    dog.x + shake, dog.y, dog.w, dog.h,
    dog.facing === -1, COLORS.dog,
  );
}

function dogSpriteName(dog, time) {
  if (dog.stuffedTimer > 0) return 'kupataStuffed';
  if (dog.barkCooldown > BARK.cooldown - BUBBLE.barkShowFor) return 'kupataBark';
  if (dog.moving) return Math.floor(time * 8) % 2 === 0 ? 'kupata' : 'kupataRun2';
  return 'kupata';
}

// Дети: ожидающие слегка «машут» (покачивание), над waiting-группой — кружок
// терпения; разбегающиеся — с красным «!» над головой.
function drawKidGroups(ctx, state) {
  for (const group of state.kidGroups) {
    group.kids.forEach((kid, i) => {
      const bob = group.state === 'waiting'
        ? Math.sin(state.time * 6 + i * 1.3) * 2
        : 0;
      drawSprite(ctx, `kid${kid.variant}`, kid.x, kid.y + bob, kid.w, kid.h, false, kid.color);
    });

    if (group.state === 'waiting') drawPatienceRing(ctx, group);
    if (group.state === 'scattering') drawScareMarks(ctx, group, state.time);
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

// «!» над каждым разбегающимся ребёнком (звук испуга — «БИИП!» машин).
function drawScareMarks(ctx, group, time) {
  ctx.save();
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#e63946';
  for (const kid of group.kids) {
    const hop = Math.abs(Math.sin(time * 12)) * 3;
    ctx.fillText(STRINGS.fx.scare, kid.x, kid.y - kid.h / 2 - 2 - hop);
  }
  ctx.restore();
}

// Житель: спрайт Нино/Гоги (реплика — в drawBubbles).
function drawNpc(ctx, npc) {
  drawSprite(
    ctx, npc.kind === 'nino' ? 'granny' : 'baker',
    npc.x, npc.y, npc.w, npc.h, false, NPC.colors[npc.kind],
  );
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

// ── Пузыри реплик: поверх всех сущностей, под HUD ──

function drawBubbles(ctx, state) {
  const { dog, npc } = state;

  for (const car of state.cars) {
    if (car.honkTimer > 0) {
      drawBubble(ctx, car.x, car.y - car.h / 2 - 2, STRINGS.fx.honk);
    }
  }

  if (npc !== null) {
    const text = npc.state === 'calling' ? STRINGS.fx.khachapuriCall : STRINGS.fx.shrug;
    drawBubble(ctx, npc.x, npc.y - npc.h / 2 - 2, text);
  }

  for (const group of state.kidGroups) {
    if (group.state !== 'done') continue;
    const cx = group.kids.reduce((sum, kid) => sum + kid.x, 0) / group.kids.length;
    const cy = group.kids[0].y - KIDS.h / 2 - 2;
    drawBubble(ctx, cx, cy, STRINGS.fx.yay);
  }

  // Приоритет реплик Купаты: «Ой!» → 💤 → «Гав!».
  if (dog.stunTimer > 0) {
    drawBubble(ctx, dog.x, dog.y - dog.h / 2 - 2, STRINGS.fx.oy);
  } else if (dog.stuffedTimer > 0) {
    drawBubble(ctx, dog.x, dog.y - dog.h / 2 - 2, STRINGS.fx.stuffed);
  } else if (dog.barkCooldown > BARK.cooldown - BUBBLE.barkShowFor) {
    drawBubble(ctx, dog.x, dog.y - dog.h / 2 - 2, STRINGS.fx.bark);
  }
}

// Пузырь с хвостиком, остриём в (cx, bottomY); не вылезает за края поля.
function drawBubble(ctx, cx, bottomY, text) {
  ctx.save();
  ctx.font = BUBBLE.font;
  const textW = ctx.measureText(text).width;
  const w = textW + BUBBLE.padX * 2;
  const h = 15 + BUBBLE.padY * 2;
  const x = clamp(cx, w / 2 + 2, WORLD.width - w / 2 - 2);
  const top = bottomY - BUBBLE.tail - h;

  ctx.fillStyle = BUBBLE.bg;
  ctx.beginPath();
  roundRectPath(ctx, x - w / 2, top, w, h, BUBBLE.radius);
  ctx.fill();

  const tailX = clamp(cx, x - w / 2 + BUBBLE.radius + 4, x + w / 2 - BUBBLE.radius - 4);
  ctx.beginPath();
  ctx.moveTo(tailX - 5, top + h - 0.5);
  ctx.lineTo(tailX + 5, top + h - 0.5);
  ctx.lineTo(tailX, bottomY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = BUBBLE.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, top + h / 2 + 1);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h); // старые браузеры: без скруглений
  }
}

// ── Поле ──

// Заливки зон — базовый слой и фолбэк; поверх — SVG-панорамы моря и низа.
function drawBackground(ctx, width) {
  const { sea, promenade, bottomDecor } = ZONES;

  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(0, sea.y1, width, sea.y2 - sea.y1);

  ctx.fillStyle = COLORS.promenade;
  ctx.fillRect(0, promenade.y1, width, promenade.y2 - promenade.y1);

  ctx.fillStyle = COLORS.bottomDecor;
  ctx.fillRect(0, bottomDecor.y1, width, bottomDecor.y2 - bottomDecor.y1);

  if (sprites.bgTop) {
    ctx.drawImage(sprites.bgTop, 0, 0, width, promenade.y2);
  }
  if (sprites.bgBottom) {
    ctx.drawImage(sprites.bgBottom, 0, bottomDecor.y1, width, bottomDecor.y2 - bottomDecor.y1);
  }
}

function drawSidewalks(ctx, width) {
  const { topSidewalk, bottomSidewalk } = ZONES;

  ctx.fillStyle = COLORS.sidewalk;
  ctx.fillRect(0, topSidewalk.y1, width, topSidewalk.y2 - topSidewalk.y1);
  ctx.fillRect(0, bottomSidewalk.y1, width, bottomSidewalk.y2 - bottomSidewalk.y1);

  // Швы плитки.
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 40; x < width; x += 80) {
    ctx.moveTo(x, topSidewalk.y1);
    ctx.lineTo(x, topSidewalk.y2);
    ctx.moveTo(x, bottomSidewalk.y1);
    ctx.lineTo(x, bottomSidewalk.y2);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRoad(ctx, width) {
  const { roadLaneUp, roadLaneDown } = ZONES;

  ctx.fillStyle = COLORS.asphalt;
  ctx.fillRect(0, roadLaneUp.y1, width, roadLaneUp.y2 - roadLaneUp.y1);
  ctx.fillRect(0, roadLaneDown.y1, width, roadLaneDown.y2 - roadLaneDown.y1);

  // Бордюры.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(0, roadLaneUp.y1, width, 2);
  ctx.fillRect(0, roadLaneDown.y2 - 2, width, 2);
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
