import { addDoc, collection, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Returns a persistent anonymous identifier for guests.
 */
export function getAnonymousId() {
    try {
        let anonId = localStorage.getItem('mu_anon_id');
        if (!anonId) {
            anonId = 'anon_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
            localStorage.setItem('mu_anon_id', anonId);
        }
        return anonId;
    } catch {
        return 'anon_guest';
    }
}

/**
 * Logs an analytics event to Firestore.
 * Fails silently so user experience is never blocked by tracking errors.
 *
 * @param {object} params
 * @param {'product_viewed'|'whatsapp_clicked'|'in_app_ask_clicked'|'seller_replied'|'referral_signup'} params.eventType
 * @param {string} [params.userId]
 * @param {string} [params.sellerId]
 * @param {string} [params.productId]
 * @param {object} [params.metadata]
 */
export async function logEvent({ eventType, userId, sellerId = null, productId = null, metadata = {} }) {
    try {
        const resolvedUserId = userId || getAnonymousId();
        const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        await addDoc(collection(db, 'analytics_events'), {
            eventType,
            userId: resolvedUserId,
            sellerId: sellerId || null,
            productId: productId || null,
            metadata: metadata || {},
            date: todayStr,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.warn(`[ANALYTICS] Could not log event "${eventType}":`, err?.message || err);
    }
}

/**
 * Fetches recent events and aggregates metrics for the Admin Analytics view.
 * 
 * Aggregates:
 * - Daily product views, WhatsApp clicks, in-app questions, seller replies, referral signups
 * - Clicks per button (WhatsApp vs In-App)
 * - Clicks per seller
 * - Most viewed products
 *
 * @param {number} maxEvents
 */
export async function getAnalyticsSummary(maxEvents = 600) {
    try {
        const q = query(
            collection(db, 'analytics_events'),
            orderBy('createdAt', 'desc'),
            limit(maxEvents)
        );
        const snap = await getDocs(q);
        const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const dailyCounts = {}; // { date: { date, views, whatsapp, inApp, replies, referrals, totalClicks } }
        const sellerStats = {}; // { sellerId: { sellerId, whatsapp, inApp, totalClicks, sellerName } }
        const productStats = {}; // { productId: { productId, title, views, whatsapp, inApp } }

        let totalViews = 0;
        let totalWhatsApp = 0;
        let totalInApp = 0;
        let totalReplies = 0;
        let totalReferrals = 0;

        events.forEach(ev => {
            const date = ev.date || (ev.createdAt?.toDate ? ev.createdAt.toDate().toISOString().slice(0, 10) : 'Recent');
            if (!dailyCounts[date]) {
                dailyCounts[date] = {
                    date,
                    views: 0,
                    whatsapp: 0,
                    inApp: 0,
                    replies: 0,
                    referrals: 0,
                    totalClicks: 0
                };
            }

            if (ev.eventType === 'product_viewed') {
                dailyCounts[date].views++;
                totalViews++;
            } else if (ev.eventType === 'whatsapp_clicked') {
                dailyCounts[date].whatsapp++;
                dailyCounts[date].totalClicks++;
                totalWhatsApp++;
            } else if (ev.eventType === 'in_app_ask_clicked') {
                dailyCounts[date].inApp++;
                dailyCounts[date].totalClicks++;
                totalInApp++;
            } else if (ev.eventType === 'seller_replied') {
                dailyCounts[date].replies++;
                totalReplies++;
            } else if (ev.eventType === 'referral_signup') {
                dailyCounts[date].referrals++;
                totalReferrals++;
            }

            // Group clicks per seller
            if (ev.sellerId && (ev.eventType === 'whatsapp_clicked' || ev.eventType === 'in_app_ask_clicked')) {
                if (!sellerStats[ev.sellerId]) {
                    sellerStats[ev.sellerId] = {
                        sellerId: ev.sellerId,
                        sellerName: ev.metadata?.sellerName || `Seller (${ev.sellerId.slice(0, 6)})`,
                        whatsapp: 0,
                        inApp: 0,
                        totalClicks: 0
                    };
                }
                if (ev.eventType === 'whatsapp_clicked') {
                    sellerStats[ev.sellerId].whatsapp++;
                    sellerStats[ev.sellerId].totalClicks++;
                } else {
                    sellerStats[ev.sellerId].inApp++;
                    sellerStats[ev.sellerId].totalClicks++;
                }
            }

            // Group views and inquiries per product
            if (ev.productId) {
                if (!productStats[ev.productId]) {
                    productStats[ev.productId] = {
                        productId: ev.productId,
                        title: ev.metadata?.title || 'Product listing',
                        views: 0,
                        whatsapp: 0,
                        inApp: 0
                    };
                }
                if (ev.eventType === 'product_viewed') {
                    productStats[ev.productId].views++;
                } else if (ev.eventType === 'whatsapp_clicked') {
                    productStats[ev.productId].whatsapp++;
                } else if (ev.eventType === 'in_app_ask_clicked') {
                    productStats[ev.productId].inApp++;
                }
            }
        });

        const sortedDaily = Object.values(dailyCounts).sort((a, b) => b.date.localeCompare(a.date));
        const sortedSellers = Object.values(sellerStats).sort((a, b) => b.totalClicks - a.totalClicks);
        const sortedProducts = Object.values(productStats).sort((a, b) => b.views - a.views);

        return {
            totalEvents: events.length,
            totals: {
                views: totalViews,
                whatsapp: totalWhatsApp,
                inApp: totalInApp,
                replies: totalReplies,
                referrals: totalReferrals,
                totalClicks: totalWhatsApp + totalInApp
            },
            daily: sortedDaily,
            sellers: sortedSellers,
            products: sortedProducts,
        };
    } catch (err) {
        console.error('[ANALYTICS] Error fetching summary:', err);
        return {
            totalEvents: 0,
            totals: { views: 0, whatsapp: 0, inApp: 0, replies: 0, referrals: 0, totalClicks: 0 },
            daily: [],
            sellers: [],
            products: []
        };
    }
}
