// 홍짱 사주 앱: 오프라인용 서비스 워커 (2판)
// - 앱 파일: 인터넷이 되면 항상 새 파일을 먼저 받고, 안 될 때만 저장해 둔 화면을 보여 줘요.
// - 글꼴·관상손금 인식 도구: 한 번 받은 것은 저장해 두고 다음부터 바로 꺼내 써요(오프라인에서도).
const CACHE = 'hongjjang-saju-v2';
const ASSETS = 'hongjjang-assets-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.ico', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 한 번 받으면 바뀌지 않는 바깥 파일 (글꼴, 관상·손금 인식 도구)
function isStatic(url) {
  return /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url) ||
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@/.test(url) ||
    /^https:\/\/storage\.googleapis\.com\/mediapipe-models\//.test(url);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (isStatic(req.url)) {
    // 저장된 것이 있으면 바로, 없으면 받아서 저장
    e.respondWith(
      caches.open(ASSETS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => {});
        return res;
      })))
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // 카카오·구글 로그인 등은 건드리지 않아요

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : null))
          .then((r) => r || Response.error())
      )
  );
});
