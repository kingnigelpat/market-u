import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bookmark, ArrowLeft, Trash2, ShoppingBag, ExternalLink } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';

const SavedItems = () => {
    const { currentUser, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(null); // docId being removed

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        const fetchSaved = async () => {
            try {
                const q = query(
                    collection(db, 'savedItems'),
                    where('buyerId', '==', currentUser.uid),
                    orderBy('savedAt', 'desc')
                );
                const snap = await getDocs(q);
                setItems(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
            } catch (e) {
                console.error('Error fetching saved items:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const handleRemove = async (docId) => {
        setRemoving(docId);
        try {
            await deleteDoc(doc(db, 'savedItems', docId));
            setItems(prev => prev.filter(i => i.docId !== docId));
        } catch (e) {
            console.error('Remove saved error:', e);
        } finally {
            setRemoving(null);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: '760px' }}>

            {/* Back */}
            <button
                onClick={() => navigate(-1)}
                className="btn"
                style={{ color: 'var(--text-secondary)', paddingLeft: 0, marginBottom: '1.5rem' }}
            >
                <ArrowLeft size={20} /> Back
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '2rem' }}>
                <div style={{
                    width: '48px', height: '48px',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderRadius: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary-color)',
                }}>
                    <Bookmark size={22} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.03em', margin: 0 }}>
                        Saved Items
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                        Products you saved for later
                    </p>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading your saved items...
                </div>
            )}

            {/* Empty state */}
            {!loading && items.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border-color)',
                }}>
                    <div style={{
                        width: '72px', height: '72px',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        color: 'var(--primary-color)',
                    }}>
                        <ShoppingBag size={32} />
                    </div>
                    <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                        Nothing saved yet
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                        Tap the 🔖 bookmark icon on any product to save it here.
                    </p>
                    <Link to="/market" className="btn btn-primary" style={{ borderRadius: '99px', padding: '0.75rem 1.5rem' }}>
                        Browse Market
                    </Link>
                </div>
            )}

            {/* Saved cards */}
            {!loading && items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {items.map((item, idx) => (
                        <div
                            key={item.docId}
                            className="animate-fade-in-up"
                            style={{
                                animationDelay: `${idx * 0.04}s`,
                                backgroundColor: 'var(--surface-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-xl)',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                transition: 'box-shadow 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md, 0 4px 16px -4px rgba(0,0,0,0.12))'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                        >
                            {/* Thumbnail */}
                            <Link
                                to={`/product/${item.productId}`}
                                style={{
                                    flexShrink: 0,
                                    width: '76px',
                                    height: '76px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    backgroundColor: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {item.productImage ? (
                                    <img
                                        src={optimizeImage(item.productImage, 150)}
                                        alt={item.productTitle}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <ShoppingBag size={28} color="var(--text-secondary)" />
                                )}
                            </Link>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Link
                                    to={`/product/${item.productId}`}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <p style={{
                                        fontWeight: '700',
                                        fontSize: '0.9375rem',
                                        margin: '0 0 0.25rem 0',
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {item.productTitle}
                                    </p>
                                </Link>
                                <p style={{
                                    fontSize: '1rem',
                                    fontWeight: '800',
                                    color: 'var(--primary-color)',
                                    margin: '0 0 0.35rem 0',
                                }}>
                                    ₦{parseFloat(item.productPrice || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </p>
                                <p style={{
                                    fontSize: '0.8125rem',
                                    color: 'var(--text-secondary)',
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                }}>
                                    Sold by <strong style={{ color: 'var(--text-primary)' }}>{item.sellerName}</strong>
                                </p>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                                <Link
                                    to={`/product/${item.productId}`}
                                    title="View product"
                                    style={{
                                        width: '36px', height: '36px',
                                        borderRadius: '10px',
                                        border: '1.5px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-color)',
                                        color: 'var(--primary-color)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        textDecoration: 'none',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.08)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-color)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                >
                                    <ExternalLink size={15} />
                                </Link>
                                <button
                                    onClick={() => handleRemove(item.docId)}
                                    disabled={removing === item.docId}
                                    title="Remove from saved"
                                    style={{
                                        width: '36px', height: '36px',
                                        borderRadius: '10px',
                                        border: '1.5px solid rgba(239, 68, 68, 0.2)',
                                        backgroundColor: 'rgba(239, 68, 68, 0.04)',
                                        color: 'var(--danger-color)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: removing === item.docId ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: removing === item.docId ? 0.5 : 1,
                                    }}
                                    onMouseEnter={e => { if (removing !== item.docId) e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.04)'; }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedItems;
