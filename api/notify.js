/**
 * /api/notify.js — Vercel Serverless Function
 * Sends targeted FCM push notifications to seller or buyer devices.
 * Requires Firebase ID token authentication (Authorization: Bearer <token>).
 * Looks up recipient FCM tokens securely on the server so clients do not expose tokens.
 */

import { getFirebaseAdmin, verifyAuth } from './_firebase.js';

// In-memory rate limiter: max 20 notifications per user UID per minute
const _rateLimitMap = new Map();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(uid) {
    const now = Date.now();
    const entry = _rateLimitMap.get(uid);
    if (!entry || now > entry.resetAt) {
        _rateLimitMap.set(uid, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let caller;
    try {
        caller = await verifyAuth(req);
    } catch (authErr) {
        return res.status(authErr.statusCode || 401).json({ error: authErr.message });
    }

    if (isRateLimited(caller.uid)) {
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    let adminApp;
    try {
        adminApp = getFirebaseAdmin();
    } catch (initErr) {
        console.error('[NOTIFY] Firebase Admin init error:', initErr.message);
        return res.status(500).json({ error: 'Server initialization error' });
    }

    const {
        recipientUserId,
        fcmTokens: rawTokens,
        buyerName = 'A user',
        productName = 'your item',
        text = '',
        type = 'interest',
        productId = null,
        link: customLink = null,
    } = req.body || {};

    let targetTokens = [];

    // Mode A: Server looks up recipient tokens (most secure - token is never exposed to client)
    if (recipientUserId && typeof recipientUserId === 'string') {
        try {
            const db = adminApp.firestore();
            const recipientDoc = await db.collection('users').doc(recipientUserId).get();
            if (recipientDoc.exists) {
                const data = recipientDoc.data() || {};
                if (Array.isArray(data.fcmTokens)) {
                    for (const t of data.fcmTokens) {
                        if (typeof t === 'string' && t.trim()) targetTokens.push(t.trim());
                    }
                }
                if (typeof data.fcmToken === 'string' && data.fcmToken.trim()) {
                    targetTokens.push(data.fcmToken.trim());
                }
            }
        } catch (dbErr) {
            console.error('[NOTIFY] Error fetching recipient tokens:', dbErr.message);
            return res.status(500).json({ error: 'Failed to retrieve recipient details' });
        }
    } else if (Array.isArray(rawTokens) && rawTokens.length > 0) {
        // Mode B: Self-test notification (e.g. from Profile page test button)
        // Only allow testing with tokens if caller is sending to their own device (max 5 tokens)
        targetTokens = rawTokens.filter(t => typeof t === 'string' && t.trim()).slice(0, 5);
    }

    targetTokens = [...new Set(targetTokens)];

    if (targetTokens.length === 0) {
        return res.status(200).json({
            succeeded: 0,
            failed: 0,
            message: 'No registered device tokens found for recipient',
        });
    }

    // Build notification content based on type
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'www.marketu.store';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const appOrigin = `${protocol}://${host}`;

    const sanitizedSender = String(buyerName).slice(0, 50).trim();
    const sanitizedProduct = String(productName).slice(0, 80).trim();
    const sanitizedText = String(text).slice(0, 150).trim();

    let title = '🔔 Notification from Market-U';
    let body = `${sanitizedSender} sent you an alert regarding ${sanitizedProduct}`;
    let link = `${appOrigin}/notifications`;

    if (customLink && typeof customLink === 'string' && customLink.trim()) {
        const trimmed = customLink.trim();
        link = trimmed.startsWith('http') ? trimmed : `${appOrigin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    } else if (type === 'chat_message') {
        title = `💬 Message from ${sanitizedSender}`;
        body = sanitizedText ? `${sanitizedSender}: "${sanitizedText}"` : `New message regarding ${sanitizedProduct}`;
        link = productId ? `${appOrigin}/product/${encodeURIComponent(productId)}?chat=true` : `${appOrigin}/messages`;
    } else if (type === 'interest') {
        title = `🔔 New Interest on Market-U!`;
        body = `${sanitizedSender} is interested in your ${sanitizedProduct}! Tap to contact them.`;
        link = `${appOrigin}/notifications`;
    } else if (type === 'test') {
        title = `🔔 Test Notification`;
        body = `Push notifications are active and working on your device!`;
        link = `${appOrigin}/profile`;
    }

    try {
        const response = await adminApp.messaging().sendEachForMulticast({
            tokens: targetTokens,
            notification: {
                title,
                body,
            },
            android: {
                priority: 'high',
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                    TTL: '86400',
                },
                notification: {
                    title,
                    body,
                    icon: `${appOrigin}/icon.png`,
                    badge: `${appOrigin}/icon.png`,
                    tag: `market-u-notif-${Date.now()}`,
                },
                fcmOptions: {
                    link,
                },
                data: {
                    url: link,
                    type,
                },
            },
        });

        console.log(`[NOTIFY] Sent (${type}) to ${response.successCount} devices (${response.failureCount} failed)`);
        return res.status(200).json({
            succeeded: response.successCount,
            failed: response.failureCount,
            errors: response.responses.filter(r => !r.success).map(r => r.error?.message || 'Delivery error'),
        });
    } catch (sendErr) {
        console.error('[NOTIFY] Multicast error:', sendErr);
        return res.status(500).json({ error: 'Failed to dispatch push notification' });
    }
}
