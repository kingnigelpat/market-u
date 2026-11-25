import { auth } from '../firebase';

export const DEFAULT_FOOD_ORDER_FEE = 550;

export const FOOD_ORDER_STATUS = {
    new: { label: 'New Order', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
    accepted: { label: 'Accepted', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.12)' },
    preparing: { label: 'Preparing', color: '#D97706', bg: 'rgba(245, 158, 11, 0.14)' },
    out_for_delivery: { label: 'Out for Delivery', color: '#0891B2', bg: 'rgba(8, 145, 178, 0.14)' },
    completed: { label: 'Delivered', color: '#059669', bg: 'rgba(16, 185, 129, 0.14)' },
    cancelled: { label: 'Cancelled', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)' },
};

export function formatNaira(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num)) return '₦0';
    return '₦' + Math.round(num).toLocaleString('en-NG');
}

export async function callFoodOrderApi(action, payload = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error('Please log in first to place a food order.');
    const token = await user.getIdToken();

    const res = await fetch('/api/food-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...payload }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'Could not process food order.');
    }
    return data;
}
