const CACHE_NAME = 'shopeemgr-v5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Hapus cache versi lama supaya user tidak terjebak di file versi sebelumnya
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Helper: simpan respons ke cache lewat event.waitUntil supaya penulisan
  // tidak terpotong saat service worker dimatikan; error kuota ditangkap.
  const putInCache = (request, response) => {
    const copy = response.clone();
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.put(request, copy))
        .catch(() => {})
    );
  };

  // Halaman & manifest: NETWORK-FIRST supaya setiap perubahan file (misal ganti
  // STORAGE_KEY pada copy tool) langsung terlihat saat online. Kalau offline,
  // baru jatuh ke cache.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) putInCache(event.request, response);
          return response;
        })
        .catch(() => caches.match(event.request, { cacheName: CACHE_NAME }))
    );
    return;
  }

  // Aset lain (ikon, dll.): cache-first; yang belum ter-cache diambil lalu disimpan
  event.respondWith(
    caches.match(event.request, { cacheName: CACHE_NAME })
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(fetched => {
          if (fetched && fetched.ok) putInCache(event.request, fetched);
          return fetched;
        });
      })
  );
});
