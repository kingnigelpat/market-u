import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import ReadOnlyRating from '../components/ReadOnlyRating';
import { ArrowLeft, Share2, Check, Store, MapPin, Package, MessageCircle, AlertCircle } from 'lucide-react';

const SellerStore = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shareToast, setShareToast] = useState(false);

    useEffect(() => {
        const fetchStoreData = async () => {
            setLoading(true);
            try {
                // 1. Fetch seller profile
                const sellerRef = doc(db, 'users', id);
                const sellerSnap = await getDoc(sellerRef);
                let sellerData = null;

                if (sellerSnap.exists()) {
                    sellerData = { id: sellerSnap.id, ...sellerSnap.data() };
                    setSeller(sellerData);
                    document.title = `${sellerData.name || 'Seller'}'s Store | Market-U`;
                }

                // 2. Fetch all products listed by this seller
                const productsQuery = query(
                    collection(db, 'products'),
                    where('sellerId', '==', id)
                );
                const productsSnap = await getDocs(productsQuery);
                const items = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Sort newest first
                items.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });

                // If seller status is confirmed, ensure products have sellerVerified
                if (sellerData?.verified) {
                    items.forEach(item => { item.sellerVerified = true; });
                }

                setProducts(items);
            } catch (err) {
                console.error('Error fetching seller store:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchStoreData();
        }
    }, [id]);

    const handleShareStore = async () => {
        const storeUrl = window.location.href;
        const sellerName = seller?.name || 'Seller';
        const shareText = `🛍️ Explore ${sellerName}'s campus store on Market-U! Check out their listings and deals:`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${sellerName}'s Store | Market-U`,
                    text: shareText,
                    url: storeUrl,
                });
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn('Share sheet cancelled or failed:', err);
                }
            }
        }

        try {
            await navigator.clipboard.writeText(storeUrl);
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2500);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center', minHeight: '60vh' }}>
                <div className="top-progress-bar" />
                <div className="page-spinner" style={{ margin: '4rem auto' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading campus store...</p>
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.75rem' }}>Store Not Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    This seller profile does not exist or has been removed.
                </p>
                <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                    <ArrowLeft size={18} /> Back to Market
                </Link>
            </div>
        );
    }

    const sellerName = seller.name || 'Campus Seller';
    const sellerInitial = sellerName.charAt(0).toUpperCase();

    // Clean phone number for WhatsApp
    const rawPhone = seller.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '234' + cleanPhone.slice(1) : cleanPhone;
    const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Hi ${sellerName}, I found your store on Market-U!`)}` : null;

    return (
        <div className="container" style={{ paddingBottom: '5rem' }}>
            {/* Top Navigation Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', marginBottom: '1rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '0.5rem 0',
                    }}
                >
                    <ArrowLeft size={18} /> Back
                </button>

                <button
                    onClick={handleShareStore}
                    id="share-store-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    <Share2 size={16} /> Share Store
                </button>
            </div>

            {/* Seller Header Banner */}
            <div
                style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: '2rem',
                    marginBottom: '2.5rem',
                    boxShadow: 'var(--shadow-md)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Background accent glow */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '250px',
                        height: '250px',
                        background: 'radial-gradient(circle, var(--primary-glow) 0%, rgba(0,0,0,0) 70%)',
                        pointerEvents: 'none',
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div
                            style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--surface-elevated)',
                                border: '2px solid var(--primary)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                fontWeight: '900',
                                boxShadow: 'var(--shadow-glow)',
                                flexShrink: 0,
                            }}
                        >
                            {sellerInitial}
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
                                    {sellerName}
                                </h1>
                                {seller.verified && <VerifiedBadge size={20} />}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: 'var(--radius-full)',
                                    backgroundColor: seller.verified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                    color: seller.verified ? 'var(--success)' : 'var(--warning)',
                                    fontWeight: '700',
                                    fontSize: '0.75rem',
                                }}>
                                    {seller.verified ? '✓ Verified Student Seller' : '⚠️ Unverified Seller'}
                                </span>

                                {seller.school && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                                        <MapPin size={14} /> {seller.school}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ReadOnlyRating sellerId={id} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Store Action */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {whatsappUrl && (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: 'var(--radius-lg)',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                }}
                            >
                                <MessageCircle size={18} color="#25D366" /> Chat on WhatsApp
                            </a>
                        )}

                        <button
                            onClick={handleShareStore}
                            className="btn btn-primary"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem 1.25rem',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '0.875rem',
                                fontWeight: '700',
                            }}
                        >
                            <Share2 size={18} /> Share Store
                        </button>
                    </div>
                </div>

                {/* Bio / Description if available */}
                {seller.bio && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                        <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.9375rem', lineHeight: '1.6' }}>
                            {seller.bio}
                        </p>
                    </div>
                )}
            </div>

            {/* Catalog Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={22} color="var(--primary)" />
                    <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0 }}>
                        Store Listings ({products.length})
                    </h2>
                </div>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
                <div
                    style={{
                        padding: '4rem 1.5rem',
                        textAlign: 'center',
                        backgroundColor: 'var(--surface)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px dashed var(--border)',
                    }}
                >
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>No products listed yet</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        This seller hasn&apos;t posted any active items yet. Check back soon!
                    </p>
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '1.25rem',
                    }}
                >
                    {products.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                    ))}
                </div>
            )}

            {/* Share Toast */}
            {shareToast && (
                <div
                    style={{
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
                    }}
                >
                    <Check size={16} color="var(--success)" /> Store link copied to clipboard!
                </div>
            )}
        </div>
    );
};

export default SellerStore;
