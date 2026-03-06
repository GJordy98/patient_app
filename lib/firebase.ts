import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: 'AIzaSyDttvXdza5YXxz84r-5BIfcvy7Xhbvmb-Y',
    authDomain: 'e-dr-pharma-fcm.firebaseapp.com',
    projectId: 'e-dr-pharma-fcm',
    storageBucket: 'e-dr-pharma-fcm.firebasestorage.app',
    messagingSenderId: '42167148530',
    appId: '1:42167148530:web:e9fa630f803fa0469c156b',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

export function getFirebaseMessaging(): Messaging | null {
    if (typeof window === 'undefined') return null;
    if (!messaging) {
        try {
            messaging = getMessaging(app);
        } catch (err) {
            console.error('[Firebase] Erreur initialisation Messaging:', err);
            return null;
        }
    }
    return messaging;
}

export { app };
