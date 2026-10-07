/**
 * /api/daily-reminder.js — Vercel Serverless Function & Scheduled Cron Job
 *
 * Broadcasts daily push notification to buyers:
 * "Buy from Market-U today"
 *
 * Actions:
 *  - GET /api/daily-reminder?action=subscribers -> Admin only: returns subscriber statistics and sanitized list
 *  - GET /api/daily-reminder                   -> Automated Vercel Cron trigger (requires CRON_SECRET)
 *  - POST /api/daily-reminder                  -> Admin only: on-demand broadcast trigger
 */

import { getFirebaseAdmin, verifyAdmin } from './_firebase.js';

// Rate limiter — max 5 manual admin broadcasts per 5 minutes
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

// Fetch audience data safely from Firestore
async function getAudienceData(adminApp, roleFilter = null) {
    const db = adminApp.firestore();
    const snapshot = await db.collection('users').limit(1000).get();

    const subscribers = [];
    const allTokens = [];
    let totalUsers = 0;

    for (const doc of snapshot.docs) {
        totalUsers++;
        const fields = doc.data() || {};
        const userRole = (fields.role || (fields.isSeller ? 'seller' : 'buyer')).trim().toLowerCase();
        if (roleFilter && userRole !== roleFilter) continue;

        const userTokens = [];
        if (Array.isArray(fields.fcmTokens)) {
            for (const t of fields.fcmTokens) {
                if (typeof t === 'string' && t.trim()) userTokens.push(t.trim());
            }
        }
        if (typeof fields.fcmToken === 'string' && fields.fcmToken.trim()) {
            userTokens.push(fields.fcmToken.trim());
        }

        const uniqueTokens = [...new Set(userTokens)];
        if (uniqueTokens.length > 0) {
            allTokens.push(...uniqueTokens);
            // Sanitized subscriber summary for admin viewing (no tokens or raw contact details exposed)
            subscribers.push({
                name: fields.name || 'Anonymous User',
                role: userRole,
                schoolName: fields.schoolName || 'Western Delta University',
                tokensCount: uniqueTokens.length,
            });
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let adminApp;
    try {
        adminApp = getFirebaseAdmin();
    } catch (err) {
        console.error('[DAILY REMINDER] Firebase Admin init error:', err.message);
        return res.status(500).json({ error: 'Server initialization error' });
    }

    const action = req.query?.action;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ACTION: SUBSCRIBERS LIST (ADMIN ONLY)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'subscribers' || action === 'audience') {
        try {
            await verifyAdmin(req);
        } catch (authErr) {
            return res.status(authErr.statusCode || 401).json({ error: authErr.message });
        }

        try {
            const role = req.query?.role || null;
            const audience = await getAudienceData(adminApp, role);
            return res.status(200).json({
                success: true,
                totalUsers: audience.totalUsers,
                totalSubscribers: audience.totalSubscribers,
                totalTokens: audience.totalTokens,
                subscribers: audience.subscribers,
            });
        } catch (err) {
            console.error('[DAILY REMINDER] Error fetching audience:', err);
            return res.status(500).json({ error: 'Failed to retrieve subscribers' });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. BROADCAST INVOCATION (CRON OR ADMIN POST)
    // ─────────────────────────────────────────────────────────────────────────
    let isCronInvocation = false;

    if (req.method === 'GET') {
        // GET without action is Cron execution
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers['authorization'] || '';

        if (!cronSecret) {
            console.warn('[DAILY REMINDER] Automated cron attempted but CRON_SECRET is not configured in env.');
            return res.status(401).json({ error: 'CRON_SECRET is not configured. Automated invocation disabled.' });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.warn('[DAILY REMINDER] Unauthorized cron invocation attempt');
            return res.status(401).json({ error: 'Unauthorized cron invocation' });
        }

        isCronInvocation = true;
    } else if (req.method === 'POST') {
        // POST is manual admin broadcast
        try {
            await verifyAdmin(req);
        } catch (authErr) {
            return res.status(authErr.statusCode || 401).json({ error: authErr.message });
        }

        const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
        if (isRateLimited(clientIp)) {
            return res.status(429).json({ error: 'Rate limit reached. Please wait a few minutes before broadcasting again.' });
        }
    }

    // Retrieve audience
    let audience;
    try {
        const role = req.query?.role || req.body?.role || null;
        audience = await getAudienceData(adminApp, role);
    } catch (err) {
        console.error('[DAILY REMINDER] Failed to retrieve audience:', err);
        return res.status(500).json({ error: 'Failed to query registered devices' });
    }

    const tokens = audience.tokens;
    if (tokens.length === 0) {
        return res.status(200).json({
            message: 'No registered device tokens found.',
            sent: 0,
            failed: 0,
            total: 0,
            totalUsers: audience.totalUsers,
            totalSubscribers: 0,
        });
    }

    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'www.marketu.store';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const appOrigin = `${protocol}://${host}`;

    // Validate and sanitize content
    let notifTitle = 'Market-U';
    let notifBody = 'Buy from Market-U today';
    let targetUrl = `${appOrigin}/market`;

    if (!isCronInvocation) {
        if (req.body?.title && typeof req.body.title === 'string') {
            notifTitle = req.body.title.slice(0, 80).trim();
        }
        if (req.body?.body && typeof req.body.body === 'string') {
            notifBody = req.body.body.slice(0, 200).trim();
        }
        if (req.body?.link && typeof req.body.link === 'string') {
            const rawLink = req.body.link.trim();
            // Restrict link to internal path or app domain to prevent external phishing links
            if (rawLink.startsWith('/')) {
                targetUrl = `${appOrigin}${rawLink}`;
            } else if (rawLink.startsWith(appOrigin) || rawLink.startsWith('https://marketu.store')) {
                targetUrl = rawLink;
            }
        }
    }

    // Batch send in chunks of 500 (FCM max multicast limit)
    const CHUNK_SIZE = 500;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunk = tokens.slice(i, i + CHUNK_SIZE);
        try {
            const response = await adminApp.messaging().sendEachForMulticast({
                tokens: chunk,
                notification: {
                    title: notifTitle,
                    body: notifBody,
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'market_u_reminders',
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
                    },
                    fcmOptions: {
                        link: targetUrl,
                    },
                    data: {
                        url: targetUrl,
                        type: 'daily_reminder',
                    },
                },
            });

            succeeded += response.successCount;
            failed += response.failureCount;
        } catch (batchErr) {
            console.error('[DAILY REMINDER] Batch send error:', batchErr);
            failed += chunk.length;
        }
    }

    console.log(`[DAILY REMINDER] Broadcast "${notifBody}": sent to ${succeeded} devices (${failed} failed) across ${tokens.length} total tokens.`);

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
