import { STORAGE } from '../config.js';

// Словарь ka/ru/en (game-design §9). Код везде читает живой объект STRINGS —
// setLanguage подменяет его содержимое через Object.assign, поэтому canvas-
// строки (HUD, пузыри) переключаются мгновенно: они читаются на каждом кадре.
// Строки-функции остаются функциями в каждом языке — порядок слов разный.
// Все грузинские строки до релиза должны быть проверены носителем (M6,
// impl-plan §6) — помечены TODO(ka).

const ru = {
  ui: {
    title: 'Купата — герой Батуми',
    play: 'Играть',
    howto: 'Как играть',
    back: 'Назад',
    paused: 'Пауза',
    resume: 'Продолжить',
    restart: 'Заново',
    toMenu: 'В меню',
    bark: 'ГАВ!',
    gameoverTitle: 'Купата устал…', // конец по лапкам
    gameoverTitleEnergy: 'Купата выдохся…', // конец по энергии (гав на нуле)
    score: 'Очки',
    best: 'Рекорд',
    newBest: 'Новый рекорд!',
    kidsCrossed: (n) => `Дети перешли дорогу: ${n}`,
    khachapuriEaten: (n) => `Съедено хачапури: ${n}`,
    again: 'Ещё раз',
    about: 'О Купате',
    github: 'Исходники и PR — на GitHub',
  },
  about: {
    p1: 'Купата — настоящий пёс, живший у батумского бульвара. Каждый день он выбегал к пешеходному переходу, лаял на машины и провожал детей из детского сада через дорогу — как настоящий регулировщик.',
    p2: 'В 2020 году видео с ним облетело интернет, и Купата стал символом Батуми: мэрия подарила ему именную будку «Народный выбор», на стене дома появился мурал с его портретом, а туристы специально приезжали с ним познакомиться.',
    cartoon: 'Посмотреть мультфильм о Купате ▶',
    memory: 'Светлой памяти Купаты (2014–2023)',
    sources: 'Источники:',
  },
  howto: {
    goal: 'Останавливай машины лаем, чтобы дети перешли дорогу. Испуганные дети — минус лапка.',
    move: 'Движение — стрелки / WASD или джойстик.',
    bark: 'Гав — пробел или кнопка «ГАВ!». Действует только на приближающиеся машины.',
    energy: 'Лай тратит энергию, хачапури её восполняет. Энергия на нуле — конец игры.',
    ambulance: 'Скорую не облаивай — штраф. Дети пропустят её сами.',
    pause: 'Пауза — P или Esc.',
  },
  hud: {
    scoreWave: (score, wave) => `${score} · Волна ${wave}`,
  },
  toast: {
    wave: (n, flavor) => `Волна ${n} — ${flavor}`,
    // Подписи циклятся по номеру волны.
    flavors: [
      'час пик на Руставели!',
      'все едут к морю!',
      'туристы у башни Алфавита!',
      'вечер на Приморском бульваре!',
    ],
    stuffed: 'Купата объелся!',
  },
  fx: {
    honk: 'БИИП!',
    impatient: 'Би-би?', // такси вот-вот сорвётся
    khachapuriCall: 'Гамарджоба! Хачапури!',
    bark: 'Гав!',
    oy: 'Ой!',
    yay: 'Ура!',
    scare: '!',
    stuffed: '💤',
    shrug: '🤷',
    heart: '💖',
    energy: '🦴',
  },
};

const en = {
  ui: {
    title: 'Kupata — Hero of Batumi',
    play: 'Play',
    howto: 'How to play',
    back: 'Back',
    paused: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    toMenu: 'Menu',
    bark: 'WOOF!',
    gameoverTitle: 'Kupata is tired…',
    gameoverTitleEnergy: 'Kupata is out of breath…',
    score: 'Score',
    best: 'Best',
    newBest: 'New best!',
    kidsCrossed: (n) => `Kids crossed the road: ${n}`,
    khachapuriEaten: (n) => `Khachapuri eaten: ${n}`,
    again: 'Play again',
    about: 'About Kupata',
    github: 'Source & PRs on GitHub',
  },
  about: {
    p1: 'Kupata was a real dog who lived by the Batumi seaside boulevard. Every day he ran out to the pedestrian crossing, barked at the cars and walked kindergarten kids across the road — a true crossing guard.',
    p2: 'In 2020 a video of him went viral, and Kupata became a symbol of Batumi: the city gave him a personal doghouse with a “People’s Choice” plaque, a mural with his portrait appeared on a nearby wall, and tourists came looking for him.',
    cartoon: 'Watch the animated short about Kupata ▶',
    memory: 'In loving memory of Kupata (2014–2023)',
    sources: 'Sources:',
  },
  howto: {
    goal: 'Bark to stop the cars so the kids can cross. Scared kids cost a paw.',
    move: 'Move — arrows / WASD or the joystick.',
    bark: 'Bark — Space or the WOOF! button. Only approaching cars react.',
    energy: 'Barking drains energy, khachapuri restores it. Zero energy ends the game.',
    ambulance: 'Never bark at the ambulance — penalty. The kids will let it pass.',
    pause: 'Pause — P or Esc.',
  },
  hud: {
    scoreWave: (score, wave) => `${score} · Wave ${wave}`,
  },
  toast: {
    wave: (n, flavor) => `Wave ${n} — ${flavor}`,
    flavors: [
      'rush hour on Rustaveli!',
      'everyone heads to the sea!',
      'tourists at the Alphabet Tower!',
      'evening on the Boulevard!',
    ],
    stuffed: 'Kupata is stuffed!',
  },
  fx: {
    honk: 'BEEP!',
    impatient: 'Beep-beep?',
    khachapuriCall: 'Gamarjoba! Khachapuri!',
    bark: 'Woof!',
    oy: 'Ouch!',
    yay: 'Yay!',
    scare: '!',
    stuffed: '💤',
    shrug: '🤷',
    heart: '💖',
    energy: '🦴',
  },
};

