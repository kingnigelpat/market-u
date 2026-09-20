import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const DEFAULT_CAMPAIGN = {
    id: 'resumption-campaign',
    active: true,
    title: 'BACK TO CAMPUS',
    subtitle: 'New semester? Find the things you actually need.',
    badgeText: 'CAMPUS RESUMPTION',
    badgeIcon: '🎒',
    ctaText: 'Shop Resumption Essentials',
    ctaTarget: 'resumption',
    targetCategories: ['Fashion', 'Electronics', 'Home & Kitchen', 'Health & Beauty'],
    priority: 10,
    bannerImageUrl: '',
    mobileImageUrl: '',
    accentColor: '#2563EB',
    perks: [
        { label: 'Verified Sellers', icon: 'ShieldCheck' },
        { label: 'Campus Pickup', icon: 'MapPin' },
        { label: 'Direct WhatsApp', icon: 'MessageCircle' }
    ]
};

/**
 * Subscribes to the active campaign in Firestore.
 * If Firestore has no active campaigns or encounters an error, falls back to DEFAULT_CAMPAIGN.
 */
export function subscribeToActiveCampaign(callback) {
    try {
        const q = query(
            collection(db, 'campaigns'),
            where('active', '==', true)
        );

        return onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                callback(DEFAULT_CAMPAIGN);
                return;
            }

            const now = new Date().getTime();
            const validCampaigns = [];

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const start = data.startDate ? new Date(data.startDate).getTime() : null;
                const end = data.endDate ? new Date(data.endDate).getTime() : null;

                const isStarted = !start || now >= start;
                const isNotEnded = !end || now <= end;

                if (isStarted && isNotEnded) {
                    validCampaigns.push({
                        id: docSnap.id,
                        ...data
                    });
                }
            });

            if (validCampaigns.length === 0) {
                callback(DEFAULT_CAMPAIGN);
                return;
            }

            // Sort by priority descending
            validCampaigns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            callback(validCampaigns[0]);
        }, (error) => {
            console.warn('Could not read campaigns from Firestore (using fallback):', error);
            callback(DEFAULT_CAMPAIGN);
        });
    } catch (err) {
        console.warn('Error setting up campaign listener:', err);
        callback(DEFAULT_CAMPAIGN);
        return () => {};
    }
}

/**
 * Saves or updates campaign data in Firestore (admin only).
 */
export async function saveCampaignToFirestore(campaignData) {
    const docId = campaignData.id || 'resumption-campaign';
    const docRef = doc(db, 'campaigns', docId);

    const payload = {
        ...campaignData,
        id: docId,
        updatedAt: serverTimestamp()
    };

    await setDoc(docRef, payload, { merge: true });
    return docId;
}

/**
 * Curated buyer discovery collections based strictly on actual Market-U inventory.
 * Only returns collections that have at least 1 matching product.
 */
export function getActiveDiscoveryCollections(products) {
    if (!products || products.length === 0) return [];

    const definitions = [
        {
            key: 'fresh-fits',
            title: 'Fresh Fits',
            subtitle: 'Shoes, streetwear & bags',
            emoji: '👟',
            categories: ['Fashion'],
            filterFn: (p) => p.category === 'Fashion'
        },
        {
            key: 'tech-gadgets',
            title: 'Tech & Power',
            subtitle: 'Phones, chargers & audio',
            emoji: '⚡',
            categories: ['Electronics'],
            filterFn: (p) => p.category === 'Electronics'
        },
        {
            key: 'hostel-living',
            title: 'Hostel & Living',
            subtitle: 'Rooms, cooking & comfort',
            emoji: '🛏️',
            categories: ['Home & Kitchen', 'Hostels & Rooms'],
            filterFn: (p) => p.category === 'Home & Kitchen' || p.category === 'Hostels & Rooms'
        },
        {
            key: 'self-care',
            title: 'Self-Care & Daily',
            subtitle: 'Fragrances & grooming',
            emoji: '✨',
            categories: ['Health & Beauty'],
            filterFn: (p) => p.category === 'Health & Beauty'
        }
    ];

    return definitions
        .map((def) => {
            const matchingProducts = products.filter(def.filterFn);
            return {
                ...def,
                count: matchingProducts.length,
                previewImages: matchingProducts
                    .map((p) => (p.images && p.images[0]) || null)
                    .filter(Boolean)
                    .slice(0, 3)
            };
        })
        .filter((col) => col.count > 0);
}
