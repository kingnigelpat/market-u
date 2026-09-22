/**
 * /api/notify-new-listing.js — Vercel Serverless Function
 *
 * Broadcasts a push notification to ALL buyers who have FCM tokens
 * whenever a new product is listed on Market-U.
 *
 * Called from AddProduct.jsx after a product is saved to Firestore.
 * Body: { productTitle, sellerName, category, productId }
 */

// ── Token cache ───────────────────────────────────────────────────────────────
let _cachedToken = null;
let _tokenExpiresAt = 0;

// ── Rate limiter — max 5 broadcasts per IP per 10 minutes ────────────────────
const _rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = _rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        _rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
}

function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function getAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    if (_cachedToken && now < _tokenExpiresAt - 300) return _cachedToken;

    const { createSign } = await import('crypto');
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
    _cachedToken = tokenData.access_token;
    _tokenExpiresAt = now + 3600;
    return _cachedToken;
}

// Fetch all FCM tokens from Firestore via REST API
async function getAllBuyerTokens(serviceAccount, accessToken) {
    const projectId = serviceAccount.project_id;

    // Use Firestore REST API to query users who have fcmTokens
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const body = {
        structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'fcmTokens' },
                    op: 'IS_NOT_NULL',
                    value: { nullValue: 'NULL_VALUE' },
                },
            },
            limit: 500, // cap at 500 users per broadcast
        },
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const docs = await res.json();
    const allTokens = [];

    for (const item of docs) {
        if (!item.document) continue;
        const fields = item.document.fields || {};
        // Collect fcmTokens array
        if (fields.fcmTokens && fields.fcmTokens.arrayValue && fields.fcmTokens.arrayValue.values) {
            for (const v of fields.fcmTokens.arrayValue.values) {
                if (v.stringValue) allTokens.push(v.stringValue);
            }
        }
        // Also collect legacy single fcmToken
        if (fields.fcmToken && fields.fcmToken.stringValue) {
            const t = fields.fcmToken.stringValue;
            if (!allTokens.includes(t)) allTokens.push(t);
        }
    }

    return [...new Set(allTokens)]; // deduplicate
}

// Pick a catchy message based on category
function buildMessage(productTitle, sellerName, category) {
    const emoji = {
        'Electronics':       '📱',
        'Fashion':           '👗',
        'Health & Beauty':   '💄',
        'Home & Kitchen':    '🏠',
        'Books & Stationery':'📚',
        'Food & Groceries':  '🍔',
        'Services':          '🛠️',
        'Hostels & Rooms':   '🛏️',
    }[category] || '🔥';

    const titles = [
        `${emoji} New drop! "${productTitle}" just listed by ${sellerName}.`,
        `${emoji} Hot new listing: "${productTitle}" — grab it before it's gone!`,
        `🚨 Just dropped on campus! ${productTitle} by ${sellerName}.`,
        `${emoji} ${sellerName} just listed something new: "${productTitle}"`,
    ];

    return titles[Math.floor(Math.random() * titles.length)];
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Rate limit
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
        console.warn(`[BROADCAST] Rate limit hit for IP: ${clientIp}`);
        return res.status(429).json({ error: 'Too many broadcasts. Please slow down.' });
    }

    const { productTitle, sellerName, category, productId } = req.body;
    if (!productTitle) return res.status(400).json({ error: 'productTitle is required' });

    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountRaw) return res.status(500).json({ error: 'Server not configured' });

    let serviceAccount;
    try { serviceAccount = JSON.parse(serviceAccountRaw); }
    catch (e) { return res.status(500).json({ error: 'Invalid service account JSON' }); }

    let accessToken;
    try { accessToken = await getAccessToken(serviceAccount); }
    catch (e) { return res.status(500).json({ error: 'Auth failed' }); }

    // Fetch all buyer FCM tokens from Firestore
    let allTokens = [];
    try {
        allTokens = await getAllBuyerTokens(serviceAccount, accessToken);
    } catch (e) {
        console.error('[BROADCAST] Failed to fetch tokens:', e);
        return res.status(500).json({ error: 'Failed to fetch user tokens' });
    }

    if (allTokens.length === 0) {
        return res.status(200).json({ message: 'No users with notifications enabled yet', sent: 0 });
    }

    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'www.marketu.store';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const appOrigin = `${protocol}://${host}`;
    const notifBody = buildMessage(productTitle, sellerName || 'A seller', category);
    const productUrl = productId ? `${appOrigin}/product/${productId}` : `${appOrigin}/market`;

    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Fan-out all sends in parallel (FCM v1 is per-token, not multicast)
    const results = await Promise.allSettled(
        allTokens.map(async (token) => {
            const messageBody = {
                message: {
                    token,
                    notification: {
                        title: '🛍️ New on Market-U!',
                        body: notifBody,
                    },
                    android: { priority: 'normal' },
                    webpush: {
                        headers: { Urgency: 'normal', TTL: '43200' }, // 12hr TTL
                        notification: {
                            title: '🛍️ New on Market-U!',
                            body: notifBody,
                            icon: `${appOrigin}/icon.png`,
                            badge: `${appOrigin}/icon.png`,
                            tag: `market-u-new-listing-${productId || Date.now()}`,
                        },
                        fcm_options: { link: productUrl },
                    },
                },
            };

            const fcmRes = await fetch(fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageBody),
            });
            return fcmRes.json();
        })
    );

    let succeeded = 0, failed = 0;
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.name) succeeded++;
        else failed++;
    }

    console.log(`[BROADCAST] New listing "${productTitle}": ${succeeded} sent, ${failed} failed out of ${allTokens.length} tokens`);
    return res.status(200).json({ succeeded, failed, total: allTokens.length });
}
