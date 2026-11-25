/**
 * /api/paystack-webhook.js — Paystack webhook receiver
 * Set this URL in Paystack Dashboard → Settings → API Keys & Webhooks:
 *   https://<your-domain>/api/paystack-webhook
 *
 * Backup for the redirect flow: if a buyer closes the tab after paying,
 * Paystack still tells us and the order moves to "paid_held".
 */
import crypto from 'crypto';
import { getFirebaseAdmin } from './_firebase.js';
import { markOrderPaidFromPaystack } from './escrow.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return res.status(500).end();

    const signature = req.headers['x-paystack-signature'];
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    if (!signature || signature !== expected) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    try {
        if (event?.event === 'charge.success' && event?.data?.reference?.startsWith('MU-')) {
            // Re-verifies directly with Paystack before changing anything
            await markOrderPaidFromPaystack(getFirebaseAdmin(), event.data.reference);
        }
    } catch (e) {
        console.error('[PAYSTACK WEBHOOK] error:', e.message);
    }
    // Always 200 so Paystack doesn't keep retrying events we can't use
    return res.status(200).json({ received: true });
}

