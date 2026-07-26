import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.apiKey) {
    document.body.innerHTML = `
    <div style="padding: 2rem; text-align: center; font-family: sans-serif; background: #fff; min-height: 100vh; color: #333;">
      <h1 style="color: #ef4444; margin-bottom: 1rem;">Configuration Missing</h1>
      <p>Please add your Environment Variables (Firebase/Cloudinary) to the project settings (.env) and restart the dev server.</p>
    </div>
    `;
    throw new Error("Missing Firebase API Key. Please configure your .env file.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let analytics;
try {
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
    }
} catch (e) {
    console.error("Firebase Analytics failed to initialize:", e);
}

// FCM Messaging — gracefully skip in unsupported environments (e.g. Safari without SW)
let messaging = null;
(async () => {
    try {
        const supported = await isSupported();
        if (supported) {
            messaging = getMessaging(app);
        }
    } catch (e) {
        console.warn("Firebase Messaging not supported in this environment:", e);
    }
})();

export { analytics, messaging };
export default app;
