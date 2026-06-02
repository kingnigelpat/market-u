/**
 * /api/notify.js — Vercel Serverless Function
 * Sends FCM push notifications to seller devices using FCM HTTP v1 API.
 * Requires FIREBASE_SERVICE_ACCOUNT env var (JSON string of serviceAccountKey.json)
 */

// Minimal JWT + OAuth2 implementation to get FCM access token from service account
// (avoids needing firebase-admin as a bundled serverless dependency)

// ── Token cache ──────────────────────────────────────────────────────────────
// Vercel reuses warm function instances, so caching the token here saves
// the Google OAuth round-trip (~500ms–1s) on every subsequent notification.
let _cachedToken = null;
let _tokenExpiresAt = 0; // Unix seconds
// ─────────────────────────────────────────────────────────────────────────────

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Simple in-memory rate limiter: max 10 notification requests per IP per minute.
// Resets on cold start (acceptable — bad actors don't benefit much from that).
const _rateLimitMap = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

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
// ─────────────────────────────────────────────────────────────────────────────

function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function getAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if it's still valid (tokens last 1hr; we refresh 5min early)
    if (_cachedToken && now < _tokenExpiresAt - 300) {
        return _cachedToken;
    }

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

    // Cache the new token
    _cachedToken = tokenData.access_token;
    _tokenExpiresAt = now + 3600;
    console.log('[FCM] Fresh OAuth token fetched and cached.');

    return _cachedToken;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // ── Rate limit check ──────────────────────────────────────────────────────
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
        console.warn(`[FCM] Rate limit hit for IP: ${clientIp}`);
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    // ─────────────────────────────────────────────────────────────────────────

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

    // Derive the app's origin for absolute URLs required by FCM webpush
    // Use the incoming host header; fall back to the canonical domain.
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'market-u.vercel.app';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const appOrigin = `${protocol}://${host}`;

    // Fan-out all FCM sends in parallel for speed
    const results = await Promise.allSettled(
        fcmTokens.map(async (token) => {
            const messageBody = {
                message: {
                    token,
                    notification: {
                        title: '🔔 New Interest on Market-U!',
                        body: `${buyerName} is interested in your ${productName}! Open Market-U to contact them.`,
                    },
                    // Android: wake up device even when Chrome is closed
                    android: {
                        priority: 'high',
                    },
                    // iOS + Desktop web push
                    // FCM requires ABSOLUTE URLs for icon/badge — relative paths are silently ignored
                    webpush: {
                        headers: {
                            Urgency: 'high',
                            TTL: '86400', // 24hr TTL so offline devices still get it
                        },
                        notification: {
                            title: '🔔 New Interest on Market-U!',
                            body: `${buyerName} is interested in your ${productName}! Tap to contact them.`,
                            icon: `${appOrigin}/icon.png`,
                            badge: `${appOrigin}/icon.png`,
                            vibrate: [200, 100, 200, 100, 200],
                            requireInteraction: true,
                            tag: `market-u-interest-${Date.now()}`,
                        },
                        fcm_options: {
                            link: `${appOrigin}/notifications`,
                        },
                    },
                },
            };

            console.log('[FCM] Sending to token:', token.slice(0, 20) + '...', 'origin:', appOrigin);

            const fcmRes = await fetch(fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageBody),
            });
            const json = await fcmRes.json();
            // Log full FCM response so we can see exactly what failed
            if (json.error) {
                console.warn(`[FCM] Token send failed (status ${fcmRes.status}):`, JSON.stringify(json.error));
            } else {
                console.log('[FCM] Token send success:', json.name);
            }
            return json;
        })
    );

    // Count actual FCM outcomes — a fulfilled promise can still carry an FCM error
    // in its response body, so we check the json.name field (present on success).
    let succeeded = 0;
    let failed = 0;
    const errors = [];
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.name) {
            succeeded++;
        } else {
            failed++;
            const reason = r.status === 'rejected' ? r.reason?.message : r.value?.error?.message;
            if (reason) {
                errors.push(reason);
                console.warn('[FCM] Delivery failure:', reason);
            }
        }
    }
    console.log(`Push result: ${succeeded} sent, ${failed} failed`);

    return res.status(200).json({ succeeded, failed, errors });
}
