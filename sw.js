const CACHE_NAME = 'scenthouse-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/admin.js'
];

// Ինստալյացիա և ֆայլերի քեշավորում
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Ֆայլերը վերցնելու տրամաբանությունը
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
