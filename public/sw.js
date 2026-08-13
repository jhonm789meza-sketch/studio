/**
 * RIFA⚡ EXPRESS - Service Worker para habilitar la instalación (PWA)
 */
const CACHE_NAME = 'rifa-express-v1';

// Instalación inmediata del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Toma el control de las pestañas abiertas inmediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Manejo de peticiones (Network First con fallback a caché si fuera necesario)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
