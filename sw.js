/* 셋포로 오프라인 지원: 앱 화면과 라이브러리를 기기에 저장해 두고, 인터넷이 없을 때 꺼내 씁니다. */
const V = "setporo-v4";
const CORE = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];
const STATIC_HOSTS = ["unpkg.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com", "server.arcgisonline.com"];
const FRESH_HOSTS = ["api.open-meteo.com", "open.er-api.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function put(req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    const copy = res.clone();
    caches.open(V).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}
function networkFirst(req, fallbackKey) {
  return fetch(req).then(r => put(req, r)).catch(() =>
    caches.match(req, { ignoreSearch: !!fallbackKey }).then(r => r || (fallbackKey ? caches.match(fallbackKey) : undefined)).then(r => r || Response.error())
  );
}
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r)));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
      e.respondWith(networkFirst(req, "./index.html"));
    } else {
      e.respondWith(networkFirst(req));
    }
    return;
  }
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) { e.respondWith(cacheFirst(req)); return; }
  if (STATIC_HOSTS.includes(url.hostname)) { e.respondWith(cacheFirst(req)); return; }
  if (FRESH_HOSTS.includes(url.hostname)) { e.respondWith(networkFirst(req)); return; }
});
