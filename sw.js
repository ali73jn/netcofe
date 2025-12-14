
const CACHE_NAME = 'netcofe-v1';
const ASSETS = [
  './',
  './index.html',
  './dashboard.css',
  './dashboard.js',
  './icons/default_icon.png',
  './icons/folder.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
