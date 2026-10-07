import { db } from '../firebase';
import {
    collection, query, where, onSnapshot, addDoc, doc, updateDoc,
    serverTimestamp, Timestamp, increment, orderBy
} from 'firebase/firestore';
import { AD_PRICE_PER_WEEK, AD_MAX_WEEKS } from '../config/ads';

const ADS = 'ads';
const DAY_MS = 24 * 60 * 60 * 1000;

const toMillis = (v) => {
    if (!v) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
};

/** Returns the effective status of an ad, treating past-endDate active ads as expired. */
export function getEffectiveStatus(ad) {
    if (ad?.status === 'active') {
        const end = toMillis(ad.endDate);
        if (end && Date.now() > end) return 'expired';
    }
    return ad?.status || 'pending_payment';
}

export function getDaysLeft(ad) {
    const end = toMillis(ad?.endDate);
    if (!end) return null;
    return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
}

/** Creates an ad in `pending_payment` status. */
export async function createAd({
    ownerId, advertiserName, advertiserType, title, subtitle,
    imageUrl, linkType, linkUrl, schoolName, weeks
}) {
    const w = Math.min(Math.max(parseInt(weeks, 10) || 1, 1), AD_MAX_WEEKS);
    const ref = await addDoc(collection(db, ADS), {
        ownerId,
        advertiserName: advertiserName.trim(),
        advertiserType,
        title: title.trim(),
        subtitle: (subtitle || '').trim(),
        imageUrl,
        linkType,
        linkUrl: linkUrl.trim(),
        schoolName,
        weeks: w,
        amount: w * AD_PRICE_PER_WEEK,
        status: 'pending_payment',
        paymentRef: '',
        rejectionReason: '',
        startDate: null,
        endDate: null,
        impressions: 0,
        clicks: 0,
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateAdPaymentRef(adId, paymentRef) {
    await updateDoc(doc(db, ADS, adId), { paymentRef: paymentRef.trim() });
}

/** Live list of the current user's ads (newest first). */
export function subscribeToMyAds(uid, callback) {
    const q = query(collection(db, ADS), where('ownerId', '==', uid));
    return onSnapshot(q, (snap) => {
        const ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        ads.sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0));
        callback(ads);
    }, (err) => {
        console.warn('Could not load your ads:', err);
        callback([]);
    });
}

/** Live list of running ads for a school (expired ones filtered client-side). */
export function subscribeToActiveAds(schoolName, callback) {
    if (!schoolName) { callback([]); return () => {}; }
    const q = query(
        collection(db, ADS),
        where('status', '==', 'active'),
        where('schoolName', '==', schoolName)
    );
    return onSnapshot(q, (snap) => {
        const now = Date.now();
        const ads = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((ad) => {
                const start = toMillis(ad.startDate);
                const end = toMillis(ad.endDate);
                return (!start || now >= start) && (!end || now <= end);
            });
        callback(ads);
    }, (err) => {
        console.warn('Could not load sponsored banners:', err);
        callback([]);
    });
}

/** Admin: live list of all ads. */
export function subscribeToAllAds(callback) {
    const q = query(collection(db, ADS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
        console.warn('Could not load ads (admin):', err);
        callback([]);
    });
}

/** Admin: approve payment and start the ad now. */
export async function approveAd(ad) {
    const now = Date.now();
    const weeks = ad.weeks || 1;
    await updateDoc(doc(db, ADS, ad.id), {
        status: 'active',
        rejectionReason: '',
        startDate: Timestamp.fromMillis(now),
        endDate: Timestamp.fromMillis(now + weeks * 7 * DAY_MS),
        approvedAt: serverTimestamp(),
    });
}

export async function rejectAd(adId, reason = '') {
    await updateDoc(doc(db, ADS, adId), { status: 'rejected', rejectionReason: reason });
}

export async function endAdNow(adId) {
    await updateDoc(doc(db, ADS, adId), { status: 'expired', endDate: Timestamp.now() });
}

// ── Analytics (once per browser session per ad) ─────────────────────────────
const trackOnce = (kind, adId) => {
    const key = `ad_${kind}_${adId}`;
    try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
    } catch {
        /* storage blocked — still track */
    }
    updateDoc(doc(db, ADS, adId), { [kind]: increment(1) }).catch(() => {});
};

export const trackAdImpression = (adId) => trackOnce('impressions', adId);
export const trackAdClick = (adId) => trackOnce('clicks', adId);
