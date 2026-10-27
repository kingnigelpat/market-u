/**
 * /api/referral.js — Vercel Serverless Function
 *
 * Server-side referral giveaway engine ("Invite 5 friends, get ₦1,000").
 * Runs with Firebase Admin privileges so that:
 *  - referrer lookup by promo code works (users collection is private to clients)
 *  - anti-fraud checks (duplicate device / phone / self-referral) can see all referrals
 *  - winner records + budget cap are enforced atomically and cannot be forged by clients
 *
 * Actions (POST, Authorization: Bearer <Firebase ID token>):
 *  { action: 'record',  refCode, deviceId }  -> called right after signup
 *  { action: 'qualify', actionType }         -> called when referred user views a product / contacts a seller
 */

import { getFirebaseAdmin, verifyAuth } from './_firebase.js';

// PAUSED: keep in sync with GIVEAWAY_ENABLED in src/utils/referralService.js
const GIVEAWAY_ENABLED = false;

const TARGET_REFERRALS = 5;
const DEFAULT_BUDGET_CAP = 50;
const DEFAULT_REWARD = 1000;
const SIGNUP_WINDOW_MS = 24 * 60 * 60 * 1000; // promo code must be applied within 24h of account creation
const VALID_ACTIONS = ['product_viewed', 'whatsapp_clicked', 'in_app_ask_clicked'];

const _rateLimitMap = new Map();
function isRateLimited(uid, max = 30) {
    const now = Date.now();
    const entry = _rateLimitMap.get(uid);
    if (!entry || now > entry.resetAt) {
        _rateLimitMap.set(uid, { count: 1, resetAt: now + 60_000 });
        return false;
    }
    if (entry.count >= max) return true;
    entry.count++;
    return false;
}

const normalizePhone = (p) => String(p || '').replace(/\D/g, '');
const codeForUid = (uid) => 'MU-' + String(uid).slice(0, 6).toUpperCase();

function toMillis(v) {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v._seconds === 'number') return v._seconds * 1000;
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
}

async function findReferrer(db, code) {
    // 1. Users who have the referralCode field stored (all accounts created after this feature)
    const direct = await db.collection('users').where('referralCode', '==', code).limit(1).get();
    if (!direct.empty) return direct.docs[0];

    // 2. Legacy accounts without the field: code is derived from the UID prefix.
    //    Scan once, and backfill the field so future lookups hit path #1.
    const all = await db.collection('users').select('name', 'phone').get();
    const match = all.docs.find((d) => codeForUid(d.id) === code);
    if (match) {
        await match.ref.set({ referralCode: code }, { merge: true }).catch(() => {});
        return match;
    }
    return null;
}

