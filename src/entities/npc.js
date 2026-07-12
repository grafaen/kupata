import { WORLD, ZONES, ZEBRA, NPC } from '../config.js';

// Житель с хачапури: x/y — центр прямоугольника (см. соглашение в config.js).
// Состояния:
// - 'calling' — стоит и зовёт; Купата вплотную → съедено (game.js убирает жителя);
// - 'leaving' — «пожимает плечами» shrugDuration, затем isNpcGone → удаление.
export function createNpc(kind) {
  const side = Math.random() < 0.5 ? 0 : 1;
  const zone = side === 0 ? ZONES.topSidewalk : ZONES.bottomSidewalk;

  return {
    kind, // 'nino' | 'gogi'
    x: randomNpcX(),
    y: (zone.y1 + zone.y2) / 2,
    w: NPC.w,
    h: NPC.h,
    side,
    state: 'calling', // 'calling' | 'leaving'
    timer: 0,
  };
}

export function updateNpc(npc, dt) {
  npc.timer += dt;
  if (npc.state === 'calling' && npc.timer >= NPC.ignoreDuration) {
    npc.state = 'leaving';
    npc.timer = 0;
  }
}

export function isNpcGone(npc) {
  return npc.state === 'leaving' && npc.timer >= NPC.shrugDuration;
}

// Купата «вплотную»: прямоугольники с зазором краёв не больше eatGap
// (дистанции — по краям, см. соглашение). Чистый триггер, коллизий нет.
export function canEat(npc, dog) {
  return npc.state === 'calling'
    && Math.abs(dog.x - npc.x) <= (dog.w + npc.w) / 2 + NPC.eatGap
    && Math.abs(dog.y - npc.y) <= (dog.h + npc.h) / 2 + NPC.eatGap;
}

// Случайный x в сегментах тротуара вне полосы зебры: не налезает на ждущих
// детей и вынуждает Купату отбегать от перехода (риск/награда).
function randomNpcX() {
  const segment = Math.random() < 0.5
    ? [NPC.edgeMargin, ZEBRA.x1 - NPC.zebraGap]
    : [ZEBRA.x2 + NPC.zebraGap, WORLD.width - NPC.edgeMargin];
  return segment[0] + Math.random() * (segment[1] - segment[0]);
}
