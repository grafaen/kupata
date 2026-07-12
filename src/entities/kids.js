import { ZONES, ZEBRA, KIDS, WAVES } from '../config.js';

// Группа детей у зебры. side: 0 — верхний тротуар, 1 — нижний. Состояния:
//   waiting ──(canGo стабильно startDelay)──► crossing (brave=false)
//   waiting ──(терпение = 0)────────────────► crossing (brave=true, идут без canGo)
//   crossing ──(все arrived)──► done ──(doneLinger)──► удаление (isGroupExpired)
//   crossing ──(испуг)──► scattering ──(все дома)──► waiting (терпение полное)
// Координаты детей — центры прямоугольников (см. соглашение в config.js).

const ZEBRA_CENTER_X = (ZEBRA.x1 + ZEBRA.x2) / 2;

export function createKidGroup(side, wave) {
  const count = KIDS.countMin
    + Math.floor(Math.random() * (KIDS.countMax - KIDS.countMin + 1));
  const patienceMax = groupPatience(wave);
  const y = waitY(side);

  const kids = [];
  for (let i = 0; i < count; i++) {
    const homeX = ZEBRA_CENTER_X + (i - (count - 1) / 2) * KIDS.spacing;
    kids.push({
      x: homeX,
      y,
      w: KIDS.w,
      h: KIDS.h,
      homeX,
      homeY: y,
      color: KIDS.colors[i % KIDS.colors.length],
      delay: 0, // стагер старта в гуське, сек
      arrived: false,
    });
  }

  return {
    side,
    state: 'waiting',
    kids,
    patience: patienceMax,
    patienceMax,
    brave: false,
    honked: false, // был ли сигнал за время этого ожидания/перехода (бонус «чисто»)
    goTimer: 0,
    doneTimer: 0,
  };
}

// Возвращает { completed: true } в кадр, когда вся группа дошла до цели.
export function updateKidGroup(group, dt, canGo) {
  switch (group.state) {
    case 'waiting':
      return updateWaiting(group, dt, canGo);
    case 'crossing':
      return updateCrossing(group, dt);
    case 'scattering':
      return updateScattering(group, dt);
    default: // 'done'
      group.doneTimer += dt;
      return { completed: false };
  }
}

function updateWaiting(group, dt, canGo) {
  group.patience = Math.max(0, group.patience - dt);

  if (group.patience === 0) {
    startCrossing(group, true); // смелый идёт сам, остальные за ним
  } else if (canGo) {
    group.goTimer += dt;
    if (group.goTimer >= KIDS.startDelay) startCrossing(group, false);
  } else {
    group.goTimer = 0;
  }
  return { completed: false };
}

function startCrossing(group, brave) {
  group.state = 'crossing';
  group.brave = brave;
  const fileDelay = brave ? KIDS.braveFileDelay : KIDS.fileDelay;
  group.kids.forEach((kid, i) => {
    kid.delay = i * fileDelay;
    kid.arrived = false;
  });
}

function updateCrossing(group, dt) {
  const targetY = waitY(1 - group.side);
  const dirY = group.side === 0 ? 1 : -1;
  let allArrived = true;

  for (const kid of group.kids) {
    if (kid.arrived) continue;
    allArrived = false;

    if (kid.delay > 0) {
      kid.delay -= dt;
      continue;
    }

    kid.y += dirY * KIDS.walkSpeed * dt;
    // Гуськом: x экспоненциально сходится к центру зебры.
    kid.x += (ZEBRA_CENTER_X - kid.x) * Math.min(1, KIDS.xConvergeRate * dt);

    if ((targetY - kid.y) * dirY <= 0) {
      kid.y = targetY;
      kid.arrived = true;
    }
  }

  if (allArrived) {
    group.state = 'done';
    group.doneTimer = 0;
    return { completed: true };
  }
  return { completed: false };
}

// Испуг: вся группа целиком (включая уже дошедших) разбегается на исходный
// тротуар. Вызывается из game.js вместе с −1 лапкой и торможением машин.
export function scareKidGroup(group) {
  if (group.state !== 'crossing') return;
  group.state = 'scattering';
  group.honked = true;
  for (const kid of group.kids) {
    kid.arrived = false;
    // Джиттер, чтобы бежали враскидку, а не строем.
    kid.scatterX = kid.homeX + (Math.random() * 2 - 1) * KIDS.spacing * 0.6;
  }
}

function updateScattering(group, dt) {
  let allHome = true;

  for (const kid of group.kids) {
    const dx = kid.scatterX - kid.x;
    const dy = kid.homeY - kid.y;
    const dist = Math.hypot(dx, dy);
    const step = KIDS.scatterSpeed * dt;

    if (dist <= step) {
      kid.x = kid.scatterX;
      kid.y = kid.homeY;
    } else {
      kid.x += (dx / dist) * step;
      kid.y += (dy / dist) * step;
      allHome = false;
    }
  }

  if (allHome) {
    group.state = 'waiting';
    group.patience = group.patienceMax;
    group.goTimer = 0;
    group.brave = false;
    group.honked = false;
    for (const kid of group.kids) delete kid.scatterX;
  }
  return { completed: false };
}

// Дети, чей прямоугольник пересекает дорогу, — препятствия для машин.
export function kidsOnRoad(group) {
  const roadY1 = ZONES.roadLaneUp.y1;
  const roadY2 = ZONES.roadLaneDown.y2;
  return group.kids.filter(
    (kid) => kid.y + kid.h / 2 > roadY1 && kid.y - kid.h / 2 < roadY2,
  );
}

// Дошедшая группа помахала doneLinger секунд — можно удалять.
export function isGroupExpired(group) {
  return group.state === 'done' && group.doneTimer >= KIDS.doneLinger;
}

// Терпение группы на данной волне: 20 с → 12 с.
function groupPatience(wave) {
  return Math.max(
    WAVES.patienceMin,
    WAVES.patienceStart - (wave - 1) * WAVES.patienceStep,
  );
}

// Точка ожидания: у края дороги, вглубь тротуара на waitOffset.
function waitY(side) {
  return side === 0
    ? ZONES.topSidewalk.y2 - KIDS.waitOffset
    : ZONES.bottomSidewalk.y1 + KIDS.waitOffset;
}
