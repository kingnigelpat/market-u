import { auth } from '../firebase';

// Must match ESCROW_FEE_PERCENT / ESCROW_FEE_CAP_NAIRA in api/escrow.js
export const SAFE_PAY_FEE_PERCENT = 3;
export const SAFE_PAY_FEE_CAP = 1500;

export function computeSafePayFee(priceNaira) {
    const price = Number(priceNaira) || 0;
    return Math.min(Math.round(price * SAFE_PAY_FEE_PERCENT) / 100, SAFE_PAY_FEE_CAP);
}

export const ESCROW_STATUS = {
    pending_payment: { label: 'Awaiting payment', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
    paid_held: { label: 'Paid — money held safely', color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
    disputed: { label: 'Under review', color: '#D97706', bg: 'rgba(245,158,11,0.14)' },
    released: { label: 'Released — payout due', color: '#059669', bg: 'rgba(16,185,129,0.12)' },
    paid_out: { label: 'Completed — seller paid', color: '#047857', bg: 'rgba(16,185,129,0.18)' },
    refunded: { label: 'Refunded to buyer', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
    cancelled: { label: 'Cancelled', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
    flagged: { label: 'Flagged — admin check', color: '#DC2626', bg: 'rgba(239,68,68,0.12)' },
};

export const formatNaira = (kobo) =>
    `₦${(Number(kobo || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export async function callEscrow(action, payload = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error('Please log in first.');
    const token = await user.getIdToken();
    const resp = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...payload }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
}

