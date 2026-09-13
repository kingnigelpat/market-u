import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, MessageCircle, Clock, ShoppingBag, ArrowLeft, Heart, Eye, CheckCircle, XCircle } from 'lucide-react';

// Format relative time
function timeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function buildWhatsAppUrl(buyerPhone, buyerName, productName) {
    let phone = (buyerPhone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '234' + phone.substring(1);
    else if (phone && !phone.startsWith('234') && phone.length < 11) phone = '234' + phone;

    const message = encodeURIComponent(
        `Hi ${buyerName}, I saw you're interested in my ${productName} on Market-U. Are you still interested? 😊`
    );
    return phone ? `https://wa.me/${phone}?text=${message}` : null;
}

// ── Seller View ──────────────────────────────────────────────────────────────
const SellerNotifications = ({ currentUser }) => {
    const [interests, setInterests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markedSeen, setMarkedSeen] = useState(false);

    useEffect(() => {
        if (!currentUser?.uid) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'interests'),
            where('sellerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, async (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setInterests(items);
            setLoading(false);

            // Mark all unseen as seen (batch write)
            if (!markedSeen) {
                setMarkedSeen(true);
                const unseen = snapshot.docs.filter(d => d.data().seen === false);
                if (unseen.length > 0) {
                    const batch = writeBatch(db);
                    unseen.forEach(d => batch.update(doc(db, 'interests', d.id), { seen: true }));
                    try {
                        await batch.commit();
                    } catch (e) {
                        console.error('Error marking notifications as seen:', e);
                    }
                }
            }
        }, (err) => {
            console.error('Error fetching interests:', err);
            setLoading(false);
        });

        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                Loading notifications...
            </div>
        );
    }

    if (interests.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
            }}>
                <div style={{
                    width: '72px', height: '72px',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    color: 'var(--primary)',
                }}>
                    <ShoppingBag size={32} />
                </div>
                <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '0.5rem' }}>No interests yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    Share your products to get buyers interested!
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {interests.map((item, idx) => {
                const waUrl = buildWhatsAppUrl(item.buyerPhone, item.buyerName, item.productName);
                const isNew = item.seen === false;
                return (
                    <div
                        key={item.id}
                        className="animate-fade-in-up"
                        style={{
                            animationDelay: `${idx * 0.04}s`,
                            backgroundColor: isNew
                                ? 'rgba(37, 99, 235, 0.04)'
                                : 'var(--bg)',
                            border: `1px solid ${isNew ? 'rgba(37, 99, 235, 0.2)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-xl)',
                            padding: '1.25rem',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* New dot indicator */}
                        {isNew && (
                            <div style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                width: '8px', height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--primary)',
                            }} />
                        )}

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                            {/* Avatar */}
                            <div style={{
                                width: '44px', height: '44px',
                                borderRadius: '50%',
                                backgroundColor: item.canceled ? 'rgba(239, 68, 68, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '800',
                                color: item.canceled ? '#ef4444' : 'var(--primary)',
                                fontSize: '1.125rem',
                                flexShrink: 0,
                            }}>
                                {item.buyerName ? item.buyerName.charAt(0).toUpperCase() : '?'}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Main text */}
                                {item.canceled ? (
                                    <p style={{ margin: '0 0 0.2rem', fontWeight: '700', fontSize: '0.9375rem', color: 'var(--text)' }}>
                                        ❌ <span style={{ color: '#ef4444' }}>{item.buyerName}</span> canceled interest
                                    </p>
                                ) : (
                                    <p style={{ margin: '0 0 0.2rem', fontWeight: '700', fontSize: '0.9375rem', color: 'var(--text)' }}>
                                        🔔 <span style={{ color: 'var(--primary)' }}>{item.buyerName}</span> is interested in your product
                                    </p>
                                )}

                                {/* Product name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                                    <ShoppingBag size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.productName}
                                    </span>
                                </div>

                                {/* Status badge */}
                                {item.canceled && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '99px',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        marginBottom: '0.5rem',
                                    }}>
                                        <XCircle size={12} /> Buyer Cancelled
                                    </div>
                                )}

                                {/* Time */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: item.canceled ? '0' : '1rem' }}>
                                    <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        {timeAgo(item.createdAt)}
                                    </span>
                                </div>

                                {/* WhatsApp contact button — hidden if canceled */}
                                {!item.canceled && (
                                    waUrl ? (
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            id={`contact-buyer-${item.id}`}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.625rem 1.125rem',
                                                backgroundColor: '#25D366',
                                                color: 'white',
                                                borderRadius: '99px',
                                                fontWeight: '700',
                                                fontSize: '0.875rem',
                                                textDecoration: 'none',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 4px 12px -2px rgba(37, 211, 102, 0.35)',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1DA851'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#25D366'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >
                                            <MessageCircle size={16} />
                                            Contact Buyer on WhatsApp
                                        </a>
                                    ) : (
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            No phone number provided by buyer
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── Buyer View ───────────────────────────────────────────────────────────────
const BuyerActivity = ({ currentUser }) => {
    const [interests, setInterests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState(null);

    const handleCancelInterest = async (e, interestId, isAlreadyCanceled) => {
        e.preventDefault();
        e.stopPropagation();
        if (cancellingId) return;
        setCancellingId(interestId);

        try {
            if (isAlreadyCanceled) {
                // Already canceled, clicking Remove deletes the record completely
                setInterests(prev => prev.filter(item => item.id !== interestId));
                await deleteDoc(doc(db, 'interests', interestId));
            } else {
                // Cancel interest: update Firestore and immediately show "Buyer Cancelled"
                setInterests(prev => prev.map(item => item.id === interestId ? { ...item, canceled: true } : item));
                await updateDoc(doc(db, 'interests', interestId), { canceled: true });
            }
        } catch (err) {
            console.error('Error updating interest:', err);
        } finally {
            setCancellingId(null);
        }
    };

    useEffect(() => {
        if (!currentUser?.uid) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'interests'),
            where('buyerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setInterests(items);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching buyer interests:', err);
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                Loading your activity...
            </div>
        );
    }

    if (interests.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
            }}>
                <div style={{
                    width: '72px', height: '72px',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    color: 'var(--primary)',
                }}>
                    <Heart size={32} />
                </div>
                <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '0.5rem' }}>No activity yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                    Browse products and tap "I'm Interested" to connect with sellers!
                </p>
                <Link
                    to="/market"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        background: 'var(--gradient-primary)',
                        color: 'white',
                        borderRadius: '99px',
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                    }}
                >
                    <ShoppingBag size={16} />
                    Browse Market
                </Link>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {interests.map((item, idx) => (
                <div
                    key={item.id}
                    className="animate-fade-in-up"
                    style={{
                        animationDelay: `${idx * 0.04}s`,
                        backgroundColor: cancellingId === item.id ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg)',
                        border: `1px solid ${cancellingId === item.id ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.25rem',
                        transition: 'all 0.3s ease',
                        opacity: cancellingId === item.id ? 0.6 : 1,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                        {/* Icon */}
                        <Link
                            to={item.productId ? `/product/${item.productId}` : '#'}
                            style={{
                                width: '44px', height: '44px',
                                borderRadius: '50%',
                                backgroundColor: item.seen ? 'rgba(34, 197, 94, 0.1)' : 'rgba(37, 99, 235, 0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: item.seen ? '#22c55e' : 'var(--primary)',
                                flexShrink: 0,
                                textDecoration: 'none',
                            }}
                        >
                            {item.seen ? <Eye size={20} /> : <Heart size={20} />}
                        </Link>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Product name — clickable */}
                            <Link
                                to={item.productId ? `/product/${item.productId}` : '#'}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <p style={{ margin: '0 0 0.35rem', fontWeight: '700', fontSize: '0.9375rem', color: 'var(--text)' }}>
                                    {item.productName || 'Product'}
                                </p>
                            </Link>

                            {/* Status */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '99px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                backgroundColor: item.canceled ? 'rgba(239, 68, 68, 0.1)' : item.seen ? 'rgba(34, 197, 94, 0.1)' : 'rgba(37, 99, 235, 0.08)',
                                color: item.canceled ? '#ef4444' : item.seen ? '#22c55e' : 'var(--primary)',
                                marginBottom: '0.5rem',
                            }}>
                                {item.canceled ? <XCircle size={12} /> : item.seen ? <CheckCircle size={12} /> : <Clock size={12} />}
                                {item.canceled ? 'Buyer Cancelled' : item.seen ? 'Seller has seen your interest' : 'Waiting for seller to see'}
                            </div>

                            {/* Seller name if available */}
                            {item.sellerName && (
                                <p style={{ margin: '0 0 0.35rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    Seller: <strong>{item.sellerName}</strong>
                                </p>
                            )}

                            {/* Time + Cancel / Remove */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        {timeAgo(item.createdAt)}
                                    </span>
                                </div>

                                <button
                                    onClick={(e) => handleCancelInterest(e, item.id, item.canceled)}
                                    disabled={cancellingId === item.id}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.35rem 0.75rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '99px',
                                        background: 'none',
                                        color: item.canceled ? 'var(--text-secondary)' : 'var(--danger, #ef4444)',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        cursor: cancellingId === item.id ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <XCircle size={13} />
                                    {cancellingId === item.id ? 'Updating...' : item.canceled ? 'Remove' : 'Cancel Interest'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Notifications = () => {
    const { currentUser, isSeller } = useAuth();
    const navigate = useNavigate();

    if (!currentUser) {
        return (
            <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
                <div className="page-spinner" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: '700px' }}>
            {/* Header */}
            <button
                onClick={() => navigate(-1)}
                className="btn"
                style={{ color: 'var(--text-secondary)', paddingLeft: 0, marginBottom: '1.5rem' }}
            >
                <ArrowLeft size={20} /> Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{
                    width: '48px', height: '48px',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderRadius: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary)',
                }}>
                    {isSeller ? <Bell size={24} /> : <Heart size={24} />}
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.03em', margin: 0 }}>
                        {isSeller ? 'Notifications' : 'My Activity'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                        {isSeller
                            ? 'Buyers interested in your products'
                            : 'Products you\'ve shown interest in'}
                    </p>
                </div>
            </div>

            {/* Render the appropriate view */}
            {isSeller
                ? <SellerNotifications currentUser={currentUser} />
                : <BuyerActivity currentUser={currentUser} />
            }
        </div>
    );
};

export default Notifications;
