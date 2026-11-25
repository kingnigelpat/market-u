/**
 * /api/escrow.js — MarketU "Safe Pay" escrow (Paystack)
 *
 * Flow:
 *   1. init            (buyer)  -> creates escrow order, returns Paystack checkout URL
 *   2. verify          (buyer)  -> after Paystack redirect, confirms payment -> status "paid_held"
 *   3. seller_delivered(seller) -> seller marks item as handed over (optional)
 *   4. confirm         (buyer)  -> buyer confirms they received the item -> status "released" (payout due to seller)
 *   5. dispute         (buyer)  -> buyer reports a problem -> status "disputed" (admin reviews)
 *   6. admin_release / admin_refund / admin_mark_paid_out (admin only)
 *
 * Money is held in the MarketU Paystack balance until the buyer confirms or admin resolves.
 * Prices are always read from Firestore on the server — never trusted from the client.
 */

import { getFirebaseAdmin, verifyAuth } from './_firebase.js';

const PAYSTACK_BASE = 'https://api.paystack.co';
export const ESCROW_FEE_PERCENT = 3;      // Safe Pay fee paid by buyer
export const ESCROW_FEE_CAP_NAIRA = 1500; // fee never exceeds ₦1,500

function computeFeeKobo(itemKobo) {
    const fee = Math.round(itemKobo * (ESCROW_FEE_PERCENT / 100));
    return Math.min(fee, ESCROW_FEE_CAP_NAIRA * 100);
}

