/**
 * /api/daily-reminder.js — Vercel Serverless Function & Scheduled Cron Job
 *
 * Broadcasts a daily push notification to buyers:
 * "Buy from Market-U today"
 *
 * Actions:
 *  - GET /api/daily-reminder?action=subscribers -> Returns audience count & list of subscribers
 *  - GET /api/daily-reminder                   -> Automated Vercel Cron trigger
 *  - POST /api/daily-reminder                  -> Admin on-demand broadcast trigger
 */

// ── Token cache ───────────────────────────────────────────────────────────────
let _cachedToken = null;
let _tokenExpiresAt = 0;

// ── Rate limiter — max 5 manual broadcasts per 5 minutes ─────────────────────
const _rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

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
        scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
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

// Fetch all buyer FCM tokens & audience info from Firestore via REST API
async function getAudienceData(serviceAccount, accessToken, roleFilter = null) {
    const projectId = serviceAccount.project_id;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const body = {
        structuredQuery: {
            from: [{ collectionId: 'users' }],
            limit: 1000,
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
    const subscribers = [];
    const allTokens = [];
    let totalUsers = 0;

    if (Array.isArray(docs)) {
        for (const item of docs) {
            if (!item.document) continue;
            totalUsers++;
            const fields = item.document.fields || {};

            const userRole = fields.role?.stringValue || (fields.isSeller?.booleanValue ? 'seller' : 'buyer');
            if (roleFilter && userRole !== roleFilter) continue;

            const userTokens = [];
            // Collect fcmTokens array
            if (fields.fcmTokens && fields.fcmTokens.arrayValue && fields.fcmTokens.arrayValue.values) {
                for (const v of fields.fcmTokens.arrayValue.values) {
                    if (v.stringValue) userTokens.push(v.stringValue);
                }
            }
            // Also collect legacy single fcmToken string
            if (fields.fcmToken && fields.fcmToken.stringValue) {
                userTokens.push(fields.fcmToken.stringValue);
            }

            const uniqueTokens = [...new Set(userTokens)];
            if (uniqueTokens.length > 0) {
                allTokens.push(...uniqueTokens);
                subscribers.push({
                    name: fields.name?.stringValue || 'Anonymous User',
                    email: fields.email?.stringValue || '—',
                    role: userRole,
                    schoolName: fields.schoolName?.stringValue || 'Western Delta University',
                    tokensCount: uniqueTokens.length,
                });
            }
        }
    }

    const uniqueAllTokens = [...new Set(allTokens)];
    return {
        totalUsers,
        totalSubscribers: subscribers.length,
        totalTokens: uniqueAllTokens.length,
        subscribers,
        tokens: uniqueAllTokens,
    };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Authorization check ───────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'];
    const querySecret = req.query?.secret;
    const bodySecret = req.body?.secret;
    const headerSecret = req.headers['x-admin-secret'];

    // If CRON_SECRET is defined in environment variables, enforce authentication
    if (cronSecret) {
        const isAuthorized =
            authHeader === `Bearer ${cronSecret}` ||
            querySecret === cronSecret ||
            bodySecret === cronSecret ||
            headerSecret === cronSecret;

        if (!isAuthorized) {
            console.warn('[DAILY REMINDER] Unauthorized invocation attempt');
            return res.status(401).json({ error: 'Unauthorized. Invalid or missing secret/token.' });
        }
    }

    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountRaw) {
        return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT is not configured' });
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountRaw);
    } catch {
        return res.status(500).json({ error: 'Invalid FIREBASE_SERVICE_ACCOUNT JSON credentials' });
    }

    let accessToken;
    try {
        accessToken = await getAccessToken(serviceAccount);
    } catch (e) {
        console.error('[DAILY REMINDER] OAuth token retrieval failed:', e);
        return res.status(500).json({ error: 'Firebase authentication failed' });
    }

    const role = req.query?.role || req.body?.role || null;
    let audience;
    try {
        audience = await getAudienceData(serviceAccount, accessToken, role);
    } catch (e) {
        console.error('[DAILY REMINDER] Token query failed:', e);
        return res.status(500).json({ error: 'Failed to retrieve registered buyer tokens' });
    }

    // If requested action is just to inspect subscribers audience
    if (req.query?.action === 'subscribers' || req.query?.action === 'audience') {
        return res.status(200).json({
            success: true,
            totalUsers: audience.totalUsers,
            totalSubscribers: audience.totalSubscribers,
            totalTokens: audience.totalTokens,
            subscribers: audience.subscribers,
        });
    }

    // Rate limit manual broadcast sending
    const isCronHeader = authHeader === `Bearer ${cronSecret}`;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (!isCronHeader && isRateLimited(clientIp)) {
        console.warn(`[DAILY REMINDER] Rate limit reached for IP: ${clientIp}`);
        return res.status(429).json({ error: 'Too many broadcast requests. Please wait a moment.' });
    }

    const tokens = audience.tokens;

    if (tokens.length === 0) {
        return res.status(200).json({
            message: 'No registered device tokens found. Users must enable notifications in their browser first.',
            sent: 0,
            failed: 0,
            total: 0,
            totalUsers: audience.totalUsers,
            totalSubscribers: 0,
        });
    }

    // Setup payload
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'www.marketu.store';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const appOrigin = `${protocol}://${host}`;

    const notifTitle = req.body?.title || req.query?.title || 'Market-U';
    const notifBody = req.body?.body || req.query?.body || 'Buy from Market-U today';
    const targetUrl = req.body?.link || req.query?.link || `${appOrigin}/market`;

    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Fan-out messages to all buyer tokens concurrently
    const results = await Promise.allSettled(
        tokens.map(async (token) => {
            const messageBody = {
                message: {
                    token,
                    notification: {
                        title: notifTitle,
                        body: notifBody,
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            channel_id: 'market_u_reminders',
                            click_action: targetUrl,
                        },
                    },
                    webpush: {
                        headers: {
                            Urgency: 'high',
                            TTL: '86400',
                        },
                        notification: {
                            title: notifTitle,
                            body: notifBody,
                            icon: `${appOrigin}/icon.png`,
                            badge: `${appOrigin}/icon.png`,
                            tag: 'market-u-daily',
                            vibrate: [200, 100, 200],
                        },
                        fcm_options: {
                            link: targetUrl,
                        },
                        data: {
                            url: '/market',
                            link: '/market',
                            type: 'daily_reminder',
                        },
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

    let succeeded = 0;
    let failed = 0;
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.name) {
            succeeded++;
        } else {
            failed++;
        }
    }

    console.log(`[DAILY REMINDER] Broadcast "${notifBody}": sent to ${succeeded} devices (${failed} expired) out of ${tokens.length} tokens across ${audience.totalSubscribers} subscribers.`);

    return res.status(200).json({
        success: true,
        message: `Notification "${notifBody}" broadcast successfully`,
        succeeded,
        failed,
        total: tokens.length,
        totalSubscribers: audience.totalSubscribers,
        totalUsers: audience.totalUsers,
        timestamp: new Date().toISOString(),
    });
}
