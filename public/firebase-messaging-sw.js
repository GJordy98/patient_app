importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: 'AIzaSyDttvXdza5YXxz84r-5BIfcvy7Xhbvmb-Y',
    authDomain: 'e-dr-pharma-fcm.firebaseapp.com',
    projectId: 'e-dr-pharma-fcm',
    storageBucket: 'e-dr-pharma-fcm.firebasestorage.app',
    messagingSenderId: '42167148530',
    appId: '1:42167148530:web:e9fa630f803fa0469c156b',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Nouvelle notification';
    const body = payload.notification?.body || '';

    self.registration.showNotification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        data: payload.data || {},
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow('/');
        })
    );
});
