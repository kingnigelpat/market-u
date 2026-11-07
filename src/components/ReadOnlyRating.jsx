import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Star } from 'lucide-react';

const ReadOnlyRating = ({ sellerId }) => {
    const [rating, setRating] = useState({ score: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sellerId) {
            setLoading(false);
            return;
        }

        const fetchRatings = async () => {
            try {
                const q = query(collection(db, 'ratings'), where('sellerId', '==', sellerId));
                const querySnapshot = await getDocs(q);
                
                let totalScore = 0;
                let count = 0;

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    totalScore += data.stars || 0;
                    count += 1;
                });

                setRating({ score: totalScore, count });
            } catch (error) {
                console.error("Error fetching seller ratings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRatings();
    }, [sellerId]);

    if (loading) return null;

    const averageRating = rating.count > 0 ? (rating.score / rating.count).toFixed(1) : 0;

    if (averageRating === 0) return null;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
            <Star size={12} fill="#f59e0b" color="#f59e0b" />
            <span style={{ fontWeight: '700', color: 'var(--text)' }}>{averageRating}</span>
            <span>({rating.count})</span>
        </span>
    );
};

export default ReadOnlyRating;
