import { WORLD, GAME, HUD, WAVES } from '../config.js';
import { STRINGS } from './strings.js';

// HUD рисуется на canvas последним слоем: лапки слева, очки+волна по центру,
// тост волны под ними. Энергия лая — M3, mute — M4.
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

  if (state.toast !== null) {
    const t = state.toast.age / WAVES.toastDuration;
    // Быстрый fade-in, ровное плато, плавный fade-out.
    ctx.globalAlpha = Math.max(0, Math.min(t / 0.15, 1, (1 - t) / 0.3));
    ctx.font = HUD.toastFont;
    const { flavors } = STRINGS.toast;
    const flavor = flavors[(state.toast.wave - 2) % flavors.length];
    ctx.fillText(
      STRINGS.toast.wave(state.toast.wave, flavor),
      WORLD.width / 2,
      HUD.toastY,
    );
  }

  ctx.restore();
}
