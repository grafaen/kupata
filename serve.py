#!/usr/bin/env python3
"""Dev-сервер без кэша: как `python3 -m http.server 8000`, но каждый ответ
идёт с Cache-Control: no-store — браузер всегда берёт свежие ES-модули и
спрайты, смесь «старый render.js + новый dog.js» из кэша невозможна.

Только для локальной разработки: запусти `python3 serve.py` в корне репо и
открой http://localhost:8000. Игре и деплою не нужен (GitHub Pages шлёт
свои заголовки кэширования)."""
import http.server


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    http.server.test(HandlerClass=NoCacheHandler, port=8000)
