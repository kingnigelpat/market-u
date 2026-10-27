import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logEvent } from './analyticsService';

const DEFAULT_BUDGET_CAP = 50; // First 50 winners
export const REFERRAL_TARGET = 5;

/**
 * Master switch for the referral giveaway.
 * PAUSED: set to true to re-enable the giveaway UI, routes, and referral tracking.
 */
export const GIVEAWAY_ENABLED = false;

/**
 * Gets or creates a persistent device identifier to prevent multiple signups on the same phone.
 */
export function getDeviceId() {
    try {
        let devId = localStorage.getItem('mu_device_id');
        if (!devId) {
            devId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
            localStorage.setItem('mu_device_id', devId);
        }
        return devId;
    } catch {
        return 'dev_unknown';
    }
}

/**
 * Derives a predictable referral code from user ID.
 */
export function generateReferralCode(uid) {
    if (!uid) return '';
    return 'MU-' + uid.slice(0, 6).toUpperCase();
}

/**
 * Tries to call the serverless /api/referral endpoint.
 * Returns null if the endpoint is not available (e.g. running under Vite dev or static hosting).
 */
async function callReferralApi(payload) {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            // Vite dev server or static host serving static file, not a running API function
            return null;
        }

        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch {
        return null;
    }
}

/**
 * Reads global giveaway settings (budget cap, reward amount, active toggle).
 */
export async function getGiveawayConfig() {
    const defaults = { budgetCap: DEFAULT_BUDGET_CAP, rewardAmount: 1000, active: true, winnersCount: 0 };
    try {
        const [snap, statsSnap] = await Promise.all([
            getDoc(doc(db, 'settings', 'giveaway')),
            getDoc(doc(db, 'settings', 'giveaway_stats')),
        ]);
        const d = snap.exists() ? snap.data() : {};
        return {
            budgetCap: d.budgetCap ?? defaults.budgetCap,
            rewardAmount: d.rewardAmount ?? defaults.rewardAmount,
            active: d.active ?? defaults.active,
            winnersCount: statsSnap.exists() ? (statsSnap.data().winnersCount || 0) : 0,
        };
    } catch (e) {
        console.warn('Could not read giveaway settings, using defaults:', e);
        return defaults;
    }
}

/**
 * Updates global giveaway settings (Admin only).
 */
