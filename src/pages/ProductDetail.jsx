import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc, updateDoc, increment, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
    ArrowLeft,
    Trash2,
    Edit,
    Loader,
    AlertCircle,
    Bookmark,
    BookmarkCheck,
    Share2,
    Check,
    ExternalLink,
    MessageSquare,
    ShoppingBag,
    GraduationCap,
    ShieldCheck,
    Eye,
    Star,
    Clock,
    CheckCircle2,
    XCircle,
    Maximize2,
    Tag,
    TrendingUp,
    UserCheck,
    Flag
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import VerifiedBadge from '../components/VerifiedBadge';
import SellerRating from '../components/SellerRating';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from '../components/AuthPromptModal';
import ReadOnlyRating from '../components/ReadOnlyRating';
import { optimizeImage } from '../utils/cloudinary';
import { sendPushNotification } from '../utils/notifications';
import NotificationPermissionPrompt from '../components/NotificationPermissionPrompt';
import ProductChat from '../components/ProductChat';
import { formatWhatsAppNumber } from '../utils/phoneUtils';
import { logEvent } from '../utils/analyticsService';
import { qualifyReferralAction } from '../utils/referralService';
import { fetchGistReviewsForProduct, formatGistTime } from '../utils/gistService';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, isAuthenticated, userName, userPhone, enableNotifications, isAdmin } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [activeImageIdx, setActiveImageIdx] = useState(0);

    // Gist reviews for this product
    const [gistReviews, setGistReviews] = useState([]);

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
    const [whatsappUnlocked, setWhatsappUnlocked] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('Suspicious seller / asking for payment before delivery');
    const [reportDetails, setReportDetails] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);

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

                    if (currentUser && currentUser.uid !== productData.sellerId) {
                        try {
                            await updateDoc(docRef, { views: increment(1) });
                            productData.views = (productData.views || 0) + 1;
                        } catch (e) { console.error('Error incrementing views', e); }
                    }

                    try {
                        const sellerRef = doc(db, 'publicProfiles', productData.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            const sData = sellerSnap.data();
                            productData.sellerVerified = Boolean(sData.verified) || Boolean(productData.sellerVerified);
                            if (sData.phone) {
                                productData.sellerPhone = sData.phone;
                            }
                            if (sData.name) {
                                productData.sellerName = sData.name;
                            }
                            if (sData.avgReplyMinutes) {
                                productData.avgReplyMinutes = sData.avgReplyMinutes;
                            }
                            productData.completedSalesCount = Number(sData.completedSalesCount || 0);
                        }
                    } catch (e) {
                        console.warn("Could not fetch seller public profile", e);
                    }

                    setProduct(productData);
                    setActiveImageIdx(0);
                    const numPrice = parseFloat(productData.price);
                    const priceTag = !isNaN(numPrice) ? ` • ₦${numPrice.toLocaleString('en-NG')}` : '';
                    document.title = `${productData.title}${priceTag} | Market-U`;

                    // Fetch Gist reviews/buzz referencing this product
                    fetchGistReviewsForProduct(productData.id).then(setGistReviews).catch(() => {});

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
                        } catch { /* ignore */ }

                        try {
                            const chatSnap = await getDoc(doc(db, 'chats', `${id}_${currentUser.uid}`));
                            if (chatSnap.exists() && chatSnap.data().lastMessage) {
                                setWhatsappUnlocked(true);
                            }
                        } catch { /* ignore */ }

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
                        } catch { /* ignore */ }
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
        return (
            <div className="page-loader">
                <div className="marketu-logo-loader">
                    <div className="marketu-logo-loader-brand">
                        <div className="page-spinner" />
                        <span className="marketu-logo-loader-word">arketU</span>
                    </div>
                    <div className="marketu-logo-loader-bar" />
                </div>
            </div>
        );
    }

    if (!product) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Product not found.</div>;
    }

    const isOwner = Boolean(currentUser && product && currentUser.uid === product.sellerId);
    const canManage = Boolean(isOwner || isAdmin);
    const cleanSellerPhone = formatWhatsAppNumber(product?.sellerPhone);
    const images = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.imageUrl
        ? [product.imageUrl]
        : [];
    const currentHeroImage = images[activeImageIdx] || images[0] || null;

    const stockNum = typeof product.stock === 'number' ? product.stock : (product.stock !== undefined ? parseInt(product.stock, 10) : null);
    const isOutOfStock = stockNum !== null && stockNum <= 0;
    const isLowStock = stockNum !== null && stockNum > 0 && stockNum <= 3;

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

        if (showChat) {
            setShowChat(false);
            return;
        }

        setShowChat(true);
        if (isOwner) return;

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
                await deleteDoc(doc(db, 'savedItems', savedDocId));
                setSaved(false);
                setSavedDocId(null);
            } else {
                const ref = await addDoc(collection(db, 'savedItems'), {
                    buyerId: currentUser.uid,
                    productId: id,
                    productTitle: product.title,
                    productPrice: product.price,
                    productImage: product.images?.[0] || product.imageUrl || '',
                    sellerName: product.sellerName,
                    sellerId: product.sellerId,
                    savedAt: serverTimestamp(),
                });
                setSaved(true);
                setSavedDocId(ref.id);

                if ('Notification' in window && Notification.permission === 'default') {
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
        <div className="container" style={{ paddingBottom: '1rem' }}>
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
                style={{ margin: '1.25rem 0', color: 'var(--text-secondary)', paddingLeft: 0 }}
            >
                <ArrowLeft size={20} /> Back to market
            </button>

            <div className="product-detail-layout">
                {/* ── Interactive Image Showcase Gallery ── */}
                <div className="product-images-container">
                    {currentHeroImage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            {/* Main Hero Image */}
                            <div
                                onClick={() => setSelectedImage(currentHeroImage)}
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    borderRadius: 'var(--radius-2xl)',
                                    overflow: 'hidden',
                                    backgroundColor: 'var(--surface)',
                                    cursor: 'zoom-in',
                                    border: '1.5px solid var(--border)',
                                    boxShadow: 'var(--shadow-lg)'
                                }}
                            >
                                <img
                                    src={optimizeImage(currentHeroImage, 900)}
                                    alt={`${product.title} - view ${activeImageIdx + 1}`}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                        minHeight: '320px',
                                        maxHeight: '560px',
                                        objectFit: 'cover'
                                    }}
                                />

                                {/* Floating Live Demand Pill */}
                                <div style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    left: '1rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '99px',
                                    background: 'rgba(15, 23, 42, 0.78)',
                                    backdropFilter: 'blur(8px)',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    border: '1px solid rgba(255,255,255,0.15)'
                                }}>
                                    <Eye size={13} style={{ color: '#60A5FA' }} />
                                    <span>{product.views || 1} campus {(product.views || 1) === 1 ? 'view' : 'views'}</span>
                                </div>

                                {/* Floating Urgency Badge */}
                                {!isOutOfStock && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '99px',
                                        background: isLowStock
                                            ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                                            : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                                    }}>
                                        {isLowStock ? <Clock size={13} /> : <TrendingUp size={13} />}
                                        <span>{isLowStock ? `Only ${stockNum} Left` : 'Available Now'}</span>
                                    </div>
                                )}

                                <div style={{
                                    position: 'absolute',
                                    bottom: '0.75rem',
                                    right: '0.75rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.28rem 0.65rem',
                                    borderRadius: '99px',
                                    background: 'rgba(0,0,0,0.68)',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 700
                                }}>
                                    <Maximize2 size={11} />
                                    <span>Tap to zoom ({activeImageIdx + 1}/{images.length})</span>
                                </div>
                            </div>

                            {/* Interactive Thumbnail Switcher */}
                            {images.length > 1 && (
                                <div style={{
                                    display: 'flex',
                                    gap: '0.625rem',
                                    overflowX: 'auto',
                                    paddingBottom: '0.25rem'
                                }} className="hide-scrollbar">
                                    {images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActiveImageIdx(idx)}
                                            style={{
                                                width: '72px',
                                                height: '72px',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                border: idx === activeImageIdx ? '2.5px solid var(--primary)' : '1.5px solid var(--border)',
                                                padding: 0,
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                opacity: idx === activeImageIdx ? 1 : 0.65,
                                                transform: idx === activeImageIdx ? 'scale(1.03)' : 'scale(1)',
                                                transition: 'all 0.15s ease',
                                                background: 'var(--surface)'
                                            }}
                                        >
                                            <img
                                                src={optimizeImage(img, 160)}
                                                alt={`Thumbnail ${idx + 1}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border)' }}>
                            No images available
                        </div>
                    )}
                </div>

                {/* ── Details & Buy / Contact Seller Box ── */}
                <div className="product-info-container">
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        {/* Category & Campus Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                            {product.category && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '99px',
                                    background: 'rgba(245, 158, 11, 0.14)',
                                    color: '#D97706'
                                }}>
                                    <Tag size={12} /> {product.category}
                                </span>
                            )}
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.7rem',
                                borderRadius: '99px',
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: 700
                            }}>
                                <GraduationCap size={14} />
                                <span>{product.schoolName || 'Western Delta University'}</span>
                            </span>
                        </div>

                        {/* Title & Share/Save Actions */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
                            <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.15rem)', fontWeight: '900', margin: 0, letterSpacing: '-0.03em', lineHeight: '1.15' }}>
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
                                    >
                                        {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        {saved && !isOwner && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.8125rem',
                                color: 'var(--primary)',
                                fontWeight: '700',
                                marginBottom: '0.75rem',
                                marginTop: '-0.5rem',
                            }}>
                                <BookmarkCheck size={14} /> Saved to your wishlist!
                            </div>
                        )}

                        {saveError && (
                            <div style={{
                                fontSize: '0.8125rem',
                                color: 'var(--danger)',
                                marginBottom: '0.75rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.07)',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                            }}>
                                ⚠️ {saveError}
                            </div>
                        )}

                        {/* ── High-Conversion Price & Impulse Spotlight Box ── */}
                        <div style={{
                            marginBottom: '1.25rem',
                            padding: '1.25rem 1.35rem',
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.07) 0%, rgba(245, 158, 11, 0.07) 100%)',
                            borderRadius: 'var(--radius-2xl)',
                            border: '1.5px solid rgba(37, 99, 235, 0.22)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Campus Deal Price
                                    </div>
                                    <div style={{ fontSize: 'clamp(1.85rem, 5vw, 2.4rem)', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                                        ₦{(parseFloat(product.price) || 0).toLocaleString('en-NG', {
                                            maximumFractionDigits: (parseFloat(product.price) % 1 === 0 ? 0 : 2)
                                        })}
                                    </div>
                                </div>

                                {/* Stock / Urgency Pill */}
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '99px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    backgroundColor: isOutOfStock
                                        ? 'rgba(239, 68, 68, 0.12)'
                                        : isLowStock
                                        ? 'rgba(245, 158, 11, 0.16)'
                                        : 'rgba(16, 185, 129, 0.14)',
                                    color: isOutOfStock
                                        ? 'var(--danger)'
                                        : isLowStock
                                        ? '#D97706'
                                        : '#059669'
                                }}>
                                    {isOutOfStock ? (
                                        <><XCircle size={14} /> Sold Out</>
                                    ) : isLowStock ? (
                                        <><Clock size={14} /> Only {stockNum} left</>
                                    ) : stockNum !== null ? (
                                        <><CheckCircle2 size={14} /> {stockNum} in stock • Ready for pickup</>
                                    ) : (
                                        <><CheckCircle2 size={14} /> Available on Campus</>
                                    )}
                                </div>
                            </div>

                            {/* Trust Signals */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                marginTop: '0.875rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid var(--border)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <ShieldCheck size={14} style={{ color: 'var(--success)' }} /> Inspect Before Paying
                                </span>
                                <span>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Clock size={14} style={{ color: '#F59E0B' }} /> Fast Campus Meetup
                                </span>
                                <span>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <UserCheck size={14} style={{ color: 'var(--primary)' }} /> Direct Student Seller
                                </span>
                            </div>
                        </div>

                        {/* Primary Buy / Contact Seller Buttons (always shown so Buyers, Sellers & Admins see how to buy) */}
                        {isOutOfStock ? (
                            <div style={{
                                width: '100%', padding: '1.1rem', marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-secondary)', border: '1px dashed var(--border)', cursor: 'not-allowed'
                            }}>
                                <XCircle size={18} /> Out of Stock
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {isOwner && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'var(--primary)',
                                        background: 'var(--primary-light)',
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center'
                                    }}>
                                        This is your listing — students use the buttons below to buy from you:
                                    </div>
                                )}
                                <button
                                    onClick={handleAskInApp}
                                    disabled={interestLoading}
                                    id="ask-in-app-btn"
                                    style={{
                                        width: '100%',
                                        padding: '1.05rem 1.25rem',
                                        fontSize: '1.02rem',
                                        fontWeight: '900',
                                        borderRadius: 'var(--radius-xl)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.6rem',
                                        background: showChat
                                            ? 'var(--primary-hover)'
                                            : 'var(--gradient-primary)',
                                        color: '#ffffff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 22px -4px rgba(37, 99, 235, 0.45)',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {interestLoading ? (
                                        <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                                    ) : (
                                        <ShoppingBag size={20} />
                                    )}
                                    {showChat ? 'Close Seller Chat' : 'Buy / Message Seller Now'}
                                </button>

                                {cleanSellerPhone && (
                                    whatsappUnlocked ? (
                                        <button
                                            onClick={handleWhatsAppChat}
                                            id="whatsapp-chat-btn"
                                            style={{
                                                width: '100%',
                                                padding: '0.85rem 1.25rem',
                                                fontSize: '0.9375rem',
                                                fontWeight: '800',
                                                borderRadius: 'var(--radius-xl)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                backgroundColor: '#25D366',
                                                color: '#ffffff',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px -2px rgba(37, 211, 102, 0.35)',
                                            }}
                                        >
                                            <FaWhatsapp size={19} />
                                            Buy via WhatsApp
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleWhatsAppChat}
                                            id="whatsapp-chat-btn"
                                            title="Send an in-app message first to open WhatsApp"
                                            style={{
                                                width: '100%',
                                                padding: '0.78rem 1.25rem',
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                borderRadius: 'var(--radius-xl)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                border: '1.5px solid rgba(37, 211, 102, 0.35)',
                                                backgroundColor: 'rgba(37, 211, 102, 0.08)',
                                                color: '#16A34A',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <FaWhatsapp size={17} />
                                            <span>Chat Seller on WhatsApp</span>
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        {/* Seller response status & notification feedback */}
                        {(alreadyInterested || askedInApp) && !isOwner && (
                            <div style={{
                                marginBottom: '1.25rem',
                                padding: '0.85rem 1rem',
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.45rem'
                            }}>
                                <CheckCircle2 size={16} color="var(--success)" />
                                <p style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: '700', margin: '0' }}>
                                    Seller notified — usually replies in {product.avgReplyMinutes ? `~${product.avgReplyMinutes} mins` : '10-15 minutes'}
                                </p>
                            </div>
                        )}

                        {/* Chat UI */}
                        {showChat && isAuthenticated && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <ProductChat
                                    product={product}
                                    onClose={() => setShowChat(false)}
                                    onMessageSent={() => setWhatsappUnlocked(true)}
                                />
                            </div>
                        )}

                        {/* Seller Profile Card */}
                        {product.sellerId ? (
                            <Link
                                to={`/seller/${product.sellerId}`}
                                title="View seller's store and all products"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '1rem',
                                    padding: '0.9rem 1rem',
                                    backgroundColor: 'var(--surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'white' }}>
                                        {product.sellerName ? product.sellerName.charAt(0).toUpperCase() : 'S'}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>{product.sellerName}</span>
                                            {product.sellerVerified && <VerifiedBadge size={16} />}
                                            <ReadOnlyRating sellerId={product.sellerId} />
                                            {product.completedSalesCount > 0 && (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.2rem',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    color: '#059669',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '99px'
                                                }}>
                                                    <CheckCircle2 size={12} /> {product.completedSalesCount} {product.completedSalesCount === 1 ? 'completed sale' : 'completed sales'}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {product.sellerVerified ? 'Verified Campus Seller • View Storefront' : 'Campus Seller • View Storefront'}
                                        </span>
                                    </div>
                                </div>
                                <ExternalLink size={16} style={{ color: 'var(--text-tertiary)' }} />
                            </Link>
                        ) : null}

                        {/* Interactive Seller Rating */}
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

                        {/* Campus Safety & Report Bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.625rem',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.25rem',
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: 'var(--radius-lg)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', flex: 1, minWidth: '210px' }}>
                                <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: '1.45' }}>
                                    <strong>Campus Safety Tip:</strong> Meet in a public campus spot, confirm the price &amp; inspect the item before transferring payment.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        setShowPrompt(true);
                                        return;
                                    }
                                    setReportSuccess(false);
                                    setShowReportModal(true);
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.35rem 0.7rem',
                                    borderRadius: '99px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                    color: 'var(--danger)',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                <Flag size={12} /> Report Seller
                            </button>
                        </div>

                        {/* Product Description */}
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                                Item Details
                            </h3>
                            <p style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.65', fontSize: '0.975rem', margin: 0 }}>
                                {product.description}
                            </p>
                        </div>

                        {/* Secondary Social / Gist Actions */}
                        {!isOwner && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                                <Link
                                    to={`/gist?create=true&type=review&productId=${product.id}`}
                                    style={{
                                        width: '100%',
                                        padding: '0.7rem 1rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: '800',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.45rem',
                                        border: '1.5px solid rgba(37, 99, 235, 0.3)',
                                        backgroundColor: 'var(--primary-light)',
                                        color: 'var(--primary)',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <MessageSquare size={15} /> Write a Product Review on Gist
                                </Link>

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
                                    <FaWhatsapp size={15} color="#25D366" /> Share on WhatsApp Status
                                </button>
                            </div>
                        )}

                        {canManage && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0', marginBottom: '1.5rem' }}>
                                <Link
                                    to={`/gist?create=true&type=gist&productId=${product.id}`}
                                    className="btn btn-secondary"
                                    style={{
                                        gridColumn: '1 / -1',
                                        padding: '0.75rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        justifyContent: 'center',
                                        color: 'var(--primary)',
                                        borderColor: 'rgba(37, 99, 235, 0.3)',
                                        background: 'var(--primary-light)'
                                    }}
                                >
                                    <MessageSquare size={16} /> Share Product to Campus Gist
                                </Link>
                                <Link
                                    to={`/edit-product/${id}`}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.875rem', fontSize: '0.9375rem', fontWeight: '600', justifyContent: 'center' }}
                                >
                                    <Edit size={18} />
                                    Edit Listing
                                </Link>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="btn"
                                    style={{ padding: '0.875rem', fontSize: '0.9375rem', fontWeight: '600', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
                                >
                                    <Trash2 size={18} />
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        )}

                        {/* ── Campus Gist Reviews & Buzz Section (placed after Buy Details so Mobile users see Buy Box first) ── */}
                        <div style={{
                            marginTop: '1.25rem',
                            padding: '1.25rem',
                            background: 'var(--surface-elevated)',
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                                        Student Reviews & Gist ({gistReviews.length})
                                    </h3>
                                </div>
                                <Link
                                    to={`/gist?create=true&type=${isOwner ? 'gist' : 'review'}&productId=${product.id}`}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        color: 'var(--primary)',
                                        textDecoration: 'none',
                                        background: 'var(--primary-light)',
                                        padding: '0.3rem 0.75rem',
                                        borderRadius: '99px'
                                    }}
                                >
                                    + {isOwner ? 'Promote on Gist' : 'Write Review'}
                                </Link>
                            </div>

                            {gistReviews.length === 0 ? (
                                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    Bought this item or have thoughts on it? Be the first student to write a review about it.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                    {gistReviews.map(rev => (
                                        <Link
                                            key={rev.id}
                                            to={`/gist/post/${rev.id}`}
                                            style={{
                                                display: 'block',
                                                padding: '0.75rem',
                                                background: 'var(--surface)',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '1px solid var(--border)',
                                                textDecoration: 'none',
                                                color: 'inherit'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '0.8125rem' }}>
                                                    {rev.authorName} • {rev.schoolShort}
                                                </span>
                                                {rev.product?.rating && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#F59E0B', fontSize: '0.75rem', fontWeight: 800 }}>
                                                        <Star size={12} fill="#F59E0B" /> {rev.product.rating}/5
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {rev.content?.slice(0, 140)}{rev.content?.length > 140 ? '...' : ''}
                                            </p>
                                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                                {formatGistTime(rev.createdAt)} • View in Gist
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sticky Mobile Bottom Buy Bar (Native E-Commerce Feel on Mobile) ── */}
            {!isOutOfStock && (
                <div className="mobile-sticky-buy-bar">
                    <div className="mobile-sticky-buy-price">
                        <span className="mobile-sticky-buy-label">Price</span>
                        <span className="mobile-sticky-buy-amount">
                            ₦{(parseFloat(product.price) || 0).toLocaleString('en-NG', {
                                maximumFractionDigits: (parseFloat(product.price) % 1 === 0 ? 0 : 2)
                            })}
                        </span>
                    </div>
                    <div className="mobile-sticky-buy-actions">
                        <button
                            onClick={() => {
                                handleAskInApp();
                                setTimeout(() => {
                                    document.getElementById('ask-in-app-btn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                            }}
                            className="mobile-sticky-btn-primary"
                        >
                            <ShoppingBag size={16} />
                            <span>{showChat ? 'View Chat' : 'Buy / Message Seller'}</span>
                        </button>
                        {cleanSellerPhone && (
                            <button
                                onClick={handleWhatsAppChat}
                                className="mobile-sticky-btn-whatsapp"
                                aria-label="Contact on WhatsApp"
                            >
                                <FaWhatsapp size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .mobile-sticky-buy-bar {
                    display: none;
                }

                @media (max-width: 768px) {
                    .mobile-sticky-buy-bar {
                        position: fixed;
                        bottom: calc(3.85rem + env(safe-area-inset-bottom, 0px));
                        left: 0;
                        right: 0;
                        z-index: 990;
                        background: var(--surface-elevated);
                        border-top: 1.5px solid var(--border);
                        padding: 0.65rem 1rem;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 0.75rem;
                        box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.12);
                    }

                    .mobile-sticky-buy-price {
                        display: flex;
                        flex-direction: column;
                        min-width: 0;
                    }

                    .mobile-sticky-buy-label {
                        font-size: 0.65rem;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: var(--text-secondary);
                        letter-spacing: 0.04em;
                    }

                    .mobile-sticky-buy-amount {
                        font-family: var(--font-display);
                        font-size: 1.15rem;
                        font-weight: 900;
                        color: var(--primary);
                        line-height: 1.1;
                        white-space: nowrap;
                    }

                    .mobile-sticky-buy-actions {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        flex: 1;
                        justify-content: flex-end;
                    }

                    .mobile-sticky-btn-primary {
                        flex: 1;
                        max-width: 210px;
                        padding: 0.7rem 1rem;
                        border-radius: var(--radius-full);
                        background: var(--gradient-primary);
                        color: #ffffff;
                        font-size: 0.825rem;
                        font-weight: 800;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.4rem;
                        border: none;
                        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
                    }

                    .mobile-sticky-btn-whatsapp {
                        width: 42px;
                        height: 42px;
                        border-radius: 50%;
                        background: #25D366;
                        color: #ffffff;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border: none;
                        flex-shrink: 0;
                        box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35);
                    }
                }
            `}</style>

            {showReportModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.72)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 2100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }} onClick={() => setShowReportModal(false)}>
                    <div
                        className="card"
                        style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <Flag size={18} color="var(--danger)" /> Report Seller or Listing
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowReportModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.25rem' }}
                            >
                                ×
                            </button>
                        </div>

                        {reportSuccess ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 0.5rem' }} />
                                <p style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Report Sent to Admin</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    Our moderation team will review this seller and listing promptly.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowReportModal(false)}
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!currentUser || reportSubmitting) return;
                                setReportSubmitting(true);
                                try {
                                    await addDoc(collection(db, 'gist_reports'), {
                                        targetType: 'product_seller',
                                        targetId: product.id,
                                        postId: product.id,
                                        sellerId: product.sellerId || '',
                                        sellerName: product.sellerName || '',
                                        productTitle: product.title || '',
                                        reporterId: currentUser.uid,
                                        reporterName: userName || currentUser.displayName || 'Student',
                                        reason: reportReason,
                                        details: reportDetails.trim(),
                                        status: 'open',
                                        createdAt: serverTimestamp()
                                    });
                                    setReportSuccess(true);
                                    setReportDetails('');
                                } catch (err) {
                                    console.error('Error submitting report:', err);
                                    alert('Could not send report. Please try again.');
                                } finally {
                                    setReportSubmitting(false);
                                }
                            }}>
                                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Reason</label>
                                    <select
                                        value={reportReason}
                                        onChange={e => setReportReason(e.target.value)}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                    >
                                        <option value="Suspicious seller / asking for payment before delivery">Suspicious seller / asking for payment before delivery</option>
                                        <option value="Fake, counterfeit, or misleading item">Fake, counterfeit, or misleading item</option>
                                        <option value="Wrong price or unavailable item">Wrong price or unavailable item</option>
                                        <option value="Harassment or rude behaviour">Harassment or rude behaviour</option>
                                        <option value="Other issue">Other issue</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Additional Details (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={reportDetails}
                                        onChange={e => setReportDetails(e.target.value)}
                                        placeholder="Describe what happened so admin can investigate..."
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={reportSubmitting}
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', background: 'var(--danger)', border: 'none' }}
                                >
                                    {reportSubmitting ? 'Sending Report...' : 'Submit Report to Admin'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <AuthPromptModal
                isOpen={showPrompt}
                onClose={() => setShowPrompt(false)}
                message="Sign up to contact sellers and start using Market-U"
            />

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
