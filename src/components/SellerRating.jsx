import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from './AuthPromptModal';

const SellerRating = ({ sellerId }) => {
    const { currentUser, isAuthenticated } = useAuth();
    const [rating, setRating] = useState({ score: 0, count: 0 });
    const [userHasRated, setUserHasRated] = useState(false);
    const [hoverStar, setHoverStar] = useState(0);
    const [showPrompt, setShowPrompt] = useState(false);
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

                    if (currentUser && data.ratedBy && data.ratedBy.includes(currentUser.uid)) {
                        setUserHasRated(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching seller rating:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRating();
    }, [sellerId, currentUser]);

    const handleRate = async (stars) => {
        if (!isAuthenticated) {
            setShowPrompt(true);
            return;
        }

        if (userHasRated || !currentUser) return;
        
        if (currentUser.uid === sellerId) {
            alert("You cannot rate yourself.");
            return;
        }

        // Optimistic UI update
        setUserHasRated(true);
        setRating(prev => ({
            score: prev.score + stars,
            count: prev.count + 1
        }));

        try {
            const sellerRef = doc(db, 'users', sellerId);
            
            await updateDoc(sellerRef, {
                ratingScore: increment(stars),
                ratingCount: increment(1),
                ratedBy: arrayUnion(currentUser.uid)
            });
            
        } catch (error) {
            console.error("Error rating seller:", error);
            // Revert optimistic update
            setUserHasRated(false);
            setRating(prev => ({
                score: prev.score - stars,
                count: prev.count - 1
            }));
            alert("Failed to submit rating. Please try again.");
        }
    };

    if (loading) return <div style={{ height: '24px' }}></div>;

    const averageRating = rating.count > 0 ? (rating.score / rating.count).toFixed(1) : 0;
    const isOwner = currentUser && currentUser.uid === sellerId;

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

            {(!isOwner && !userHasRated) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Rate seller:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRate(star)}
                            onMouseEnter={() => setHoverStar(star)}
                            onMouseLeave={() => setHoverStar(0)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.1rem',
                                color: star <= hoverStar ? '#f59e0b' : '#cbd5e1',
                                transition: 'color 0.2s',
                                display: 'flex'
                            }}
                            title={`Rate ${star} stars`}
                        >
                            <Star size={18} fill={star <= hoverStar ? '#f59e0b' : 'none'} />
                        </button>
                    ))}
                </div>
            )}
            
            {userHasRated && !isOwner && (
                <div style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ✓ You rated this seller
                </div>
            )}

            <AuthPromptModal 
                isOpen={showPrompt} 
                onClose={() => setShowPrompt(false)} 
                message="Sign up to rate sellers and help the community!"
            />
        </div>
    );
};

export default SellerRating;
