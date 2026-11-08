// Service Worker para RifaExpress
const CACHE_NAME = 'rifa-express-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Requisito mínimo para que la app sea considerada instalable por los navegadores
  event.respondWith(fetch(event.request));
});