async function paystack(path, { method = 'GET', body } = {}) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        const err = new Error('Paystack is not configured on the server (PAYSTACK_SECRET_KEY missing).');
        err.statusCode = 500;
        throw err;
    }
    const resp = await fetch(`${PAYSTACK_BASE}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json.status === false) {
        const err = new Error(json.message || `Paystack request failed (${resp.status})`);
        err.statusCode = 502;
        throw err;
    }
    return json.data;
}

async function notifyUser(adminApp, uid, title, body, link) {
    try {
        const snap = await adminApp.firestore().collection('users').doc(uid).get();
        if (!snap.exists) return;
        const data = snap.data() || {};
        const tokens = new Set();
        if (Array.isArray(data.fcmTokens)) data.fcmTokens.forEach(t => typeof t === 'string' && t && tokens.add(t));
        if (typeof data.fcmToken === 'string' && data.fcmToken) tokens.add(data.fcmToken);
        if (tokens.size === 0) return;
        await adminApp.messaging().sendEachForMulticast({
            tokens: [...tokens],
            notification: { title, body },
            data: { link: link || '/orders' },
            webpush: { fcmOptions: { link: link || '/orders' } },
        });
    } catch (e) {
        console.warn('[ESCROW] notify failed:', e.message);
    }
}

async function isAdminUser(db, uid) {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists && String(snap.data()?.role || '').trim().toLowerCase() === 'admin';
}

/**
 * Marks an order as paid after verifying it directly with Paystack.
 * Shared by the "verify" action and the Paystack webhook.
 */
export async function markOrderPaidFromPaystack(adminApp, reference) {
    const db = adminApp.firestore();
    const ref = db.collection('escrow_orders').doc(reference);
    const tx = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);

    const result = await db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
        const order = snap.data();

        if (order.status !== 'pending_payment') {
            return { order, changed: false };
        }
        if (tx.status !== 'success') {
            return { order: { ...order, paystackStatus: tx.status }, changed: false };
        }
        if (Number(tx.amount) !== Number(order.totalAmount) || tx.currency !== 'NGN') {
            t.update(ref, {
                status: 'flagged',
                flagReason: `Amount/currency mismatch: paid ${tx.amount} ${tx.currency}, expected ${order.totalAmount} NGN`,
                updatedAt: adminApp.firestore.FieldValue.serverTimestamp(),
            });
            return { order: { ...order, status: 'flagged' }, changed: true };
        }

        const updates = {
            status: 'paid_held',
            paystackStatus: tx.status,
            paystackTransactionId: tx.id || null,
            paidAt: adminApp.firestore.FieldValue.serverTimestamp(),
            updatedAt: adminApp.firestore.FieldValue.serverTimestamp(),
            history: adminApp.firestore.FieldValue.arrayUnion({ status: 'paid_held', at: new Date().toISOString(), by: 'paystack' }),
        };
        t.update(ref, updates);
        return { order: { ...order, status: 'paid_held' }, changed: true };
    });

    if (result.changed && result.order.status === 'paid_held') {
        notifyUser(adminApp, result.order.sellerId,
            'New Safe Pay order 💰',
            `${result.order.buyerName || 'A buyer'} paid for "${result.order.productTitle}". Money is held safely — hand over the item to get paid.`,
            '/orders');
    }
    return result.order;
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
    } catch (e) {
        return res.status(e.statusCode || 401).json({ error: e.message });
    }

    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    const FieldValue = adminApp.firestore.FieldValue;
    const { action, productId, reference, reason } = req.body || {};

    try {
        // ── 1. INIT ────────────────────────────────────────────────────────────
        if (action === 'init') {
            if (!productId || typeof productId !== 'string') {
                return res.status(400).json({ error: 'productId is required' });
            }
            const productSnap = await db.collection('products').doc(productId).get();
            if (!productSnap.exists) return res.status(404).json({ error: 'Product not found' });
            const product = productSnap.data();

            if (product.sellerId === caller.uid) {
                return res.status(400).json({ error: 'You cannot buy your own listing.' });
            }
            const stock = product.stock === undefined ? null : Number(product.stock);
            if (stock !== null && stock <= 0) {
                return res.status(400).json({ error: 'This item is out of stock.' });
            }
            const priceNaira = Number(String(product.price).replace(/,/g, ''));
            if (!Number.isFinite(priceNaira) || priceNaira < 100) {
                return res.status(400).json({ error: 'This item has an invalid price for Safe Pay (minimum ₦100).' });
            }

            const buyerSnap = await db.collection('users').doc(caller.uid).get();
            const buyer = buyerSnap.exists ? buyerSnap.data() : {};
            const email = caller.email || buyer.email;
            if (!email) return res.status(400).json({ error: 'Your account has no email address.' });

            const itemAmount = Math.round(priceNaira * 100);
            const feeAmount = computeFeeKobo(itemAmount);
            const totalAmount = itemAmount + feeAmount;
            const ref = `MU-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

            const origin = (req.headers.origin && /^https?:\/\//.test(req.headers.origin))
                ? req.headers.origin
                : (process.env.APP_URL || 'https://market-u.vercel.app');
            const callbackUrl = `${origin}/orders`;

            await db.collection('escrow_orders').doc(ref).set({
                reference: ref,
                status: 'pending_payment',
                buyerId: caller.uid,
                buyerName: buyer.name || caller.name || 'Buyer',
                buyerEmail: email,
                buyerPhone: buyer.phone || '',
                sellerId: product.sellerId,
                sellerName: product.sellerName || 'Seller',
                sellerPhone: product.sellerPhone || '',
                productId,
                productTitle: product.title || 'Item',
                productImage: (Array.isArray(product.images) && product.images[0]) || product.image || '',
                schoolName: product.schoolName || '',
                itemAmount,
                feeAmount,
                totalAmount,
                currency: 'NGN',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                history: [{ status: 'pending_payment', at: new Date().toISOString(), by: caller.uid }],
            });

            const init = await paystack('/transaction/initialize', {
                method: 'POST',
                body: {
                    email,
                    amount: totalAmount,
                    currency: 'NGN',
                    reference: ref,
                    callback_url: callbackUrl,
                    metadata: {
                        escrow: true,
                        productId,
                        buyerId: caller.uid,
                        sellerId: product.sellerId,
                        custom_fields: [
                            { display_name: 'Item', variable_name: 'item', value: product.title || 'Item' },
                            { display_name: 'Protection', variable_name: 'protection', value: 'MarketU Safe Pay (Escrow)' },
                        ],
                    },
                },
            });

            return res.status(200).json({ reference: ref, authorizationUrl: init.authorization_url });
        }

        // Everything below needs an existing order
        if (!reference || typeof reference !== 'string') {
            return res.status(400).json({ error: 'reference is required' });
        }
        const orderRef = db.collection('escrow_orders').doc(reference);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' });
        const order = orderSnap.data();
        const callerIsAdmin = await isAdminUser(db, caller.uid);
        const isBuyer = order.buyerId === caller.uid;
        const isSeller = order.sellerId === caller.uid;

        const transition = async (from, to, extra = {}) => {
            await db.runTransaction(async (t) => {
                const s = await t.get(orderRef);
                const cur = s.data();
                if (!from.includes(cur.status)) {
                    throw Object.assign(new Error(`Order is "${cur.status}" — this action is not allowed now.`), { statusCode: 409 });
                }
                t.update(orderRef, {
                    status: to,
                    ...extra,
                    updatedAt: FieldValue.serverTimestamp(),
                    history: FieldValue.arrayUnion({ status: to, at: new Date().toISOString(), by: caller.uid }),
                });
            });
        };

        // ── 2. VERIFY ──────────────────────────────────────────────────────────
        if (action === 'verify') {
            if (!isBuyer && !callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });
            const updated = await markOrderPaidFromPaystack(adminApp, reference);
            return res.status(200).json({ status: updated.status });
        }

        // ── 3. SELLER MARKS DELIVERED ──────────────────────────────────────────
        if (action === 'seller_delivered') {
            if (!isSeller) return res.status(403).json({ error: 'Only the seller can do this.' });
            if (order.status !== 'paid_held') return res.status(409).json({ error: 'Order is not awaiting delivery.' });
            await orderRef.update({
                sellerMarkedDeliveredAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                history: FieldValue.arrayUnion({ status: 'seller_marked_delivered', at: new Date().toISOString(), by: caller.uid }),
            });
            notifyUser(adminApp, order.buyerId, 'Seller says item was handed over',
                `Did you receive "${order.productTitle}"? Confirm in MarketU so the seller gets paid.`, '/orders');
            return res.status(200).json({ ok: true });
        }

        // ── 4. BUYER CONFIRMS RECEIPT → RELEASE ────────────────────────────────
        if (action === 'confirm') {
            if (!isBuyer) return res.status(403).json({ error: 'Only the buyer can confirm receipt.' });
            await transition(['paid_held'], 'released', { releasedAt: FieldValue.serverTimestamp(), releasedBy: 'buyer' });
            // Count a real, money-backed completed sale for the seller
            await db.collection('publicProfiles').doc(order.sellerId).set({ completedSalesCount: FieldValue.increment(1) }, { merge: true }).catch(() => {});
            await db.collection('users').doc(order.sellerId).set({ completedSalesCount: FieldValue.increment(1) }, { merge: true }).catch(() => {});
            notifyUser(adminApp, order.sellerId, 'Payment released ✅',
                `The buyer confirmed "${order.productTitle}". Your payout is being processed.`, '/orders');
            return res.status(200).json({ status: 'released' });
        }

        // ── 5. BUYER DISPUTE ───────────────────────────────────────────────────
        if (action === 'dispute') {
            if (!isBuyer) return res.status(403).json({ error: 'Only the buyer can open a dispute.' });
            const cleanReason = String(reason || '').slice(0, 500) || 'No reason given';
            await transition(['paid_held'], 'disputed', { disputeReason: cleanReason, disputedAt: FieldValue.serverTimestamp() });
            notifyUser(adminApp, order.sellerId, 'Order under review',
                `The buyer reported a problem with "${order.productTitle}". MarketU will contact you.`, '/orders');
            return res.status(200).json({ status: 'disputed' });
        }

        // ── 6. ADMIN ACTIONS ───────────────────────────────────────────────────
        if (action === 'admin_release') {
            if (!callerIsAdmin) return res.status(403).json({ error: 'Admin only' });
            await transition(['paid_held', 'disputed'], 'released', { releasedAt: FieldValue.serverTimestamp(), releasedBy: 'admin' });
            notifyUser(adminApp, order.sellerId, 'Payment released ✅', `MarketU released payment for "${order.productTitle}".`, '/orders');
            return res.status(200).json({ status: 'released' });
        }

        if (action === 'admin_refund') {
            if (!callerIsAdmin) return res.status(403).json({ error: 'Admin only' });
            if (!['paid_held', 'disputed'].includes(order.status)) {
                return res.status(409).json({ error: `Cannot refund an order that is "${order.status}".` });
            }
            const refund = await paystack('/refund', { method: 'POST', body: { transaction: reference } });
            await transition(['paid_held', 'disputed'], 'refunded', {
                refundedAt: FieldValue.serverTimestamp(),
                paystackRefundId: refund?.id || null,
                refundNote: String(reason || '').slice(0, 300),
            });
            notifyUser(adminApp, order.buyerId, 'Refund issued 💸', `Your Safe Pay payment for "${order.productTitle}" is being refunded.`, '/orders');
            return res.status(200).json({ status: 'refunded' });
        }

        if (action === 'admin_mark_paid_out') {
            if (!callerIsAdmin) return res.status(403).json({ error: 'Admin only' });
            await transition(['released'], 'paid_out', { paidOutAt: FieldValue.serverTimestamp(), payoutNote: String(reason || '').slice(0, 300) });
            notifyUser(adminApp, order.sellerId, 'Payout sent 🎉', `Your money for "${order.productTitle}" has been sent.`, '/orders');
            return res.status(200).json({ status: 'paid_out' });
        }

        if (action === 'cancel') {
            if (!isBuyer) return res.status(403).json({ error: 'Forbidden' });
            await transition(['pending_payment'], 'cancelled');
            return res.status(200).json({ status: 'cancelled' });
        }

        return res.status(400).json({ error: 'Unknown action' });
    } catch (err) {
        console.error('[ESCROW] error:', err);
        return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
    }
}

