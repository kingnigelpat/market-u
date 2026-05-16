import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Star } from 'lucide-react';

const SellerRating = ({ sellerId }) => {
    const [rating, setRating] = useState({ score: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sellerId) return;

        const fetchRating = async () => {
            try {
                const sellerDoc = await getDoc(doc(db, 'users', sellerId));
                if (sellerDoc.exists()) {
                    const data = sellerDoc.data();
                    setRating({
                        score: data.ratingScore || 0,
                        count: data.ratingCount || 0
                    });
                }
            } catch (error) {
                console.error("Error fetching seller rating:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRating();
    }, [sellerId]);

    if (loading) return <div style={{ height: '24px' }}></div>;

    const averageRating = rating.score > 0 ? Number(rating.score).toFixed(1) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#f59e0b' }}>
                    <Star size={16} fill="#f59e0b" />
                    <span style={{ fontWeight: '800', marginLeft: '0.25rem', color: 'var(--text-primary)' }}>
                        {averageRating > 0 ? averageRating : 'New'}
                    </span>
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
                </span>
            </div>
        </div>
    );
};

export default SellerRating;
