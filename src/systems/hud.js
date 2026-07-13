import { WORLD, GAME, HUD, ENERGY } from '../config.js';
import { STRINGS } from './strings.js';

// HUD рисуется на canvas последним слоем: лапки слева, очки+волна по центру,
// энергия лая справа, тост под ними. Mute — M4.
export function drawHud(ctx, state) {
  ctx.save();
  ctx.font = HUD.font;
  ctx.fillStyle = HUD.color;
  ctx.textBaseline = 'top';

  for (let i = 0; i < GAME.paws; i++) {
    ctx.globalAlpha = i < state.paws ? 1 : 0.25;
    ctx.fillText('🐾', HUD.margin + i * 30, HUD.margin);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillText(
    STRINGS.hud.scoreWave(state.score, state.wave),
    WORLD.width / 2,
    HUD.margin,
  );

  drawEnergyBar(ctx, state.dog, state.time);

  if (state.toast !== null) {
    const t = state.toast.age / state.toast.duration;
    // Быстрый fade-in, ровное плато, плавный fade-out.
    ctx.globalAlpha = Math.max(0, Math.min(t / 0.15, 1, (1 - t) / 0.3));
    ctx.font = HUD.toastFont;
    ctx.fillStyle = HUD.color; // drawEnergyBar перекрасил заливку
    ctx.textAlign = 'center';
    ctx.fillText(toastText(state.toast), WORLD.width / 2, HUD.toastY);
  }

  ctx.restore();
}

function toastText(toast) {
  if (toast.kind === 'stuffed') return STRINGS.toast.stuffed;
  const { flavors } = STRINGS.toast;
  const flavor = flavors[(toast.wave - 2) % flavors.length];
  return STRINGS.toast.wave(toast.wave, flavor);
}

// Шкала энергии: косточка + полоса; на слабом лае заливка краснеет и
// пульсирует — энергия теперь жизнь, ноль означает game over.
function drawEnergyBar(ctx, dog, time) {
  const bar = HUD.energy;
  const x = WORLD.width - bar.rightOffset - bar.width;
  const y = HUD.margin + 4;

  ctx.textAlign = 'right';
  ctx.fillText(STRINGS.fx.energy, x - 6, HUD.margin);

  ctx.fillStyle = bar.bg;
  ctx.fillRect(x, y, bar.width, bar.height);

  const low = dog.energy < ENERGY.weakThreshold;
  if (low) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * Math.PI * 2 * bar.pulseHz);
  }
  ctx.fillStyle = low ? bar.lowColor : bar.color;
  ctx.fillRect(x, y, bar.width * (dog.energy / ENERGY.max), bar.height);
  ctx.globalAlpha = 1;
}
