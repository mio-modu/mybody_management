/* 오프라인 캐시 — 앱 셸은 캐시 우선, 그 외는 네트워크 우선 */
const VERSION = 'mybody-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/config.js',
  './js/store.js',
  './js/utils.js',
  './js/ui.js',
  './js/chart.js',
  './js/analysis.js',
  './js/protocol.js',
  './js/checkin.js',
  './js/rewards.js',
  './js/profile.js',
  './js/labparse.js',
  './js/install.js',
  './js/views/summary.js',
  './js/views/onboard.js',
  './js/views/today.js',
  './js/views/weight.js',
  './js/views/glucose.js',
  './js/views/pain.js',
  './js/views/labs.js',
  './js/views/report.js',
  './js/views/settings.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const net = fetch(req).then(async (res) => {
      if (res && res.ok) {
        const c = await caches.open(VERSION);
        c.put(req, res.clone());
      }
      return res;
    }).catch(() => null);
    if (cached) { net.catch(() => {}); return cached; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') {
      return (await caches.match('./index.html')) || new Response('오프라인입니다.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return new Response('', { status: 504 });
  })());
});
