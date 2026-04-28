import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { Link } from 'react-router-dom';
import { PlusCircle, UserCheck, Store } from 'lucide-react';

const SellerDashboard = () => {
    const { currentUser } = useAuth();
    const [products, setProducts] = useState([]);
    const [sellerData, setSellerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requestingVerif, setRequestingVerif] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetch seller details
                const sellerRef = doc(db, 'users', currentUser.uid);
                const sellerSnap = await getDoc(sellerRef);
                if (sellerSnap.exists()) {
                    setSellerData({ id: sellerSnap.id, ...sellerSnap.data() });
                }

                // Fetch seller's products
                const q = query(
                    collection(db, 'products'),
                    where('sellerId', '==', currentUser.uid),
                    // Note: Needs composite index in Firestore for where + orderBy. We omit orderBy here to simplify local setup, or do it client side.
                );
                const querySnapshot = await getDocs(q);
                let productsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Client side sort
                productsData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

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
    }, [currentUser]);

    const handleVerificationRequest = () => {
        const supportPhone = '2349013011233'; // Consistent support number
        const message = encodeURIComponent(`Hi, I'm ${currentUser.displayName || 'a seller'} and I'd like to request verification for my Market-U account (ID: ${currentUser.uid}).`);
        const whatsappUrl = `https://wa.me/${supportPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        
        // Still update the status in Firestore for tracking
        const sellerRef = doc(db, 'users', currentUser.uid);
        updateDoc(sellerRef, { verificationStatus: 'pending' });
        setSellerData({ ...sellerData, verificationStatus: 'pending' });
    };

    if (loading) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading dashboard...</div>;
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
                            <a href="https://wa.me/2349013011233" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '600' }}>
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
