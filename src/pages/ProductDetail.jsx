import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, deleteDoc, updateDoc, increment, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Trash2, Edit, Loader, AlertCircle, Bookmark, BookmarkCheck, Share2, Check, ExternalLink, MessageCircle, GraduationCap, Lock } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import SellerRating from '../components/SellerRating';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AuthPromptModal from '../components/AuthPromptModal';
import ReadOnlyRating from '../components/ReadOnlyRating';
import { optimizeImage } from '../utils/cloudinary';
import { sendPushNotification } from '../utils/notifications';
import NotificationPermissionPrompt from '../components/NotificationPermissionPrompt';
import ProductChat from '../components/ProductChat';
import { formatWhatsAppNumber } from '../utils/phoneUtils';
import { logEvent } from '../utils/analyticsService';
import { qualifyReferralAction } from '../utils/referralService';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, isAuthenticated, userName, userPhone, enableNotifications } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    // Interest state
    const [interestLoading, setInterestLoading] = useState(false);
    const [alreadyInterested, setAlreadyInterested] = useState(false);

    // Save for Later state
    const [saved, setSaved] = useState(false);
    const [savedDocId, setSavedDocId] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [shareToast, setShareToast] = useState(false);
    const [showNotifPrompt, setShowNotifPrompt] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [askedInApp, setAskedInApp] = useState(false);
    // WhatsApp unlocks only after the buyer has sent at least one in-app message
    const [whatsappUnlocked, setWhatsappUnlocked] = useState(false);

    // Auto-open chat if navigated from notification (?chat=true)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('chat') === 'true') {
            setShowChat(true);
        }
    }, [location.search]);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const docRef = doc(db, 'products', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const productData = { id: docSnap.id, ...docSnap.data() };

                    // Increment real views — requires auth in Firestore rules, so only run for signed-in non-owners
                    if (currentUser && currentUser.uid !== productData.sellerId) {
                        try {
                            await updateDoc(docRef, { views: increment(1) });
                            productData.views = (productData.views || 0) + 1;
                        } catch(e) { console.error('Error incrementing views', e); }
                    }

                    // Fetch live seller verified status and phone from public profile
                    try {
                        const sellerRef = doc(db, 'publicProfiles', productData.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            const sData = sellerSnap.data();
                            productData.sellerVerified = Boolean(sData.verified) || Boolean(productData.sellerVerified);
                            if (!productData.sellerPhone && sData.phone) {
                                productData.sellerPhone = sData.phone;
                            }
                            if (sData.avgReplyMinutes) {
                                productData.avgReplyMinutes = sData.avgReplyMinutes;
                            }
                        }
                    } catch (e) {
                        console.warn("Could not fetch seller public profile", e);
                    }

                    setProduct(productData);
                    const numPrice = parseFloat(productData.price);
                    const priceTag = !isNaN(numPrice) ? ` • ₦${numPrice.toLocaleString('en-NG')}` : '';
                    document.title = `${productData.title}${priceTag} | Market-U`;

                    // Log product viewed event (Task 2) and qualify referral action (Task 3)
                    logEvent({
                        eventType: 'product_viewed',
                        userId: currentUser?.uid,
                        sellerId: productData.sellerId,
                        productId: productData.id,
                        metadata: { title: productData.title, price: productData.price }
                    });
                    if (currentUser?.uid) {
                        qualifyReferralAction(currentUser.uid, 'product_viewed');
                    }

                    // Check if current buyer already expressed interest
                    if (currentUser && currentUser.uid !== productData.sellerId) {
                        try {
                            const interestQuery = query(
                                collection(db, 'interests'),
                                where('buyerId', '==', currentUser.uid),
                                where('productId', '==', id)
                            );
                            const snap = await getDocs(interestQuery);
                            if (!snap.empty) {
                                const docData = snap.docs[0].data();
                                setAlreadyInterested(!docData.canceled);
                            }
                        } catch {
                            // If rules deny (e.g. seller viewing buyer interests), silently ignore
                        }

                        // Has this buyer already messaged the seller about this product? (unlocks WhatsApp)
                        try {
                            const chatSnap = await getDoc(doc(db, 'chats', `${id}_${currentUser.uid}`));
                            if (chatSnap.exists() && chatSnap.data().lastMessage) {
                                setWhatsappUnlocked(true);
                            }
                        } catch { /* no chat yet or not readable */ }

                        // Check if buyer already saved this product
                        try {
                            const savedQuery = query(
                                collection(db, 'savedItems'),
                                where('buyerId', '==', currentUser.uid),
                                where('productId', '==', id)
                            );
                            const savedSnap = await getDocs(savedQuery);
                            if (!savedSnap.empty) {
                                setSaved(true);
                                setSavedDocId(savedSnap.docs[0].id);
                            }
                        } catch { /* silently ignore */ }
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

    // Normalized seller phone for WhatsApp
    const cleanSellerPhone = formatWhatsAppNumber(product?.sellerPhone);

    const handleWhatsAppChat = () => {
        if (!cleanSellerPhone || !product) return;
        if (!isAuthenticated) {
            setShowPrompt(true);
            return;
        }
        if (!whatsappUnlocked) {
            setShowChat(true);
            return;
        }
        
        logEvent({
            eventType: 'whatsapp_clicked',
            userId: currentUser?.uid,
            sellerId: product.sellerId,
            productId: product.id,
            metadata: { title: product.title, phone: cleanSellerPhone }
        });
        if (currentUser?.uid) {
            qualifyReferralAction(currentUser.uid, 'whatsapp_clicked');
        }

        const productLink = window.location.href.split('?')[0];
        const prefilledMsg = `Hi, I saw ${product.title} on Market-U. Is it still available? ${productLink}`;
        const whatsappUrl = `https://wa.me/${cleanSellerPhone}?text=${encodeURIComponent(prefilledMsg)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const handleAskInApp = async () => {
        if (!isAuthenticated) {
            setShowPrompt(true);
            return;
        }

        if (isOwner) return;

        if (showChat) {
            setShowChat(false);
            return;
        }

        setShowChat(true);
        setAskedInApp(true);

        logEvent({
            eventType: 'in_app_ask_clicked',
            userId: currentUser?.uid,
            sellerId: product.sellerId,
            productId: product.id,
            metadata: { title: product.title }
        });
        qualifyReferralAction(currentUser.uid, 'in_app_ask_clicked');

        if (!alreadyInterested) {
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
                    canceled: false,
                    questionText: 'Is this available?'
                });
                setAlreadyInterested(true);

                // Send push notification to seller securely
                if (product.sellerId) {
                    sendPushNotification({
                        recipientUserId: product.sellerId,
                        type: 'interest',
                        buyerName,
                        productName: product.title,
                        productId: id,
                        text: 'Is this available?',
                        link: `/product/${id}?chat=true`
                    }).catch(e => console.warn('Push notification failed:', e));
                }
            } catch (error) {
                console.error("Error sending in-app inquiry:", error);
            } finally {
                setInterestLoading(false);
            }
        }
    };

    const handleSaveLater = async () => {
        if (!isAuthenticated) {
            setShowPrompt(true);
            return;
        }
        if (isOwner) return;
        setSaveLoading(true);
        setSaveError('');
        try {
            if (saved && savedDocId) {
                // Unsave
                await deleteDoc(doc(db, 'savedItems', savedDocId));
                setSaved(false);
                setSavedDocId(null);
            } else {
                // Save
                const ref = await addDoc(collection(db, 'savedItems'), {
                    buyerId: currentUser.uid,
                    productId: id,
                    productTitle: product.title,
                    productPrice: product.price,
                    productImage: product.images?.[0] || '',
                    sellerName: product.sellerName,
                    sellerId: product.sellerId,
                    savedAt: serverTimestamp(),
                });
                setSaved(true);
                setSavedDocId(ref.id);

                // 🎯 Trojan Horse: nudge buyer to allow notifications after saving
                if ('Notification' in window && Notification.permission === 'default') {
                    // Small delay so the save animation is seen first
                    setTimeout(() => setShowNotifPrompt(true), 600);
                }
            }
        } catch (e) {
            console.error('Save for later error:', e);
            setSaveError('Could not save — check your connection and try again.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleShare = async () => {
        if (!product) return;
        const numPrice = parseFloat(product.price);
        const formattedPrice = !isNaN(numPrice) ? `₦${numPrice.toLocaleString('en-NG')}` : '';
        const shareUrl = window.location.href;
        const shareText = formattedPrice
            ? `🔥 Check out "${product.title}" (${formattedPrice}) on Market-U!`
            : `🔥 Check out "${product.title}" on Market-U!`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: formattedPrice ? `${product.title} • ${formattedPrice} | Market-U` : `${product.title} | Market-U`,
                    text: shareText,
                    url: shareUrl,
                });
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn('Share cancelled or failed:', err);
                }
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2500);
        } catch (err) {
            console.error('Clipboard copy failed:', err);
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

    return (
        <div className="container">
            {/* Notification Permission Prompt (Trojan Horse) */}
            {showNotifPrompt && (
                <NotificationPermissionPrompt
                    onAllow={enableNotifications}
                    onDismiss={() => setShowNotifPrompt(false)}
                />
            )}

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
                        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'white', fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                        onClick={() => setSelectedImage(null)}
                        aria-label="Close image"
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
                                        backgroundColor: 'var(--surface)',
                                        cursor: 'zoom-in',
                                        border: '1px solid var(--border)',
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
                        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border)' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                <button
                                    onClick={handleShare}
                                    title="Share product link"
                                    id="product-share-btn"
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        border: '1.5px solid var(--border)',
                                        backgroundColor: 'var(--surface)',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-elevated)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
                                >
                                    <Share2 size={20} />
                                </button>
                                {!isOwner && (
                                    <button
                                        onClick={handleSaveLater}
                                        disabled={saveLoading}
                                        title={saved ? 'Remove from saved' : 'Save for later'}
                                        style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            border: saved ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                                            backgroundColor: saved ? 'var(--primary-light)' : 'var(--surface)',
                                            color: saved ? 'var(--primary)' : 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: saveLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            opacity: saveLoading ? 0.6 : 1,
                                        }}
                                        onMouseEnter={e => { if (!saveLoading) { e.currentTarget.style.backgroundColor = saved ? 'var(--primary-glow)' : 'var(--surface-elevated)'; } }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = saved ? 'var(--primary-light)' : 'var(--surface)'; }}
                                    >
                                        {saved
                                            ? <BookmarkCheck size={20} />
                                            : <Bookmark size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Saved confirmation */}
                        {saved && !isOwner && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.8125rem',
                                color: 'var(--primary)',
                                fontWeight: '600',
                                marginBottom: '0.75rem',
                                marginTop: '-0.5rem',
                            }}>
                                <BookmarkCheck size={13} /> Saved for later
                            </div>
                        )}
                        {/* Save error */}
                        {saveError && (
                            <div style={{
                                fontSize: '0.8125rem',
                                color: 'var(--danger)',
                                marginBottom: '0.75rem',
                                marginTop: '-0.5rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.07)',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                            }}>
                                ⚠️ {saveError}
                            </div>
                        )}

                        {product.sellerId ? (
                            <Link
                                to={`/seller/${product.sellerId}`}
                                title="View seller's store and all products"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '1rem',
                                    padding: '1rem',
                                    backgroundColor: 'var(--surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--surface-elevated)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                                        {product.sellerName ? product.sellerName.charAt(0).toUpperCase() : 'S'}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: '700', fontSize: '1rem' }}>{product.sellerName}</span>
                                            {product.sellerVerified && <VerifiedBadge size={16} />}
                                            <ReadOnlyRating sellerId={product.sellerId} />
                                        </div>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            {product.sellerVerified ? 'Verified Campus Seller • Visit Store' : 'Campus Seller • Visit Store'}
                                        </span>
                                    </div>
                                </div>
                                <ExternalLink size={16} style={{ color: 'var(--text-tertiary)' }} />
                            </Link>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginBottom: '1rem',
                                    padding: '1rem',
                                    backgroundColor: 'var(--surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--surface-elevated)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                                    {product.sellerName ? product.sellerName.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>{product.sellerName}</span>
                                        {product.sellerVerified && <VerifiedBadge size={16} />}
                                    </div>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        {product.sellerVerified ? 'Verified Campus Seller' : 'Campus Seller'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Campus Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            fontSize: '0.8125rem',
                            fontWeight: '700',
                            marginBottom: '1.25rem',
                            border: '1px solid rgba(37, 99, 235, 0.2)'
                        }}>
                            <GraduationCap size={16} />
                            <span>Campus: {product.schoolName || 'Western Delta University'}</span>
                        </div>

                        {/* Interactive Seller Rating (separate from link to allow clicking stars) */}
                        {!isOwner && product.sellerId && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.625rem 1rem',
                                marginBottom: '1.25rem',
                                backgroundColor: 'var(--surface-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                            }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    Rate this seller:
                                </span>
                                <SellerRating sellerId={product.sellerId} hideAverage={true} />
                            </div>
                        )}

                        {!isOwner && !product.sellerVerified && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.625rem',
                                padding: '0.875rem 1rem',
                                marginBottom: '1.5rem',
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: 'var(--radius-lg)',
                            }}>
                                <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: '1.5' }}>
                                    This seller is not verified. Please proceed with caution. 🫡
                                </span>
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Description</h3>
                            <p style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '1.0625rem' }}>{product.description}</p>
                        </div>

                        <div style={{ marginBottom: '1rem', padding: '1.5rem', backgroundColor: 'rgba(37, 99, 235, 0.03)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(37, 99, 235, 0.1)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Price</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.03em' }}>
                                ₦{parseFloat(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Stock Availability Indicator */}
                        {(() => {
                            const stockNum = typeof product.stock === 'number' ? product.stock : (product.stock !== undefined ? parseInt(product.stock, 10) : null);
                            const isOutOfStock = stockNum !== null && stockNum <= 0;
                            const isLowStock = stockNum !== null && stockNum > 0 && stockNum <= 3;

                            return (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1.5rem',
                                    borderRadius: 'var(--radius-lg)',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    backgroundColor: isOutOfStock 
                                        ? 'rgba(239, 68, 68, 0.08)' 
                                        : isLowStock 
                                            ? 'rgba(245, 158, 11, 0.08)' 
                                            : 'rgba(16, 185, 129, 0.08)',
                                    color: isOutOfStock 
                                        ? 'var(--danger)' 
                                        : isLowStock 
                                            ? '#d97706' 
                                            : '#10b981',
                                    border: `1px solid ${isOutOfStock ? 'rgba(239, 68, 68, 0.2)' : isLowStock ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`,
                                }}>
                                    {isOutOfStock ? (
                                        <><span>❌</span> Out of Stock (0 units left)</>
                                    ) : isLowStock ? (
                                        <><span>🔥</span> Only {stockNum} left in stock - order soon!</>
                                    ) : stockNum !== null ? (
                                        <><span>📦</span> In Stock ({stockNum} units available)</>
                                    ) : (
                                        <><span>✅</span> In Stock</>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Action Buttons — shown to everyone except the owner */}
                        {!isOwner && (
                            (() => {
                                const stockNum = typeof product.stock === 'number' ? product.stock : (product.stock !== undefined ? parseInt(product.stock, 10) : null);
                                const isOutOfStock = stockNum !== null && stockNum <= 0;
                                
                                if (isOutOfStock) {
                                    return (
                                        <div style={{
                                            width: '100%', padding: '1.25rem', fontSize: '1.125rem', fontWeight: '700', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', backgroundColor: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-secondary)', border: '1px dashed var(--border)', cursor: 'not-allowed'
                                        }}>
                                            ❌ Out of Stock
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                        {/* Primary: In-App Message (Always accessible, records first contact & notifies seller) */}
                                        <button
                                            onClick={handleAskInApp}
                                            disabled={interestLoading}
                                            id="ask-in-app-btn"
                                            style={{
                                                width: '100%',
                                                padding: '1.05rem 1.25rem',
                                                fontSize: '1.0625rem',
                                                fontWeight: '800',
                                                borderRadius: 'var(--radius-lg)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.65rem',
                                                backgroundColor: showChat ? 'var(--primary-dark, #1d4ed8)' : 'var(--primary)',
                                                color: '#ffffff',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 14px -2px rgba(37, 99, 235, 0.4)',
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                        >
                                            {interestLoading ? (
                                                <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                                            ) : (
                                                <MessageCircle size={20} />
                                            )}
                                            {showChat ? 'Close Chat' : 'Message Seller on Market-U'}
                                        </button>

                                        {/* Secondary: WhatsApp Button (Unlocked after in-app contact) */}
                                        {cleanSellerPhone && (
                                            whatsappUnlocked ? (
                                                <button
                                                    onClick={handleWhatsAppChat}
                                                    id="whatsapp-chat-btn"
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.85rem 1.25rem',
                                                        fontSize: '0.9375rem',
                                                        fontWeight: '700',
                                                        borderRadius: 'var(--radius-lg)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        backgroundColor: '#25D366',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 12px -2px rgba(37, 211, 102, 0.35)',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                                    </svg>
                                                    Continue on WhatsApp
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleWhatsAppChat}
                                                    id="whatsapp-chat-btn"
                                                    title="Send an in-app message first to open WhatsApp"
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 1.25rem',
                                                        fontSize: '0.875rem',
                                                        fontWeight: '600',
                                                        borderRadius: 'var(--radius-lg)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        border: '1.5px dashed var(--border)',
                                                        backgroundColor: 'var(--surface-elevated)',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    <Lock size={14} />
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
                                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                                    </svg>
                                                    Chat on WhatsApp (Send in-app message first)
                                                </button>
                                            )
                                        )}

                                        {/* TASK 4: Seller Sharing Tools — Share this product on WhatsApp */}
                                        <button
                                            onClick={() => {
                                                const productLink = window.location.href.split('?')[0];
                                                const numPrice = parseFloat(product.price);
                                                const priceFormatted = !isNaN(numPrice) ? `₦${numPrice.toLocaleString('en-NG')}` : '';
                                                const shareMsg = `Check out "${product.title}" ${priceFormatted ? `(${priceFormatted}) ` : ''}on Market-U: ${productLink}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '0.65rem 1rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: '600',
                                                borderRadius: 'var(--radius-lg)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.45rem',
                                                border: '1px dashed var(--border)',
                                                backgroundColor: 'transparent',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Share2 size={14} /> Share product on WhatsApp Status
                                        </button>
                                    </div>
                                );
                            })()
                        )}

                        {/* TASK 5: Seller response status & notification feedback */}
                        {(alreadyInterested || askedInApp) && !isOwner && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.85rem 1rem',
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: '700', margin: '0' }}>
                                    ⚡ Seller notified, usually replies in {product.avgReplyMinutes ? `~${product.avgReplyMinutes} mins` : '10-15 minutes'}
                                </p>
                            </div>
                        )}


                        {/* Chat UI */}
                        {showChat && !isOwner && isAuthenticated && (
                            <ProductChat 
                                product={product} 
                                onClose={() => setShowChat(false)} 
                                onMessageSent={() => setWhatsappUnlocked(true)}
                            />
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
                                    style={{ padding: '1rem', fontSize: '1rem', fontWeight: '600', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
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

            {/* Floating Share Link Toast */}
            {shareToast && (
                <div style={{
                    position: 'fixed',
                    bottom: '5.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xl)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    animation: 'fadeInUp 0.3s ease',
                }}>
                    <Check size={16} color="var(--success)" /> Link copied to clipboard!
                </div>
            )}
        </div>
    );
};

export default ProductDetail;