async function handleRecord(db, admin, uid, body) {
    const code = String(body.refCode || '').trim().toUpperCase();
    const deviceId = String(body.deviceId || '').slice(0, 80);
    if (!/^MU-[A-Z0-9_-]{4,12}$/.test(code)) {
        return { status: 400, body: { ok: false, reason: 'invalid_code', message: 'That promo code format is not valid.' } };
    }

    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
        return { status: 404, body: { ok: false, reason: 'no_profile', message: 'Account profile not found yet. Please try again.' } };
    }
    const user = userSnap.data() || {};

    // Only brand-new accounts can apply a promo code
    const createdMs = toMillis(user.createdAt) || toMillis((await admin.auth().getUser(uid)).metadata.creationTime);
    if (createdMs && Date.now() - createdMs > SIGNUP_WINDOW_MS) {
        return { status: 400, body: { ok: false, reason: 'too_late', message: 'Promo codes can only be used when creating a new account.' } };
    }

    // One referral per referred account
    const existing = await db.collection('referrals').where('referredUserId', '==', uid).limit(1).get();
    if (!existing.empty) {
        return { status: 200, body: { ok: true, reason: 'already_recorded' } };
    }

    const referrerDoc = await findReferrer(db, code);
    if (!referrerDoc) {
        return { status: 404, body: { ok: false, reason: 'unknown_code', message: 'We could not find that promo code.' } };
    }
    const referrerId = referrerDoc.id;
    const referrer = referrerDoc.data() || {};

    if (referrerId === uid) {
        return { status: 400, body: { ok: false, reason: 'self_referral', message: 'You cannot use your own promo code.' } };
    }

    const phone = normalizePhone(user.phone);
    if (phone && phone === normalizePhone(referrer.phone)) {
        return { status: 400, body: { ok: false, reason: 'self_referral', message: 'You cannot use your own promo code.' } };
    }

    // Duplicate phone: one counted account per phone number
    if (phone) {
        const dupPhone = await db.collection('referrals').where('phone', '==', phone).limit(1).get();
        if (!dupPhone.empty) {
            await logBlocked(db, admin, { uid, referrerId, code, reason: 'duplicate_phone', deviceId, phone });
            return { status: 409, body: { ok: false, reason: 'duplicate_phone', message: 'This phone number has already been used for a referral.' } };
        }
    }

    // Duplicate device: one counted account per device
    if (deviceId && deviceId !== 'dev_unknown') {
        const dupDevice = await db.collection('referrals').where('deviceId', '==', deviceId).limit(1).get();
        if (!dupDevice.empty) {
            await logBlocked(db, admin, { uid, referrerId, code, reason: 'duplicate_device', deviceId, phone });
            return { status: 409, body: { ok: false, reason: 'duplicate_device', message: 'A referral has already been claimed from this device.' } };
        }
    }

    const FieldValue = admin.firestore.FieldValue;
    await db.collection('referrals').add({
        referrerId,
        referrerName: referrer.name || 'Referrer',
        referredUserId: uid,
        referredName: user.name || '',
        referralCode: code,
        deviceId,
        phone,
        status: 'pending_action',
        createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection('users').doc(uid).set({ referredBy: code }, { merge: true });

    await db.collection('analytics_events').add({
        eventType: 'referral_signup',
        userId: uid,
        sellerId: null,
        productId: null,
        metadata: { referrerId, refCode: code },
        date: new Date().toISOString().slice(0, 10),
        createdAt: FieldValue.serverTimestamp(),
    });

    return { status: 200, body: { ok: true, reason: 'recorded', referrerName: referrer.name || '' } };
}

async function logBlocked(db, admin, data) {
    try {
        await db.collection('referral_blocked').add({ ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch { /* non-critical */ }
}

async function handleQualify(db, admin, uid, body) {
    const actionType = VALID_ACTIONS.includes(body.actionType) ? body.actionType : 'product_viewed';

    const pending = await db.collection('referrals')
        .where('referredUserId', '==', uid)
        .where('status', '==', 'pending_action')
        .limit(1)
        .get();

    if (pending.empty) {
        return { status: 200, body: { ok: true, reason: 'nothing_pending' } };
    }

    const referralRef = pending.docs[0].ref;
    const referrerId = pending.docs[0].data().referrerId;
    const FieldValue = admin.firestore.FieldValue;

    const settingsRef = db.collection('settings').doc('giveaway');
    const statsRef = db.collection('settings').doc('giveaway_stats');
    const winnerRef = db.collection('giveaway_winners').doc(referrerId);
    const referrerRef = db.collection('users').doc(referrerId);

    // Count already-qualified referrals for this referrer (outside the transaction; queries
    // inside admin transactions are allowed but this keeps contention low)
    const qualifiedSnap = await db.collection('referrals')
        .where('referrerId', '==', referrerId)
        .where('status', '==', 'qualified')
        .get();

    const result = await db.runTransaction(async (tx) => {
        const [refSnap, settingsSnap, statsSnap, winnerSnap, referrerSnap] = await Promise.all([
            tx.get(referralRef), tx.get(settingsRef), tx.get(statsRef), tx.get(winnerRef), tx.get(referrerRef),
        ]);

        if (!refSnap.exists || refSnap.data().status !== 'pending_action') {
            return { reason: 'already_processed' };
        }

        const settings = settingsSnap.exists ? settingsSnap.data() : {};
        const active = settings.active ?? true;
        const budgetCap = Number(settings.budgetCap) || DEFAULT_BUDGET_CAP;
        const rewardAmount = Number(settings.rewardAmount) || DEFAULT_REWARD;
        const winnersCount = statsSnap.exists ? Number(statsSnap.data().winnersCount) || 0 : 0;

        if (!active) {
            return { reason: 'giveaway_paused' };
        }

        const qualifiedCount = qualifiedSnap.size + 1;
        const qualifiesForReward = qualifiedCount >= TARGET_REFERRALS && !winnerSnap.exists;

        if (qualifiesForReward && winnersCount >= budgetCap) {
            tx.update(referralRef, {
                status: 'qualified_budget_capped',
                qualifiedAt: FieldValue.serverTimestamp(),
                qualifyingAction: actionType,
            });
            return { reason: 'budget_capped' };
        }

        tx.update(referralRef, {
            status: 'qualified',
            qualifiedAt: FieldValue.serverTimestamp(),
            qualifyingAction: actionType,
        });

        if (qualifiesForReward) {
            const referrer = referrerSnap.exists ? referrerSnap.data() : {};
            tx.set(winnerRef, {
                userId: referrerId,
                userName: referrer.name || 'User',
                userPhone: referrer.phone || '',
                rewardAmount,
                referralCount: qualifiedCount,
                status: 'Pending',
                bankDetails: null,
                completedAt: FieldValue.serverTimestamp(),
            });
            tx.set(statsRef, { winnersCount: winnersCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            return { reason: 'qualified_new_winner', referrerId };
        }

        return { reason: 'qualified', qualifiedCount };
    });

    return { status: 200, body: { ok: true, ...result } };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!GIVEAWAY_ENABLED) return res.status(200).json({ ok: false, reason: 'paused' });

    let caller;
    try {
        caller = await verifyAuth(req);
    } catch (authErr) {
        return res.status(authErr.statusCode || 401).json({ error: authErr.message });
    }

    if (isRateLimited(caller.uid)) {
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    let admin;
    try {
        admin = getFirebaseAdmin();
    } catch (initErr) {
        console.error('[REFERRAL] Firebase Admin init error:', initErr.message);
        return res.status(500).json({ error: 'Server initialization error' });
    }

    const db = admin.firestore();
    const body = req.body || {};

    try {
        let out;
        if (body.action === 'record') out = await handleRecord(db, admin, caller.uid, body);
        else if (body.action === 'qualify') out = await handleQualify(db, admin, caller.uid, body);
        else return res.status(400).json({ error: 'Unknown action' });

        return res.status(out.status).json(out.body);
    } catch (err) {
        console.error(`[REFERRAL] ${body.action} failed:`, err);
        return res.status(500).json({ error: 'Referral processing failed', detail: err.message });
    }
}
