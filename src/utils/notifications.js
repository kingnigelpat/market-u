import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Requests notification permission from the browser.
 * If granted, retrieves the FCM token and saves it to the user's Firestore document.
 * Safe to call multiple times — idempotent.
 *
 * @param {string} userId - The authenticated user's UID
 * @param {object} messagingInstance - The Firebase messaging instance from firebase.js
 */
export async function requestNotificationPermission(userId, messagingInstance) {
    if (!messagingInstance || !userId) return;
    if (!('Notification' in window)) return; // Not supported

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied.');
            return;
        }

        // Register our FCM-compatible service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
        });

        const token = await getToken(messagingInstance, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            // Save FCM token to the seller's Firestore user document
            await updateDoc(doc(db, 'users', userId), { fcmToken: token });
            console.log('FCM token saved for user:', userId);
        }
    } catch (error) {
        console.warn('Error requesting notification permission / FCM token:', error);
    }
}

/**
 * Sets up a foreground message listener.
 * Shows a browser notification if the seller's tab is open and a message arrives.
 *
 * @param {object} messagingInstance - Firebase messaging instance
 * @param {function} onReceive - Optional callback for in-app handling
 */
export function listenForForegroundMessages(messagingInstance, onReceive) {
    if (!messagingInstance) return () => {};
    return onMessage(messagingInstance, (payload) => {
        console.log('[FCM] Foreground message:', payload);
        const { title, body } = payload.notification || {};

        // Show browser notification even when tab is active
        if (Notification.permission === 'granted' && title) {
            new Notification(title, {
                body,
                icon: '/icon.png',
                badge: '/icon.png',
            });
        }

        if (onReceive) onReceive(payload);
    });
}
