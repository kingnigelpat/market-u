/**
 * Normalizes and validates a seller's phone number for WhatsApp direct link.
 * Supports standard international formats (e.g. 2348012345678)
 * and auto-converts local Nigerian numbers (e.g. 08012345678 -> 2348012345678).
 *
 * @param {string} phone
 * @returns {string|null} Valid numeric phone number with country code, or null if invalid
 */
export function formatWhatsAppNumber(phone) {
    if (!phone || typeof phone !== 'string') return null;

    // Strip non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Convert local Nigerian format (080..., 070..., 090..., 081..., etc.) to 234...
    if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '234' + cleaned.slice(1);
    }

    // Must be between 10 and 15 digits (standard E.164 phone length without '+')
    if (cleaned.length >= 10 && cleaned.length <= 15) {
        return cleaned;
    }

    return null;
}
