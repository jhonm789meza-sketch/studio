// This is a basic service worker
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  // You can add pre-caching logic here if needed
});

self.addEventListener('fetch', event => {
  // This basic fetch handler allows the app to be detected as a PWA
  // For a real offline experience, you would implement caching strategies here
  event.respondWith(fetch(event.request));
});
