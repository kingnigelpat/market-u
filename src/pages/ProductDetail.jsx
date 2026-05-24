import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc, updateDoc, increment, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Trash2, Edit, Heart, CheckCircle, Loader } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import SellerRating from '../components/SellerRating';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AuthPromptModal from '../components/AuthPromptModal';
import ReadOnlyRating from '../components/ReadOnlyRating';
import { optimizeImage } from '../utils/cloudinary';
import { sendPushNotification } from '../utils/notifications';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, isAuthenticated, userName, userPhone, isSeller } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    // Interest state
    const [interestLoading, setInterestLoading] = useState(false);
    const [alreadyInterested, setAlreadyInterested] = useState(false);
    const [interestSuccess, setInterestSuccess] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const docRef = doc(db, 'products', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const productData = { id: docSnap.id, ...docSnap.data() };

                    // Increment real views (only if not the owner viewing their own product)
                    if (!currentUser || currentUser.uid !== productData.sellerId) {
                        try {
                            updateDoc(docRef, { views: increment(1) });
                            productData.views = (productData.views || 0) + 1;
                        } catch(e) { console.error("Error incrementing views", e); }
                    }

                    try {
                        const sellerRef = doc(db, 'users', productData.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            productData.sellerVerified = Boolean(sellerSnap.data().verified) || Boolean(productData.sellerVerified);
                        }
                    } catch (e) {
                        console.error("Could not fetch seller dynamically", e);
                    }

                    setProduct(productData);

                    // Check if current buyer already expressed interest
                    if (currentUser && currentUser.uid !== productData.sellerId) {
                        try {
                            const interestQuery = query(
                                collection(db, 'interests'),
                                where('buyerId', '==', currentUser.uid),
                                where('productId', '==', id)
                            );
                            const snap = await getDocs(interestQuery);
                            if (!snap.empty) setAlreadyInterested(true);
                        } catch (e) {
                            // If rules deny (e.g. seller viewing buyer interests), silently ignore
                        }
                    }
                } else {
                    console.error("No such product!");
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading product details...</div>;
    }

    if (!product) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Product not found.</div>;
    }

    const isOwner = currentUser && product && currentUser.uid === product.sellerId;

    const handleInterested = async () => {
        if (!isAuthenticated) {
            setShowPrompt(true);
            return;
        }

        if (isOwner) return; // Sellers can't be interested in their own product

        if (alreadyInterested || interestSuccess) return;

        setInterestLoading(true);
        try {
            const buyerName = userName || currentUser.displayName || 'A buyer';

            await addDoc(collection(db, 'interests'), {
                buyerId: currentUser.uid,
                buyerName,
                buyerPhone: userPhone || '',
                sellerId: product.sellerId,
                productId: id,
                productName: product.title,
                createdAt: serverTimestamp(),
                seen: false,
            });

            setInterestSuccess(true);
            setAlreadyInterested(true);

            // Send real push notification to seller on ALL their devices
            try {
                const sellerDoc = await getDoc(doc(db, 'users', product.sellerId));
                const fcmTokens = sellerDoc.data()?.fcmTokens || [];
                if (fcmTokens.length > 0) {
                    sendPushNotification(fcmTokens, buyerName, product.title);
                }
            } catch (e) {
                console.warn('Could not send push notification:', e);
            }
        } catch (error) {
            console.error("Error saving interest:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setInterestLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            setDeleting(true);
            try {
                await deleteDoc(doc(db, 'products', id));
                navigate('/dashboard');
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Failed to delete product.");
                setDeleting(false);
            }
        }
    };

    // Determine interest button state
    const isDone = alreadyInterested || interestSuccess;
    const isViewerSeller = isSeller;

    return (
        <div className="container">
            {/* Lightbox Modal */}
            {selectedImage && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.95)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        cursor: 'zoom-out'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <img 
                        src={optimizeImage(selectedImage, 1200)} 
                        alt="Enlarged product" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                    />
                    <button 
                        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'white', fontSize: '2rem' }}
                        onClick={() => setSelectedImage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            <button
                onClick={() => navigate(-1)}
                className="btn"
                style={{ margin: '1.5rem 0', color: 'var(--text-secondary)', paddingLeft: 0 }}
            >
                <ArrowLeft size={20} /> Back to market
            </button>

            <div className="product-detail-layout">
                {/* Images Section */}
                <div className="product-images-container">
                    {product.images && product.images.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {product.images.map((img, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => setSelectedImage(img)}
                                    style={{ 
                                        position: 'relative', 
                                        width: '100%', 
                                        borderRadius: 'var(--radius-xl)', 
                                        overflow: 'hidden', 
                                        backgroundColor: 'var(--surface-color)',
                                        cursor: 'zoom-in',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--shadow-sm)',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <img
                                        src={optimizeImage(img, 800)}
                                        alt={`${product.title} - view ${index + 1}`}
                                        style={{ width: '100%', height: 'auto', display: 'block', minHeight: '300px', maxHeight: '800px', objectFit: 'contain' }}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border-color)' }}>
                            No images available
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="product-info-container">
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
                            <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2.25rem)', fontWeight: '900', margin: 0, letterSpacing: '-0.03em', lineHeight: '1.1' }}>
                                {product.title}
                            </h1>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                            <div style={{ width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary-color)', border: '1px solid var(--border-color)' }}>
                                {product.sellerName ? product.sellerName.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{product.sellerName}</span>
                                    {product.sellerVerified && <VerifiedBadge size={16} />}
                                    <ReadOnlyRating sellerId={product.sellerId} />
                                </div>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Verified Campus Seller</span>
                                <SellerRating sellerId={product.sellerId} hideAverage={true} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Description</h3>
                            <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '1.0625rem' }}>{product.description}</p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: 'rgba(37, 99, 235, 0.03)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(37, 99, 235, 0.1)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Price</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary-color)', letterSpacing: '-0.03em' }}>
                                ₦{parseFloat(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* I'm Interested Button — only shown to non-owners */}
                        {!isOwner && (
                            <button
                                onClick={handleInterested}
                                disabled={interestLoading || isDone || isViewerSeller}
                                id="interested-btn"
                                style={{
                                    width: '100%',
                                    padding: '1.25rem',
                                    fontSize: '1.125rem',
                                    fontWeight: '700',
                                    borderRadius: 'var(--radius-lg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.625rem',
                                    border: 'none',
                                    cursor: isDone || isViewerSeller ? 'default' : 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    backgroundColor: isDone
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : isViewerSeller
                                        ? 'var(--surface-color)'
                                        : 'var(--primary-color)',
                                    color: isDone
                                        ? 'var(--success-color)'
                                        : isViewerSeller
                                        ? 'var(--text-secondary)'
                                        : 'white',
                                    boxShadow: isDone || isViewerSeller
                                        ? 'none'
                                        : '0 10px 20px -5px rgba(37, 99, 235, 0.35)',
                                    border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : isViewerSeller ? '1px solid var(--border-color)' : 'none',
                                }}
                            >
                                {interestLoading ? (
                                    <><Loader size={22} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                                ) : isDone ? (
                                    <><CheckCircle size={22} /> Interest Recorded!</>
                                ) : isViewerSeller ? (
                                    <><Heart size={22} /> Sellers can&apos;t express interest</>
                                ) : (
                                    <><Heart size={22} /> I&apos;m Interested</>
                                )}
                            </button>
                        )}

                        {/* Success sub-text */}
                        {interestSuccess && (
                            <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--success-color)', fontWeight: '600' }}>
                                ✅ The seller will be notified!
                            </p>
                        )}

                        {isOwner && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0' }}>
                                <Link
                                    to={`/edit-product/${id}`}
                                    className="btn btn-secondary"
                                    style={{ padding: '1rem', fontSize: '1rem', fontWeight: '600', justifyContent: 'center' }}
                                >
                                    <Edit size={18} />
                                    Edit Post
                                </Link>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="btn"
                                    style={{ padding: '1rem', fontSize: '1rem', fontWeight: '600', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
                                >
                                    <Trash2 size={18} />
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AuthPromptModal 
                isOpen={showPrompt} 
                onClose={() => setShowPrompt(false)} 
                message="Sign up to contact sellers and start using Market-U"
            />
        </div>
    );
};

export default ProductDetail;
