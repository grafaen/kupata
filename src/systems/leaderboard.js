// Клиент таблицы рекордов (Cloudflare Worker + KV, config.API.base).
// Обе функции НИКОГДА не кидают и возвращают null при ЛЮБОЙ ошибке (офлайн,
// таймаут, не-200, битый JSON) — по образцу readBest() из main.js: недоступный
// API не должен ломать игру ни в одном месте. Пустой API.base → фича выключена.

import { API } from '../config.js';

async function request(path, options) {
  if (!API.base) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API.timeoutMs);
  try {
    const res = await fetch(API.base + path, { ...options, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // офлайн, таймаут (abort), битый JSON — тихо гасим
  } finally {
    clearTimeout(timer);
  }
}

// Топ-N рекордов → массив записей {name, score, wave, ts} или null при ошибке.
export async function fetchTop(n) {
  const data = await request(`/top?n=${n}`, { method: 'GET' });
  return data && Array.isArray(data.top) ? data.top : null;
}

// Отправка результата → {ok, rank, top} или null при ошибке.
export async function submitScore({ name, score, wave, crossings }) {
  return request('/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score, wave, crossings }),
  });
}
