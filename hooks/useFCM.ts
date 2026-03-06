'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '@/lib/firebase';
import { api } from '@/lib/api-client';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function useFCM() {
    const tokenRegistered = useRef(false);

    useEffect(() => {
        if (tokenRegistered.current) return;

        if (typeof window === 'undefined' || !('Notification' in window)) return;

        const initFCM = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;

                let swRegistration: ServiceWorkerRegistration | undefined;
                if ('serviceWorker' in navigator) {
                    swRegistration = await navigator.serviceWorker.register(
                        '/firebase-messaging-sw.js',
                        { scope: '/' }
                    );
                }

                const messagingInstance = getFirebaseMessaging();
                if (!messagingInstance) return;

                const tokenOptions: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};
                if (VAPID_KEY) tokenOptions.vapidKey = VAPID_KEY;
                if (swRegistration) tokenOptions.serviceWorkerRegistration = swRegistration;

                const fcmToken = await getToken(messagingInstance, tokenOptions);
                if (!fcmToken) return;

                await api.registerFCMToken(fcmToken);
                tokenRegistered.current = true;

                // Écouter les messages en foreground
                onMessage(messagingInstance, (payload) => {
                    const title = payload.notification?.title || 'Nouvelle notification';
                    const body = payload.notification?.body || '';

                    // Afficher un toast dans l'app
                    window.dispatchEvent(
                        new CustomEvent('pharma:toast', {
                            detail: { message: `${title}${body ? ' — ' + body : ''}`, type: 'info' },
                        })
                    );

                    // Notification native OS
                    if (Notification.permission === 'granted') {
                        new Notification(title, { body, icon: '/logo.png' });
                    }
                });
            } catch (error) {
                console.error('[FCM] Erreur initialisation:', error);
            }
        };

        const accessToken = localStorage.getItem('access_token');
        if (accessToken) initFCM();
    }, []);
}
