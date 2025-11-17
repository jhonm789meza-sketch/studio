
// This is a basic service worker file.

// It's recommended to use a tool like Workbox for more complex caching strategies.
// For now, this service worker will just handle push notifications.

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.notification.title || 'RifaExpress';
  const options = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      url: payload.fcmOptions.link
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  if (urlToOpen) {
    event.waitUntil(clients.openWindow(urlToOpen));
  }
});
