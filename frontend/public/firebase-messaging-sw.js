importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAKUjl4HCXuLtTEJMv1skNbdUMJrK9Rz-s",
  authDomain: "taskflow-os-88241.firebaseapp.com",
  projectId: "taskflow-os-88241",
  storageBucket: "taskflow-os-88241.firebasestorage.app",
  messagingSenderId: "778845403901",
  appId: "1:778845403901:web:aba34169a14239c7bd1c94"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/notification-gmark-logo.jpeg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/';
  
  if (data?.type === 'TASK') url = '/dashboard';
  if (data?.type === 'PROJECT') url = '/projects';
  if (data?.type === 'ANNOUNCEMENT') url = '/announcements';

  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
