/**
 * /api/notify-new-listing.js — Vercel Serverless Function
 *
 * Broadcasts a push notification to buyers when a verified new product is listed on Market-U.
 * Requires Firebase ID token authentication (Authorization: Bearer <token>).
 * Validates product ownership from Firestore to prevent forged broadcasts.
 * Excludes the seller's own device tokens so they do not receive an alert for their own listing.
 */

import { getFirebaseAdmin, verifyAuth } from './_firebase.js';

// Rate limiter — max 5 broadcasts per user UID per 10 minutes
const _rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

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

function buildMessage(productTitle, sellerName, category) {
    const emojiMap = {
        'Electronics': '📱',
        'Fashion': '👗',
        'Health & Beauty': '💄',
        'Home & Kitchen': '🏠',
        'Books & Stationery': '📚',
        'Food & Groceries': '🍔',
        'Services': '🛠️',
        'Hostels & Rooms': '🛏️',
    };
    const emoji = emojiMap[category] || '🔥';

    const titles = [
        `${emoji} New drop! "${productTitle}" just listed by ${sellerName}.`,
        `${emoji} Hot new listing: "${productTitle}" — check it out!`,
        `🚨 Just dropped on campus: ${productTitle} by ${sellerName}.`,
    ];

    return titles[Math.floor(Math.random() * titles.length)];
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
        return res.status(429).json({ error: 'Too many broadcasts. Please slow down.' });
    }

    const { productId } = req.body || {};
    if (!productId || typeof productId !== 'string') {
        return res.status(400).json({ error: 'productId is required' });
    }

    let adminApp;
    try {
        adminApp = getFirebaseAdmin();
    } catch (initErr) {
        console.error('[BROADCAST] Firebase Admin init error:', initErr.message);
        return res.status(500).json({ error: 'Server initialization error' });
    }

    const db = adminApp.firestore();

    // Verify product exists and was listed by caller (or caller is admin)
    let productData;
    try {
        const prodDoc = await db.collection('products').doc(productId).get();
        if (!prodDoc.exists) {
            return res.status(404).json({ error: 'Product not found in database' });
        }
        productData = prodDoc.data();

        // Enforce ownership
        if (productData.sellerId !== caller.uid) {
            // Check if caller is admin
            const callerDoc = await db.collection('users').doc(caller.uid).get();
            const callerRole = callerDoc.data()?.role;
            if (callerRole !== 'admin') {
                return res.status(403).json({ error: 'Forbidden. You can only broadcast your own listings.' });
            }
        }
    } catch (dbErr) {
        console.error('[BROADCAST] Product lookup error:', dbErr);
        return res.status(500).json({ error: 'Failed to verify product listing' });
    }

    const title = productData.title || 'Campus Item';
    const sellerName = productData.sellerName || 'A student';
    const category = productData.category || 'Other';

    // Fetch buyer tokens, excluding the seller's own tokens
    let allTokens = [];
    try {
        const usersSnap = await db.collection('users').limit(500).get();
        for (const doc of usersSnap.docs) {
            // Skip the seller themselves
            if (doc.id === productData.sellerId) continue;

            const fields = doc.data() || {};
            if (Array.isArray(fields.fcmTokens)) {
                for (const t of fields.fcmTokens) {
                    if (typeof t === 'string' && t.trim()) allTokens.push(t.trim());
                }
            }
            if (typeof fields.fcmToken === 'string' && fields.fcmToken.trim()) {
                allTokens.push(fields.fcmToken.trim());
            }
        }
        allTokens = [...new Set(allTokens)];
    } catch (err) {
        console.error('[BROADCAST] Failed to fetch buyer tokens:', err);
        return res.status(500).json({ error: 'Failed to fetch notification recipients' });
    }

    if (allTokens.length === 0) {
        return res.status(200).json({ message: 'No registered buyer devices found yet', sent: 0 });
    }

    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'www.marketu.store';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const appOrigin = `${protocol}://${host}`;

    const notifBody = buildMessage(title, sellerName, category);
    const productUrl = `${appOrigin}/product/${encodeURIComponent(productId)}`;

    // Batch send in chunks of 500
    const CHUNK_SIZE = 500;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < allTokens.length; i += CHUNK_SIZE) {
        const chunk = allTokens.slice(i, i + CHUNK_SIZE);
        try {
            const response = await adminApp.messaging().sendEachForMulticast({
                tokens: chunk,
                notification: {
                    title: '🛍️ New on Market-U!',
                    body: notifBody,
                },
                android: { priority: 'normal' },
                webpush: {
                    headers: { Urgency: 'normal', TTL: '43200' },
                    notification: {
                        title: '🛍️ New on Market-U!',
                        body: notifBody,
                        icon: `${appOrigin}/icon.png`,
                        badge: `${appOrigin}/icon.png`,
                        tag: `market-u-new-listing-${productId}`,
                    },
                    fcmOptions: { link: productUrl },
                },
            });
            succeeded += response.successCount;
            failed += response.failureCount;
        } catch (batchErr) {
            console.error('[BROADCAST] Chunk send error:', batchErr);
            failed += chunk.length;
        }
    }

    console.log(`[BROADCAST] New listing "${title}": ${succeeded} sent, ${failed} failed out of ${allTokens.length} devices`);
    return res.status(200).json({ succeeded, failed, total: allTokens.length });
}