// TODO(ka): все грузинские строки проверить носителем перед релизом (M6).
const ka = {
  ui: {
    title: 'კუპატა — ბათუმის გმირი',
    play: 'თამაში',
    howto: 'როგორ ვითამაშო',
    back: 'უკან',
    paused: 'პაუზა',
    resume: 'გაგრძელება',
    restart: 'თავიდან',
    toMenu: 'მენიუ',
    bark: 'ჰავ!',
    gameoverTitle: 'კუპატა დაიღალა…',
    gameoverTitleEnergy: 'კუპატას სული გაუვიდა…',
    score: 'ქულები',
    best: 'რეკორდი',
    newBest: 'ახალი რეკორდი!',
    kidsCrossed: (n) => `ბავშვებმა გზა გადაკვეთეს: ${n}`,
    khachapuriEaten: (n) => `შეჭმული ხაჭაპური: ${n}`,
    again: 'კიდევ ერთხელ',
    about: 'კუპატას შესახებ',
    github: 'წყარო კოდი და PR — GitHub-ზე',
  },
  about: {
    p1: 'კუპატა ნამდვილი ძაღლი იყო, ბათუმის ბულვართან ცხოვრობდა. ყოველდღე გარბოდა ზებრასთან, უყეფდა მანქანებს და საბავშვო ბაღის ბავშვებს გზაზე გადაჰყავდა — ნამდვილი რეგულირებელივით.',
    p2: '2020 წელს მისი ვიდეო ინტერნეტში გავრცელდა და კუპატა ბათუმის სიმბოლოდ იქცა: მერიამ საკუთარი ჯიხური აჩუქა წარწერით „ხალხის რჩეული“, კედელზე მისი პორტრეტიანი მურალი გაჩნდა, ტურისტები კი სპეციალურად ეძებდნენ.',
    cartoon: 'ნახე ანიმაციური ფილმი კუპატაზე ▶',
    memory: 'კუპატას ნათელ ხსოვნას (2014–2023)',
    sources: 'წყაროები:',
  },
  howto: {
    goal: 'გააჩერე მანქანები ყეფვით, რომ ბავშვებმა გზა გადაკვეთონ. შეშინებული ბავშვები — მინუს თათი.',
    move: 'მოძრაობა — ისრები / WASD ან ჯოისტიკი.',
    bark: 'ყეფა — Space ან ღილაკი «ჰავ!». მოქმედებს მხოლოდ მოახლოებულ მანქანებზე.',
    energy: 'ყეფა ხარჯავს ენერგიას, ხაჭაპური აღადგენს. ნულ ენერგიაზე თამაში მთავრდება.',
    ambulance: 'სასწრაფოს ნუ უყეფებ — ჯარიმაა. ბავშვები თვითონ გაატარებენ.',
    pause: 'პაუზა — P ან Esc.',
  },
  hud: {
    scoreWave: (score, wave) => `${score} · ტალღა ${wave}`,
  },
  toast: {
    wave: (n, flavor) => `ტალღა ${n} — ${flavor}`,
    flavors: [
      'პიკის საათი რუსთაველზე!',
      'ყველა ზღვისკენ მიდის!',
      'ტურისტები ანბანის კოშკთან!',
      'საღამო ბულვარზე!',
    ],
    stuffed: 'კუპატამ გადაჭამა!',
  },
  fx: {
    honk: 'ბიიპ!',
    impatient: 'ბი-ბი?',
    khachapuriCall: 'გამარჯობა! ხაჭაპური!',
    bark: 'ჰავ!',
    oy: 'ვაი!',
    yay: 'ვაშა!',
    scare: '!',
    stuffed: '💤',
    shrug: '🤷',
    heart: '💖',
    energy: '🦴',
  },
};

export const DICTS = { ka, ru, en };
export const LANGUAGES = ['ka', 'ru', 'en'];

// Живой объект: содержимое подменяется setLanguage, ссылки не протухают.
export const STRINGS = {};

let current = null;

export function currentLanguage() {
  return current;
}

export function setLanguage(code) {
  if (!DICTS[code]) code = 'en';
  current = code;
  Object.assign(STRINGS, DICTS[code]);
  writeLang(code);
  // В node (smoke-тесты) документа нет — там язык только в памяти.
  if (typeof document !== 'undefined') {
    document.documentElement.lang = code;
    document.title = STRINGS.ui.title;
  }
}

// Сохранённый выбор → язык браузера → английский.
export function detectLanguage() {
  const saved = readLang();
  if (saved !== null && DICTS[saved]) return saved;

  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  const prefix = nav.slice(0, 2).toLowerCase();
  return DICTS[prefix] ? prefix : 'en';
}

// localStorage может быть недоступен (приватный режим) — тогда без сохранения.
function readLang() {
  try {
    return localStorage.getItem(STORAGE.lang);
  } catch {
    return null;
  }
}

function writeLang(code) {
  try {
    localStorage.setItem(STORAGE.lang, code);
  } catch {
    // выбор не сохранится — не критично
  }
}

// Самоинициализация при загрузке модуля: STRINGS никогда не бывает пустым.
setLanguage(detectLanguage());