export async function updateGiveawayConfig({ budgetCap, rewardAmount, active }) {
    await setDoc(doc(db, 'settings', 'giveaway'), {
        budgetCap: Number(budgetCap) || DEFAULT_BUDGET_CAP,
        rewardAmount: Number(rewardAmount) || 1000,
        active: Boolean(active),
        updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
}

/**
 * Records a pending referral when a new user signs up with a promo code.
 * Uses /api/referral when available, with Firestore client SDK fallback.
 */
export async function recordSignupReferral({ referredUserId, refCode, phone }) {
    if (!GIVEAWAY_ENABLED) return { ok: false, reason: 'paused' };
    if (!refCode) return { ok: false, reason: 'no_code' };
    const normalizedCode = refCode.trim().toUpperCase();
    const uid = referredUserId || auth.currentUser?.uid;

    // 1. Try server endpoint
    const apiResult = await callReferralApi({
        action: 'record',
        refCode: normalizedCode,
        deviceId: getDeviceId()
    });

    if (apiResult) {
        return apiResult;
    }

    // 2. Client-side fallback (works in Vite local dev and static hosting)
    try {
        const deviceId = getDeviceId();

        // Find referrer by referral code in publicProfiles or users
        let referrerId = null;
        let referrerName = 'A Friend';

        const pubSnap = await getDocs(
            query(collection(db, 'publicProfiles'), where('referralCode', '==', normalizedCode))
        );

        if (!pubSnap.empty) {
            referrerId = pubSnap.docs[0].id;
            referrerName = pubSnap.docs[0].data().name || referrerName;
        } else {
            // Check fallback: code might match standard MU-<UID_PREFIX>
            const allPubs = await getDocs(collection(db, 'publicProfiles'));
            const match = allPubs.docs.find(d => generateReferralCode(d.id) === normalizedCode);
            if (match) {
                referrerId = match.id;
                referrerName = match.data().name || referrerName;
            }
        }

        if (!referrerId) {
            console.warn('[REFERRAL] Invalid or unknown referral code:', normalizedCode);
            return { ok: false, reason: 'unknown_code', message: 'Promo code not found.' };
        }

        if (referrerId === uid) {
            console.warn('[REFERRAL] Self-referral blocked.');
            return { ok: false, reason: 'self_referral', message: 'You cannot use your own promo code.' };
        }

        // Check if referral already recorded
        if (uid) {
            const existingQuery = query(collection(db, 'referrals'), where('referredUserId', '==', uid));
            const existingSnap = await getDocs(existingQuery);
            if (!existingSnap.empty) {
                return { ok: true, reason: 'already_recorded' };
            }
        }

        // Add referral doc
        await addDoc(collection(db, 'referrals'), {
            referrerId,
            referrerName,
            referredUserId: uid,
            referralCode: normalizedCode,
            deviceId,
            phone: phone || '',
            status: 'pending_action',
            createdAt: serverTimestamp(),
        });

        // Log analytics event
        await logEvent({
            eventType: 'referral_signup',
            userId: uid,
            metadata: { referrerId, refCode: normalizedCode },
        });

        return { ok: true, reason: 'recorded', referrerName };
    } catch (err) {
        console.error('[REFERRAL] Client fallback record error:', err);
        return { ok: false, reason: 'error', message: err.message };
    }
}

/**
 * Triggers referral qualification when a referred user views a product or contacts a seller.
 * Uses /api/referral when available, with Firestore client SDK fallback.
 */
export async function qualifyReferralAction(userId, actionType = 'product_viewed') {
    if (!GIVEAWAY_ENABLED || !userId) return;
    const cacheKey = `mu_ref_resolved_${userId}`;
    try {
        if (localStorage.getItem(cacheKey)) return;
    } catch {
        // Ignore localStorage error
    }

    // 1. Try server endpoint
    const apiResult = await callReferralApi({ action: 'qualify', actionType });
    if (apiResult && apiResult.ok) {
        try { localStorage.setItem(cacheKey, String(Date.now())); } catch { /* ignore */ }
        return;
    }

    // 2. Client-side fallback
    try {
        const q = query(
            collection(db, 'referrals'),
            where('referredUserId', '==', userId),
            where('status', '==', 'pending_action')
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            try { localStorage.setItem(cacheKey, String(Date.now())); } catch { /* ignore */ }
            return;
        }

        const config = await getGiveawayConfig();
        if (!config.active) return;

        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const referrerId = data.referrerId;

            // Mark referral as qualified
            await updateDoc(doc(db, 'referrals', docSnap.id), {
                status: 'qualified',
                qualifiedAt: serverTimestamp(),
                qualifyingAction: actionType,
            });

            // Count total qualified for this referrer
            const qualifiedQuery = query(
                collection(db, 'referrals'),
                where('referrerId', '==', referrerId),
                where('status', '==', 'qualified')
            );
            const qualifiedSnap = await getDocs(qualifiedQuery);
            const count = qualifiedSnap.size;

            if (count >= REFERRAL_TARGET) {
                // Check if winner record already exists
                const winnerRef = doc(db, 'giveaway_winners', referrerId);
                const winnerSnap = await getDoc(winnerRef);

                if (!winnerSnap.exists()) {
                    await setDoc(winnerRef, {
                        userId: referrerId,
                        userName: data.referrerName || 'User',
                        userPhone: '',
                        rewardAmount: config.rewardAmount || 1000,
                        referralCount: count,
                        status: 'Pending',
                        bankDetails: null,
                        completedAt: serverTimestamp(),
                    });
                }
            }
        }

        try { localStorage.setItem(cacheKey, String(Date.now())); } catch { /* ignore */ }
    } catch (err) {
        console.warn('[REFERRAL] Could not qualify referral:', err?.message || err);
    }
}

/**
 * Gets the current user's referral progress and winners status.
 */
export async function getReferralProgress(userId) {
    if (!userId) {
        return { count: 0, target: REFERRAL_TARGET, isWinner: false, reachedTarget: false, payoutStatus: 'Not Started', winnerDoc: null };
    }

    try {
        const q = query(
            collection(db, 'referrals'),
            where('referrerId', '==', userId),
            where('status', '==', 'qualified')
        );
        const snap = await getDocs(q);
        const count = snap.size;

        const winnerSnap = await getDoc(doc(db, 'giveaway_winners', userId));
        const winnerData = winnerSnap.exists() ? winnerSnap.data() : null;

        return {
            count,
            target: REFERRAL_TARGET,
            isWinner: count >= REFERRAL_TARGET || Boolean(winnerData),
            reachedTarget: count >= REFERRAL_TARGET,
            payoutStatus: winnerData?.status || (count >= REFERRAL_TARGET ? 'Pending' : 'In Progress'),
            winnerDoc: winnerData,
        };
    } catch (err) {
        console.error('[REFERRAL] Error fetching progress:', err);
        return { count: 0, target: REFERRAL_TARGET, isWinner: false, reachedTarget: false, payoutStatus: 'Error', winnerDoc: null };
    }
}

/**
 * Lists all friends referred by a given user (both qualified and pending).
 */
export async function listUserReferrals(userId) {
    if (!userId) return [];
    try {
        const q = query(collection(db, 'referrals'), where('referrerId', '==', userId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        return list;
    } catch (err) {
        console.error('[REFERRAL] Error listing referrals:', err);
        return [];
    }
}

/**
 * Allows a winner to submit their bank account details for manual payout.
 */
export async function submitWinnerBankDetails(userId, { bankName, accountNumber, accountName }) {
    if (!userId) throw new Error('User required');
    await updateDoc(doc(db, 'giveaway_winners', userId), {
        bankDetails: {
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim(),
            submittedAt: new Date().toISOString(),
        }
    });
    return true;
}

/**
 * Admin: lists all giveaway winners with status Pending / Paid.
 */
export async function getAdminGiveawayWinners() {
    try {
        const snap = await getDocs(collection(db, 'giveaway_winners'));
        const winners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        winners.sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0));
        return winners;
    } catch (err) {
        console.error('[REFERRAL] Error getting giveaway winners:', err);
        return [];
    }
}

/**
 * Admin: updates winner payout status to 'Paid' or 'Pending'.
 */
export async function updateWinnerPayoutStatus(winnerId, status, notes = '') {
    if (!winnerId) throw new Error('Winner ID required');
    await updateDoc(doc(db, 'giveaway_winners', winnerId), {
        status,
        notes: notes || '',
        paidAt: status === 'Paid' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
    });
    return true;
}
