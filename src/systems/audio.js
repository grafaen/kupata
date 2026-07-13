import { STORAGE } from '../config.js';

// Весь звук — синтез через WebAudio, без внешних файлов (game-design §8):
// «гав» — рык-импульс (пила вниз + шумовой выдох), «биип» — клаксон в 2 тона,
// «ура!» — арпеджио вверх, «ням», джингл волны, фоновый прибой (тихий шум).
// AudioContext создаётся лениво по первому жесту пользователя (unlock).
// game.js звука не знает: он копит события в state.events, main.js передаёт
// их в play() — логика остаётся тестируемой в node.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = readMuted();
  let siren = null; // { osc, lfo, gain } — двухтоновая петля, пока скорая на экране

  function unlock() {
    if (ctx !== null) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    startSurf();
  }

  function setMuted(value) {
    muted = value;
    if (master !== null) master.gain.value = muted ? 0 : 1;
    writeMuted(muted);
  }

  function play(event) {
    if (ctx === null || muted) return;
    const t = ctx.currentTime;
    switch (event.type) {
      case 'bark': return bark(t, event.weak);
      case 'honk': return honk(t);
      case 'yay': return yay(t);
      case 'nyam': return nyam(t);
      case 'wave': return waveJingle(t);
      case 'penalty': return penalty(t);
      case 'pawRegen': return pawRegen(t);
    }
  }

  // Сирена скорой: непрерывная hi-lo (квадратный LFO кидает частоту между
  // двумя тонами). Не событие, а состояние: main.js каждый кадр выводит
  // active из «есть ли скорая на экране и идёт ли игра» — пауза, меню и
  // gameover глушат сирену сами собой. Mute действует через master.
  function setSiren(active) {
    if (ctx === null) return; // до первого жеста звука нет вовсе
    if (active && siren === null) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 770; // центр между 660 и 880
      lfo.type = 'square';
      lfo.frequency.value = 1.4; // переключения hi-lo в секунду
      lfoGain.gain.value = 110; // размах: 770 ± 110
      gain.gain.value = 0.05;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gain).connect(master);
      osc.start();
      lfo.start();
      siren = { osc, lfo, gain };
    } else if (!active && siren !== null) {
      siren.osc.stop();
      siren.lfo.stop();
      siren = null;
    }
  }

  // Штраф (гав по скорой): короткий съезжающий вниз зуммер — «нельзя».
  function penalty(t) {
    tone('square', 320, 180, t, 0.22, 0.14);
  }

  // Вернулась лапка: мягкий колокольчик из двух тонов вверх (тише «Ура!»,
  // которое звучит в тот же момент за сам переход).
  function pawRegen(t) {
    tone('sine', 880, 880, t, 0.12, 0.1);
    tone('sine', 1318, 1318, t + 0.1, 0.22, 0.1);
  }

  // Короткий рык: пила съезжает вниз + выдох белого шума через полосовой фильтр.
  function bark(t, weak) {
    const level = weak ? 0.12 : 0.25;
    tone('sawtooth', weak ? 220 : 150, weak ? 130 : 70, t, 0.12, level);
    noiseBurst(t, 0.08, weak ? 900 : 500, level * 0.8);
  }

  // Клаксон: два тона квадратом, второй ниже (game-design: «биип», 2 тона).
  function honk(t) {
    tone('square', 466, 466, t, 0.14, 0.12);
    tone('square', 370, 370, t + 0.16, 0.18, 0.12);
  }

  // «Ура!»: арпеджио вверх.
  function yay(t) {
    [523, 659, 784, 1047].forEach((freq, i) => {
      tone('triangle', freq, freq, t + i * 0.09, 0.1, 0.14);
    });
  }

  // «Ням»: два низких чавка.
  function nyam(t) {
    tone('triangle', 220, 150, t, 0.09, 0.18);
    tone('triangle', 240, 160, t + 0.12, 0.09, 0.18);
  }

  // Джингл новой волны.
  function waveJingle(t) {
    tone('triangle', 392, 392, t, 0.12, 0.14);
    tone('triangle', 587, 587, t + 0.13, 0.2, 0.14);
  }

  function tone(type, freqFrom, freqTo, t, duration, level) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t);
    if (freqTo !== freqFrom) osc.frequency.exponentialRampToValueAtTime(freqTo, t + duration);
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function noiseBurst(t, duration, filterFreq, level) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
  }

  // Прибой: зацикленный шум через низкий фильтр с медленной волной громкости.
  function startSurf() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = ctx.createGain();
    gain.gain.value = 0.03;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(filter).connect(gain).connect(master);
    src.start();
    lfo.start();
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  return { unlock, play, setSiren, setMuted, isMuted: () => muted };
}

// localStorage может быть недоступен (приватный режим) — тогда без сохранения.
function readMuted() {
  try {
    return localStorage.getItem(STORAGE.muted) === '1';
  } catch {
    return false;
  }
}

function writeMuted(value) {
  try {
    localStorage.setItem(STORAGE.muted, value ? '1' : '0');
  } catch {
    // настройка не сохранится — не критично
  }
}
