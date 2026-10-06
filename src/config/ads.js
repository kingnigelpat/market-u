// ─────────────────────────────────────────────────────────────
// Advertising configuration
// MarketU is free for sellers (posting + verification).
// The only paid product is the homepage banner ad.
// ─────────────────────────────────────────────────────────────

export const AD_PRICE_PER_WEEK = 500; // ₦ per week
export const AD_MAX_WEEKS = 4;
export const AD_MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
export const AD_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AD_RECOMMENDED_SIZE = '1200 × 400 px';

export const SUPPORT_WHATSAPP = '2347073544811';

// Bank details shown to advertisers for manual transfer payments.
// Set these in your .env / Vercel env vars:
//   VITE_AD_BANK_NAME, VITE_AD_ACCOUNT_NUMBER, VITE_AD_ACCOUNT_NAME
// If not set, the Advertise page asks the advertiser to request details on WhatsApp.
export const AD_BANK_DETAILS = {
    bankName: import.meta.env.VITE_AD_BANK_NAME || '',
    accountNumber: import.meta.env.VITE_AD_ACCOUNT_NUMBER || '',
    accountName: import.meta.env.VITE_AD_ACCOUNT_NAME || '',
};

export const hasBankDetails = () =>
    Boolean(AD_BANK_DETAILS.bankName && AD_BANK_DETAILS.accountNumber && AD_BANK_DETAILS.accountName);

export const formatNaira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
