// Firebase Messaging Service Worker — Market-U
// This file must be named firebase-messaging-sw.js for FCM to find it automatically
// However we register it via our main sw.js as well for PWA caching

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAtG33tU8zfEsaa5knNSnxK3BFlLnDWujc",
  authDomain: "market-u-391e1.firebaseapp.com",
  projectId: "market-u-391e1",
  storageBucket: "market-u-391e1.firebasestorage.app",
  messagingSenderId: "1098102180564",
  appId: "1:1098102180564:web:13971ea3044c183ca14941",
  measurementId: "G-1T03FPDSLQ"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || '🔔 Market-U', {
    body: body || 'You have a new notification',
    icon: icon || '/icon.png',
    badge: '/icon.png',
    tag: 'market-u-interest',
    data: payload.data || {},
  });
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/notifications');
      }
    })
  );
});
