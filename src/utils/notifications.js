import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Requests notification permission from the browser.
 * If granted, retrieves the FCM token and APPENDS it to the user's
 * fcmTokens array in Firestore (supports multiple devices: laptop + mobile).
 *
 * @param {string} userId - The authenticated user's UID
 * @param {object} messagingInstance - The Firebase messaging instance
 */
export async function requestNotificationPermission(userId, messagingInstance) {
    if (!messagingInstance || !userId) return;
    if (!('Notification' in window)) return;

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied.');
            return;
        }

        // Register the FCM-compatible service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
        });

        const token = await getToken(messagingInstance, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            // Use arrayUnion so BOTH laptop and mobile tokens are stored
            // This means the seller gets push on ALL their logged-in devices
            await updateDoc(doc(db, 'users', userId), {
                fcmTokens: arrayUnion(token)
            });
            console.log('FCM token saved for user:', userId);
        }
    } catch (error) {
        console.warn('Error requesting notification permission / FCM token:', error);
    }
}

/**
 * Sends a push notification to the seller via the Vercel serverless function.
 * Fetches seller's FCM tokens from Firestore, then calls /api/notify.
 *
 * @param {string[]} fcmTokens - Array of seller's FCM tokens
 * @param {string} buyerName - Name of the interested buyer
 * @param {string} productName - Name of the product
 */
export async function sendPushNotification(fcmTokens, buyerName, productName) {
    if (!fcmTokens || fcmTokens.length === 0) return;

    try {
        const res = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcmTokens, buyerName, productName }),
        });
        const data = await res.json();
        console.log('Push notification result:', data);
    } catch (e) {
        console.warn('Push notification failed (non-critical):', e);
    }
}

/**
 * Sets up a foreground message listener.
 * Shows a browser notification if the seller's tab is open.
 *
 * @param {object} messagingInstance - Firebase messaging instance
 * @param {function} onReceive - Optional callback for in-app handling
 */
export function listenForForegroundMessages(messagingInstance, onReceive) {
    if (!messagingInstance) return () => {};
    return onMessage(messagingInstance, (payload) => {
        console.log('[FCM] Foreground message:', payload);
        const { title, body } = payload.notification || {};

        if (Notification.permission === 'granted' && title) {
            new Notification(title, {
                body,
                icon: '/icon.png',
                badge: '/icon.png',
                vibrate: [200, 100, 200],
            });
        }

        if (onReceive) onReceive(payload);
    });
}
