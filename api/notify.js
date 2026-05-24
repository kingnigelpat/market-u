/**
 * /api/notify.js — Vercel Serverless Function
 * Sends FCM push notifications to seller devices using FCM HTTP v1 API.
 * Requires FIREBASE_SERVICE_ACCOUNT env var (JSON string of serviceAccountKey.json)
 */

// Minimal JWT + OAuth2 implementation to get FCM access token from service account
// (avoids needing firebase-admin as a bundled serverless dependency)

function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function getAccessToken(serviceAccount) {
    const { createSign } = await import('crypto');

    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    }));

    const signingInput = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccount.private_key, 'base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${signingInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenRes.json();
    return tokenData.access_token;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { fcmTokens, buyerName, productName } = req.body;

    if (!fcmTokens || fcmTokens.length === 0) {
        return res.status(400).json({ error: 'No FCM tokens provided' });
    }

    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountRaw) {
        console.error('FIREBASE_SERVICE_ACCOUNT env var not set');
        return res.status(500).json({ error: 'Server not configured for push notifications' });
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountRaw);
    } catch (e) {
        return res.status(500).json({ error: 'Invalid service account JSON' });
    }

    let accessToken;
    try {
        accessToken = await getAccessToken(serviceAccount);
    } catch (e) {
        console.error('Failed to get FCM access token:', e);
        return res.status(500).json({ error: 'Auth failed' });
    }

    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const results = await Promise.allSettled(
        fcmTokens.map(token =>
            fetch(fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: {
                        token,
                        notification: {
                            title: '🔔 New Interest on Market-U!',
                            body: `${buyerName} is interested in your ${productName}! Open Market-U to contact them.`,
                        },
                        webpush: {
                            notification: {
                                title: '🔔 New Interest on Market-U!',
                                body: `${buyerName} is interested in your ${productName}! Tap to contact them.`,
                                icon: '/icon.png',
                                badge: '/icon.png',
                                vibrate: [200, 100, 200, 100, 200],
                                requireInteraction: true,
                                tag: 'market-u-interest',
                            },
                            fcm_options: {
                                link: '/notifications',
                            },
                        },
                    },
                }),
            }).then(r => r.json())
        )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`Push result: ${succeeded} sent, ${failed} failed`);

    return res.status(200).json({ succeeded, failed });
}
