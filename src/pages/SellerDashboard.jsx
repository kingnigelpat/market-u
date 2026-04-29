import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { Link } from 'react-router-dom';
import { PlusCircle, UserCheck, Store } from 'lucide-react';

const SellerDashboard = () => {
    const { currentUser, userRole } = useAuth();
    const [products, setProducts] = useState([]);
    const [sellerData, setSellerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requestingVerif, setRequestingVerif] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (userRole === 'buyer') {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch seller details
                const sellerRef = doc(db, 'users', currentUser.uid);
                const sellerSnap = await getDoc(sellerRef);
                let currentSellerData = null;
                if (sellerSnap.exists()) {
                    currentSellerData = { id: sellerSnap.id, ...sellerSnap.data() };
                    setSellerData(currentSellerData);
                }

                // Fetch seller's products
                const q = query(
                    collection(db, 'products'),
                    where('sellerId', '==', currentUser.uid),
                );
                const querySnapshot = await getDocs(q);
                let productsData = querySnapshot.docs.map(snap => ({
                    id: snap.id,
                    ...snap.data()
                }));

                productsData.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });

                // ✅ AUTO-SYNC: If seller's verified status has changed,
                // batch-update ALL their products so badges stay in sync.
                if (currentSellerData) {
                    const liveVerified = !!currentSellerData.verified;
                    const outOfSync = productsData.filter(p => !!p.sellerVerified !== liveVerified);
                    if (outOfSync.length > 0) {
                        const batch = writeBatch(db);
                        outOfSync.forEach(p => {
                            batch.update(doc(db, 'products', p.id), { sellerVerified: liveVerified });
                        });
                        await batch.commit();
                        // Update local state too
                        productsData = productsData.map(p => ({ ...p, sellerVerified: liveVerified }));
                    }
                }

                setProducts(productsData);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchDashboardData();
        }
    }, [currentUser, userRole]);

    const handleBecomeSeller = async () => {
        setIsUpgrading(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { role: 'seller' });
            window.location.reload(); // Hard refresh to update auth context
        } catch (error) {
            console.error("Error upgrading to seller:", error);
            alert("Failed to upgrade. Please try again.");
        } finally {
            setIsUpgrading(false);
        }
    };

    const handleVerificationRequest = () => {
        const supportPhone = '2347073544811';
        const message = encodeURIComponent(`Hi, I'm ${currentUser.displayName || 'a seller'} and I'd like to request verification for my Market-U account (ID: ${currentUser.uid}).`);
        const whatsappUrl = `https://wa.me/${supportPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        
        const sellerRef = doc(db, 'users', currentUser.uid);
        updateDoc(sellerRef, { verificationStatus: 'pending' });
        setSellerData({ ...sellerData, verificationStatus: 'pending' });
    };

    if (loading) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading dashboard...</div>;
    }

    if (userRole === 'buyer') {
        return (
            <div className="container" style={{ paddingTop: '3rem', maxWidth: '600px' }}>
                <div className="card animate-fade-in-up" style={{ padding: '4rem 2.5rem', textAlign: 'center' }}>
                    <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
                        <Store size={40} color="var(--primary-color)" />
                    </div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>Ready to start selling?</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.125rem', lineHeight: '1.6' }}>
                        Join the Market-U seller community and reach hundreds of students on campus today.
                    </p>
                    <button 
                        onClick={handleBecomeSeller} 
                        disabled={isUpgrading}
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '1.125rem' }}
                    >
                        {isUpgrading ? 'Setting up your shop...' : 'Become a Seller Today'}
                    </button>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        By continuing, you agree to our seller terms and conditions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '1rem' }}>
            <div className="responsive-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Seller Dashboard
                        {sellerData?.verified && <VerifiedBadge size={28} />}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your products and store settings.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {!sellerData?.verified && sellerData?.verificationStatus !== 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={handleVerificationRequest}
                                disabled={requestingVerif}
                                className="btn btn-secondary"
                            >
                                <UserCheck size={18} />
                                {requestingVerif ? 'Requesting...' : 'Request Verification'}
                            </button>
                            <a href="https://wa.me/2347073544811" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'underline' }}>Contact Support</a>
                        </div>
                    )}
                    {!sellerData?.verified && sellerData?.verificationStatus === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            <div className="btn btn-secondary" style={{ opacity: 0.7, cursor: 'default' }}>
                                Verification Pending
                            </div>
                            <a href="https://wa.me/2347073544811" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '600' }}>
                                Verify on WhatsApp
                            </a>
                        </div>
                    )}

                    <Link to="/add-product" className="btn btn-primary" style={{ 
                        padding: '1rem 2rem', 
                        fontSize: '1rem', 
                        borderRadius: '1.25rem',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)',
                        transform: 'scale(1.05)',
                        transition: 'all 0.2s'
                    }}>
                        <PlusCircle size={22} /> Add Product
                    </Link>
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Your Products ({products.length})</h2>
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-4">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        <Store size={48} style={{ margin: '0 auto', opacity: 0.5 }} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No products listed yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Start building your inventory by adding your first product.</p>
                    <Link to="/add-product" className="btn btn-primary">
                        Add Your First Product
                    </Link>
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;
