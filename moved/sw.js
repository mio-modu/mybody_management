/* 자폭용 서비스워커.
 *
 * 예전 주소에 설치돼 있던 서비스워커는 캐시에서 옛 앱을 먼저 꺼내 주기 때문에,
 * 안내 페이지를 올려도 그 사람 화면에는 계속 옛 앱이 뜬다.
 * 브라우저는 이동할 때마다 sw.js 가 바뀌었는지 확인하므로, 같은 자리에 이 파일을
 * 올려 두면 다음 접속에서 캐시를 비우고 스스로 등록을 해제한 뒤 화면을 새로 고친다.
 *
 * fetch 핸들러가 없다 — 어떤 요청도 가로채지 않는다. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((c) => c.navigate(c.url));
  })());
});
