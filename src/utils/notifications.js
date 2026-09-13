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

    // iOS only supports web push for INSTALLED PWAs (Add to Home Screen).
    // If we're on iOS Safari (not standalone), skip silently —
    // the IOSInstallBanner component will guide the user to install first.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
        console.log('[FCM] iOS detected but not installed as PWA — skipping notification setup.');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied.');
            return;
        }

        // Reuse an existing active SW registration if available — avoids a forced
        // network update round-trip on every call which added ~300–500ms of latency.
        const existingRegistration = await navigator.serviceWorker.getRegistration('/');
        const registration = existingRegistration ?? await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
        });

        // Only force-update when there is genuinely no active worker yet
        if (!existingRegistration || !existingRegistration.active) {
            await registration.update();
        }

        const token = await getToken(messagingInstance, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            // Save to BOTH fields: fcmToken (old, backward compat) + fcmTokens array (new, multi-device)
            await updateDoc(doc(db, 'users', userId), {
                fcmToken: token,
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
        return data;
    } catch (e) {
        console.warn('Push notification failed (non-critical):', e);
    }
}

/**
 * Plays the notification chime sound.
 * Uses HTMLAudioElement with a fallback to the Web Audio API synthesised tone.
 * Must be called from a user-gesture context OR after the user has interacted
 * with the page at least once (browser autoplay policy).
 */
export function playNotificationSound() {
    try {
        const audio = new Audio('/notification-sound.wav');
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch((err) => {
                // Autoplay blocked — fallback to Web Audio API oscillator chime
                console.warn('[FCM] Audio autoplay blocked, using Web Audio fallback:', err);
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const gainNode = ctx.createGain();
                    gainNode.connect(ctx.destination);

                    const playTone = (freq, startTime, duration) => {
                        const osc = ctx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, startTime);
                        osc.connect(gainNode);
                        gainNode.gain.setValueAtTime(0.4, startTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                        osc.start(startTime);
                        osc.stop(startTime + duration);
                    };

                    const now = ctx.currentTime;
                    playTone(880, now, 0.3);
                    playTone(1100, now + 0.15, 0.3);
                } catch (webAudioErr) {
                    console.warn('[FCM] Web Audio fallback also failed:', webAudioErr);
                }
            });
        }
    } catch (e) {
        console.warn('[FCM] playNotificationSound error:', e);
    }
}

/**
 * Sets up a foreground message listener.
 * Shows a browser notification if the seller's tab is open.
 * Also plays a chime sound so the seller hears it even with the tab focused.
 *
 * @param {object} messagingInstance - Firebase messaging instance
 * @param {function} onReceive - Optional callback for in-app handling
 */
export function listenForForegroundMessages(messagingInstance, onReceive) {
    if (!messagingInstance) return () => {};
    return onMessage(messagingInstance, (payload) => {
        console.log('[FCM] Foreground message:', payload);
        const { title, body } = payload.notification || {};

        // Play chime — foreground notifications are often silent in browsers
        playNotificationSound();

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
