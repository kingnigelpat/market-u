import { getToken, onMessage } from 'firebase/messaging';
import { getInstallations, getToken as getInstallationsToken, deleteInstallations } from 'firebase/installations';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BNyeNx7BCbygob2RSXQ4a_69vbOZryrQh0WH0CEN-k51xzEJ0iQsE-MwtKoqmbJF0oW5u1jCNqe-SsbTlAnxnsE';

/**
 * Actively clears Firebase IndexedDB stores so that stale or rejected installation
 * auth tokens cannot be reused by the SDK. This clears the stores directly without
 * getting blocked by existing open database connections.
 */
async function clearFirebaseIndexedDBCaches() {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    const clearStore = (dbName, storeName) => new Promise((resolve) => {
        try {
            const req = window.indexedDB.open(dbName);
            req.onsuccess = () => {
                const idb = req.result;
                try {
                    if (idb.objectStoreNames.contains(storeName)) {
                        const tx = idb.transaction(storeName, 'readwrite');
                        tx.objectStore(storeName).clear();
                        tx.oncomplete = () => { idb.close(); resolve(); };
                        tx.onerror = () => { idb.close(); resolve(); };
                    } else {
                        idb.close();
                        resolve();
                    }
                } catch {
                    idb.close();
                    resolve();
                }
            };
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
        } catch {
            resolve();
        }
    });

    await Promise.allSettled([
        clearStore('firebase-installations-database', 'firebase-installations-store'),
        clearStore('firebase-messaging-database', 'firebase-messaging-store'),
        clearStore('firebase-messaging-database', 'firebase-messaging-fid-registration-store'),
    ]);
}

/**
 * Safely fetches an FCM token, automatically recovering if the client has a stale
 * or desynchronized Firebase Installations auth token in IndexedDB.
 */
export async function getOrRefreshFcmToken(messagingInstance, registration) {
    if (!messagingInstance) return null;
    const vapidKey = VAPID_KEY;

    let swReg = registration;
    if (!swReg && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        swReg = (await navigator.serviceWorker.getRegistration('/')) ||
                (await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }));
    }

    try {
        return await getToken(messagingInstance, {
            vapidKey,
            serviceWorkerRegistration: swReg,
        });
    } catch (err) {
        const errMsg = String(err?.message || '');
        const isAuthCredentialError =
            errMsg.includes('token-subscribe-failed') ||
            errMsg.includes('authentication credential') ||
            errMsg.includes('OAuth 2') ||
            err?.code === 'messaging/token-subscribe-failed';

        if (isAuthCredentialError) {
            console.warn('[FCM] Stale installation credentials detected in browser. Resetting installation cache and retrying...', err);
            
            try {
                if (messagingInstance.app) {
                    const installations = getInstallations(messagingInstance.app);
                    // Force refresh token from Google server (removes bad local cache if 401)
                    await getInstallationsToken(installations, true).catch(() => {});
                    await deleteInstallations(installations).catch(() => {});
                }
            } catch (e) {
                console.warn('[FCM] installations reset warning:', e);
            }

            // Purge IndexedDB records directly so Firebase starts fresh
            await clearFirebaseIndexedDBCaches();

            // Retry token retrieval with clean installation state
            return await getToken(messagingInstance, {
                vapidKey,
                serviceWorkerRegistration: swReg,
            });
        }
        throw err;
    }
}

/**
 * Requests notification permission from the browser.
 * If granted, retrieves the FCM token and APPENDS it to the user's
 * fcmTokens array in Firestore (supports multiple devices: laptop + mobile).
 *
 * @param {string} userId - The authenticated user's UID
 * @param {object} messagingInstance - The Firebase messaging instance
 */
export async function requestNotificationPermission(userId, messagingInstance) {
    if (!messagingInstance || !userId) return null;
    if (!('Notification' in window)) return null;

    // iOS only supports web push for INSTALLED PWAs (Add to Home Screen).
    // If we're on iOS Safari (not standalone), skip silently —
    // the IOSInstallBanner component will guide the user to install first.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
        console.log('[FCM] iOS detected but not installed as PWA — skipping notification setup.');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied.');
            return null;
        }

        // Reuse an existing active SW registration if available — avoids a forced
        // network update round-trip on every call which added ~300–500ms of latency.
        let registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) {
            registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            });
        }

        if (navigator.serviceWorker.ready) {
            try {
                const readyReg = await navigator.serviceWorker.ready;
                if (readyReg) registration = readyReg;
            } catch {
                // Ignore service worker ready resolution error
            }
        }

        const token = await getOrRefreshFcmToken(messagingInstance, registration);

        if (token) {
            // Save to BOTH fields: fcmToken (old, backward compat) + fcmTokens array (new, multi-device)
            await updateDoc(doc(db, 'users', userId), {
                fcmToken: token,
                fcmTokens: arrayUnion(token)
            });
            console.log('FCM token saved for user:', userId);
            return token;
        }
    } catch (error) {
        console.warn('Error requesting notification permission / FCM token:', error);
        throw error;
    }
}

/**
 * Sends a push notification via the Vercel serverless function /api/notify.
 * Authenticated with Firebase ID token.
 *
 * Can be called with:
 *   sendPushNotification({ recipientUserId, type, buyerName, productName, text, productId, fcmTokens })
 * or legacy:
 *   sendPushNotification(fcmTokens, buyerName, productName)
 */
export async function sendPushNotification(arg1, arg2, arg3) {
    const payload = (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1))
        ? { ...arg1 }
        : {
            fcmTokens: arg1,
            buyerName: arg2,
            productName: arg3,
            type: 'interest',
        };

    if (!payload.recipientUserId && (!payload.fcmTokens || payload.fcmTokens.length === 0)) {
        return;
    }

    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.warn('[FCM] Cannot send push notification: User not signed in.');
            return;
        }

        const idToken = await currentUser.getIdToken();
        const res = await fetch('/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify(payload),
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
