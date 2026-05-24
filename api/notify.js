import admin from 'firebase-admin';

// Initialize Firebase Admin once (Vercel keeps functions warm)
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e) {
        console.error('Firebase Admin init failed:', e);
    }
}

export default async function handler(req, res) {
    // Allow CORS from same origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { fcmTokens, buyerName, productName } = req.body;

    if (!fcmTokens || fcmTokens.length === 0) {
        return res.status(400).json({ error: 'No FCM tokens provided' });
    }

    const notification = {
        title: '🔔 New Interest on Market-U!',
        body: `${buyerName} is interested in your ${productName}! Open Market-U to contact them.`,
    };

    const webpush = {
        notification: {
            title: notification.title,
            body: notification.body,
            icon: 'https://market-u.vercel.app/icon.png',
            badge: 'https://market-u.vercel.app/icon.png',
            vibrate: [200, 100, 200, 100, 200],
            requireInteraction: true,
            tag: 'market-u-interest',
        },
        fcmOptions: {
            link: 'https://market-u.vercel.app/notifications',
        },
    };

    // Send to all stored device tokens (laptop + mobile)
    const sendResults = await Promise.allSettled(
        fcmTokens.map(token =>
            admin.messaging().send({
                token,
                notification,
                webpush,
            })
        )
    );

    const succeeded = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').length;

    console.log(`FCM push: ${succeeded} sent, ${failed} failed`);

    return res.status(200).json({ succeeded, failed });
}
