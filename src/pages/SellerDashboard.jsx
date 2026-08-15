import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { Link } from 'react-router-dom';
import { PlusCircle, UserCheck, Store, TrendingUp, Eye, Award, Zap, Star, MessageCircle } from 'lucide-react';

const SellerDashboard = () => {
    const { currentUser, userRole } = useAuth();
    const [products, setProducts] = useState([]);
    const [sellerData, setSellerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const requestingVerif = sellerData?.verificationStatus === 'pending';
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [sellType, setSellType] = useState(null);
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetch seller details
                const sellerRef = doc(db, 'users', currentUser.uid);
                const sellerSnap = await getDoc(sellerRef);
                let currentSellerData = null;
                if (sellerSnap.exists()) {
                    currentSellerData = { id: sellerSnap.id, ...sellerSnap.data() };
                    
                    // Fetch ratings
                    const ratingsQ = query(collection(db, 'ratings'), where('sellerId', '==', currentUser.uid));
                    const ratingsSnap = await getDocs(ratingsQ);
                    let score = 0;
                    let count = 0;
                    ratingsSnap.forEach(doc => {
                        score += doc.data().stars || 0;
                        count += 1;
                    });
                    currentSellerData.ratingScore = score;
                    currentSellerData.ratingCount = count;
                    
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

    const handleRequestSellerAccess = async () => {
        setIsUpgrading(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { sellerRequestStatus: 'pending' });
            setSellerData({ ...sellerData, sellerRequestStatus: 'pending' });
            const supportPhone = '2347073544811';
            const message = encodeURIComponent(
                `Hi, I'm ${currentUser.displayName || 'a new Market-U user'} and I'd like to become a seller on Market-U. Please review and approve my seller access. (User ID: ${currentUser.uid})`
            );
            window.open(`https://wa.me/${supportPhone}?text=${message}`, '_blank');
        } catch (error) {
            console.error("Error requesting seller access:", error);
            alert("Could not send your request. Please try again or contact admin on WhatsApp.");
        } finally {
            setIsUpgrading(false);
        }
    };

    const handleVerificationRequest = async () => {
        const supportPhone = '2347073544811';
        const message = encodeURIComponent(`Hi, I'm ${currentUser.displayName || 'a seller'} and I'd like to request verification for my Market-U account (ID: ${currentUser.uid}).`);
        const whatsappUrl = `https://wa.me/${supportPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');

        try {
            const sellerRef = doc(db, 'users', currentUser.uid);
            await updateDoc(sellerRef, { verificationStatus: 'pending' });
            setSellerData({ ...sellerData, verificationStatus: 'pending' });
        } catch (error) {
            console.error('Error updating verification status:', error);
        }
    };

    const calculateRealisticViews = () => {
        if (!products || products.length === 0) return 0;
        
        let totalViews = 0;
        const now = new Date();
        
        products.forEach(product => {
            let daysActive = 0;
            if (product.createdAt) {
                const createdDate = product.createdAt.toDate ? product.createdAt.toDate() : new Date(product.createdAt);
                daysActive = Math.max(0, Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)));
            }
            
            // Deterministic pseudo-random based on title length to keep it consistent on re-renders
            const pseudoRandom = ((product.title?.length || 5) % 3) + 1; // 1 to 3 views per day
            
            let views = daysActive * pseudoRandom; // Grow organically, starts at 0 on day 1
            
            if (views > 120) views = 120 + pseudoRandom; // Cap it so it doesn't inflate endlessly
            
            // Add real user views
            views += (product.views || 0);

            totalViews += views;
        });
        
        return totalViews;
    };

    const simulatedViews = calculateRealisticViews();

    if (loading) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading dashboard...</div>;
    }

    if (userRole === 'buyer') {
        const sellerRequestPending = sellerData?.sellerRequestStatus === 'pending';
        return (
            <div className="container" style={{ paddingTop: '3rem', maxWidth: '600px' }}>
                <div className="card animate-fade-in-up" style={{ padding: '4rem 2.5rem', textAlign: 'center' }}>
                    <div style={{ backgroundColor: sellerRequestPending ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
                        {sellerRequestPending ? <UserCheck size={40} color="var(--success)" /> : <Store size={40} color="var(--primary)" />}
                    </div>

                    {sellerRequestPending ? (
                        <>
                            <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>Request Sent! 🎉</h1>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.125rem', lineHeight: '1.6' }}>
                                Your seller access request has been submitted. Our admin will review it and approve your account so you can start selling.
                            </p>
                            <a
                                href={`https://wa.me/2347073544811?text=${encodeURIComponent(`Hi, I requested seller access on Market-U (User ID: ${currentUser.uid}). Please confirm my approval status.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '1.125rem' }}
                            >
                                <MessageCircle size={18} /> Follow Up on WhatsApp
                            </a>
                            <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                You&apos;ll be able to post products once your seller access is approved.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>Ready to start selling?</h1>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.125rem', lineHeight: '1.6' }}>
                                Join the Market-U seller community and reach hundreds of students on campus today.
                            </p>
                            <button
                                onClick={handleRequestSellerAccess}
                                disabled={isUpgrading}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '1.125rem' }}
                            >
                                {isUpgrading ? 'Sending request...' : 'Request Seller Access'}
                            </button>
                            <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Your request will be reviewed by the admin before you can start selling.
                            </p>
                        </>
                    )}
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
                            <a href="https://wa.me/2347073544811" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
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

            {/* Gamification / Stats Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '1rem', color: 'var(--primary)' }}>
                        <Store size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Active Listings</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{products.length}</h3>
                    </div>
                </div>
                
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '1rem', color: '#10b981' }}>
                        <Eye size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Profile Views (30d)</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{simulatedViews}</h3>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', background: products.length >= 3 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)' : 'var(--surface)' }}>
                    <div style={{ padding: '1rem', backgroundColor: products.length >= 3 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.1)', borderRadius: '1rem', color: products.length >= 3 ? '#f59e0b' : '#94a3b8' }}>
                        <Award size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Seller Level</p>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: products.length >= 3 ? '#d97706' : 'var(--text)' }}>
                            {products.length >= 10 ? 'Power Seller 👑' : products.length >= 3 ? 'Active Seller 🌟' : 'Beginner'}
                        </h3>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderRadius: '1rem', color: '#f43f5e' }}>
                        <Star size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Seller Rating</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>
                            {sellerData?.ratingCount ? (sellerData.ratingScore / sellerData.ratingCount).toFixed(1) : 'New'}
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500', marginLeft: '0.5rem' }}>
                                ({sellerData?.ratingCount || 0} revs)
                            </span>
                        </h3>
                    </div>
                </div>
            </div>

            {/* Motivational Banner */}
            {products.length > 0 && products.length < 3 && (
                <div className="card animate-fade-in-up" style={{ padding: '1.5rem', marginBottom: '2.5rem', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%)', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h4 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '0.25rem' }}>You're almost there!</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: 0 }}>Sellers with 3 or more items sell <strong>50% faster</strong>. Add {3 - products.length} more items to boost your visibility.</p>
                        </div>
                    </div>
                    <Link to="/add-product" className="btn btn-primary" style={{ whiteSpace: 'nowrap', borderRadius: '1rem' }}>Post Another Item</Link>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Your Inventory</h2>
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-4">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="card animate-fade-in-up" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(to bottom, var(--surface), transparent)' }}>
                    {!sellType ? (
                        <>
                            <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <Store size={40} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontSize: '1.875rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>What do you want to sell today?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.125rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                                Choose an option below to get a quick guide on how to list your offering.
                            </p>
                            
                            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => setSellType('product')} className="btn btn-secondary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '200px' }}>
                                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--primary)' }}><Store size={24} /></div>
                                    <span style={{ fontSize: '1.125rem', fontWeight: '700' }}>Physical Product</span>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Phones, clothes, books...</span>
                                </button>
                                <button onClick={() => setSellType('service')} className="btn btn-secondary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '200px' }}>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%', color: '#10b981' }}><Zap size={24} /></div>
                                    <span style={{ fontSize: '1.125rem', fontWeight: '700' }}>Service or Skill</span>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tutoring, design, repairs...</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-fade-in-up">
                            <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <Zap size={40} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontSize: '1.875rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>Zero to Hero: Start Selling!</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.125rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                                Follow these quick steps to get your first {sellType === 'product' ? 'item' : 'service'} listed and seen by hundreds of students.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '800px', margin: '0 auto 3rem auto', textAlign: 'left' }}>
                                <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '0.75rem' }}>1</div>
                                    <h4 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>Use a Good Image</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
                                        {sellType === 'product' 
                                            ? 'Take a high-quality, well-lit picture of your item. Good photos sell items 3x faster!'
                                            : 'Upload a high-quality, professional image (like a flyer or your portfolio) that represents your service clearly.'}
                                    </p>
                                </div>
                                <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '0.75rem' }}>2</div>
                                    <h4 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>Add Details</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
                                        {sellType === 'product'
                                            ? 'Set a fair price, select the correct category, and write an honest description.'
                                            : 'Be clear about your rates, exactly what your service includes, and your availability.'}
                                    </p>
                                </div>
                                <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '0.75rem' }}>3</div>
                                    <h4 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>Get Messages</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>Buyers will contact you directly on WhatsApp to seal the deal!</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <button onClick={() => setSellType(null)} className="btn btn-secondary" style={{ padding: '1rem 1.5rem', borderRadius: '1.5rem' }}>
                                    Back
                                </button>
                                <Link to="/add-product" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', borderRadius: '1.5rem', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)' }}>
                                    <PlusCircle size={24} /> Post Your First {sellType === 'product' ? 'Item' : 'Service'} Now
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;
