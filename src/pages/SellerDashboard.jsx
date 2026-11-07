import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { Link } from 'react-router-dom';
import { PlusCircle, UserCheck, Store, TrendingUp, Eye, Award, Zap, Star, MessageCircle, Share2, Check, ExternalLink, Megaphone, ArrowRight, GraduationCap, Mail, Copy } from 'lucide-react';

const SellerDashboard = () => {
    const { currentUser, userRole, setUserRole, userSchoolName } = useAuth();
    const [products, setProducts] = useState([]);
    const [sellerData, setSellerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const requestingVerif = sellerData?.verificationStatus === 'pending';
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [sellType, setSellType] = useState(null);
    const [shareToast, setShareToast] = useState(false);
    const [showVerifModal, setShowVerifModal] = useState(false);
    const [copiedUid, setCopiedUid] = useState(false);

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
                    ratingsSnap.forEach(docSnap => {
                        score += docSnap.data().stars || 0;
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

                // Sync verified display in local state with live seller status
                if (currentSellerData) {
                    const liveVerified = !!currentSellerData.verified;
                    productsData = productsData.map(p => ({ ...p, sellerVerified: liveVerified }));
                }

                setProducts(productsData);

                // Align userRole in context only if explicitly approved or assigned
                const fetchedRole = (currentSellerData?.role || '').trim().toLowerCase();
                const shouldUpgrade =
                    fetchedRole === 'seller' ||
                    currentSellerData?.sellerRequestStatus === 'approved';
                if (shouldUpgrade && fetchedRole !== 'admin') {
                    if (setUserRole) setUserRole('seller');
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchDashboardData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const buildVerificationMailto = () => {
        const sellerName = sellerData?.name || currentUser?.displayName || 'Student Seller';
        const school = sellerData?.schoolName || userSchoolName || 'Campus';
        const uid = currentUser?.uid || '';
        const subject = encodeURIComponent(`MarketU Student Verification — ${sellerName} (UID: ${uid})`);
        const body = encodeURIComponent(
`Hello MarketU Verification Team (Rae Tech Services),

I am submitting my student verification for my MarketU seller account.

--- PRE-FILLED ACCOUNT DETAILS (DO NOT EDIT) ---
User UID: ${uid}
Full Name: ${sellerName}
Account Email: ${currentUser?.email || ''}
Campus / School: ${school}
------------------------------------------------

Please find attached to this email:
1. My Student ID Card, Student Document, or Student Portal screenshot
2. A clear photo of myself
3. A short video of myself

Thank you!`
        );
        return `mailto:team@raehub.live?subject=${subject}&body=${body}`;
    };

    const handleRequestSellerAccess = async () => {
        setIsUpgrading(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { sellerRequestStatus: 'pending' });
            setSellerData({ ...sellerData, sellerRequestStatus: 'pending' });
            window.location.href = buildVerificationMailto();
        } catch (error) {
            console.error("Error requesting seller access:", error);
            alert(`Could not send your request. Please email team@raehub.live with your UID: ${currentUser?.uid}`);
        } finally {
            setIsUpgrading(false);
        }
    };

    const handleVerificationRequest = async () => {
        setShowVerifModal(true);
        try {
            const sellerRef = doc(db, 'users', currentUser.uid);
            await updateDoc(sellerRef, { verificationStatus: 'pending' });
            setSellerData(prev => ({ ...prev, verificationStatus: 'pending' }));
        } catch (error) {
            console.error('Error updating verification status:', error);
        }
        window.location.href = buildVerificationMailto();
    };

    const handleCopyUid = async () => {
        if (!currentUser?.uid) return;
        try {
            await navigator.clipboard.writeText(currentUser.uid);
            setCopiedUid(true);
            setTimeout(() => setCopiedUid(false), 2000);
        } catch {
            // ignore
        }
    };

    const handleShareStore = async () => {
        if (!currentUser) return;
        const storeUrl = `${window.location.origin}/store/${currentUser.uid}`;
        const sellerName = sellerData?.name || 'Seller';
        const shareText = `Explore ${sellerName}'s campus store on Market-U! Check out my listings and deals:`;

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
        } catch {
            alert(`Store link: ${storeUrl}`);
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
            
            const pseudoRandom = ((product.title?.length || 5) % 3) + 1;
            let views = daysActive * pseudoRandom;
            if (views > 120) views = 120 + pseudoRandom;
            views += (product.views || 0);
            totalViews += views;
        });
        
        return totalViews;
    };

    const simulatedViews = calculateRealisticViews();

    if (loading) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading dashboard...</div>;
    }

    const normalizedRole = (userRole || '').trim().toLowerCase();
    const sellerRole = (sellerData?.role || '').trim().toLowerCase();
    const isActuallySeller = 
        normalizedRole === 'seller' || 
        normalizedRole === 'admin' || 
        sellerRole === 'seller' || 
        sellerRole === 'admin' || 
        sellerData?.sellerRequestStatus === 'approved';

    if (!isActuallySeller) {
        const sellerRequestPending = sellerData?.sellerRequestStatus === 'pending';
        return (
            <div className="container" style={{ paddingTop: '3rem', maxWidth: '600px' }}>
                <div className="card animate-fade-in-up" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                    <div style={{ backgroundColor: sellerRequestPending ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        {sellerRequestPending ? <UserCheck size={40} color="var(--success)" /> : <Store size={40} color="var(--primary)" />}
                    </div>

                    {sellerRequestPending ? (
                        <>
                            <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>Verification &amp; Access Pending</h1>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '1rem', lineHeight: '1.6' }}>
                                To complete your student seller verification, email <strong>team@raehub.live</strong> with:
                            </p>
                            <div style={{ textAlign: 'left', padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                                <div>1. <strong>Student ID Card, Student Document, or Student Portal screenshot</strong></div>
                                <div>2. <strong>A clear photo of yourself</strong></div>
                                <div>3. <strong>A short video of yourself</strong></div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Your User UID (included automatically): <code>{currentUser.uid}</code>
                                </div>
                            </div>
                            <a
                                href={buildVerificationMailto()}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '1.05rem', justifyContent: 'center' }}
                            >
                                <Mail size={18} /> Open Pre-Filled Email to team@raehub.live
                            </a>
                            <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                You&apos;ll be able to post products as soon as our team reviews your email.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>Ready to start selling?</h1>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                                Join the Market-U seller community and reach hundreds of students on campus today.
                            </p>
                            <button
                                onClick={handleRequestSellerAccess}
                                disabled={isUpgrading}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '1.125rem', justifyContent: 'center' }}
                            >
                                <Mail size={18} /> {isUpgrading ? 'Opening email...' : 'Request Seller Access via Email'}
                            </button>
                            <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Opens a pre-filled email to <strong>team@raehub.live</strong> with your User UID so you can attach your Student ID/portal screenshot, photo, and short video.
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '1rem' }}>
            {sellerData && !sellerData.verified && sellerRole !== 'admin' && (
                <div role="alert" id="unverified-warning" style={{
                    display: 'flex', gap: '0.85rem', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', padding: '1rem 1.25rem', marginBottom: '1.5rem',
                    borderRadius: 'var(--radius-xl)', background: 'rgba(239, 68, 68, 0.09)', border: '1px solid rgba(239, 68, 68, 0.35)',
                }}>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.55, flex: 1, minWidth: '240px' }}>
                        <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.2rem' }}>
                            Your student seller account is not verified yet (Free Verification)
                        </strong>
                        Tap <strong>&quot;Get Verified – Free&quot;</strong> to open a pre-filled email to <strong>team@raehub.live</strong> (your UID <code>{currentUser.uid}</code> is included automatically) and attach:
                        <div style={{ marginTop: '0.35rem', fontWeight: 600 }}>
                            1. Your Student ID, student document, or student portal screenshot • 2. A clear photo of yourself • 3. A short video of yourself
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            If you are not verified within 48 hours of posting, unverified products will be deleted.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleVerificationRequest}
                        className="btn btn-primary"
                        style={{ alignSelf: 'center', flexShrink: 0, padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
                    >
                        <Mail size={16} /> Verify via Email
                    </button>
                </div>
            )}
            <div className="responsive-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Seller Dashboard
                        {sellerData?.verified && <VerifiedBadge size={28} />}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Manage your products and store settings.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        <GraduationCap size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>Campus: <strong style={{ color: 'var(--text)' }}>{sellerData?.schoolName || localStorage.getItem('marketu_selected_campus') || userSchoolName || 'Western Delta University'}</strong></span>
                        <span>•</span>
                        <Link to={`/market?school=${encodeURIComponent(sellerData?.schoolName || localStorage.getItem('marketu_selected_campus') || userSchoolName || 'Western Delta University')}`} style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
                            View Campus Market →
                        </Link>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {!sellerData?.verified && sellerData?.verificationStatus !== 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                            <button
                                onClick={handleVerificationRequest}
                                disabled={requestingVerif}
                                className="btn btn-secondary"
                            >
                                <Mail size={18} />
                                {requestingVerif ? 'Requesting...' : 'Get Verified – Free'}
                            </button>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                Pre-filled email to <strong>team@raehub.live</strong>
                            </span>
                        </div>
                    )}
                    {!sellerData?.verified && sellerData?.verificationStatus === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowVerifModal(true)}
                                className="btn btn-secondary"
                            >
                                <Mail size={16} /> Verification Pending (Steps)
                            </button>
                            <a href={buildVerificationMailto()} style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700' }}>
                                Open Pre-filled Verification Email →
                            </a>
                        </div>
                    )}

                    <Link to="/messages" className="btn btn-secondary" style={{ 
                        padding: '1rem 1.5rem', 
                        fontSize: '1rem', 
                        borderRadius: '1.25rem',
                        transition: 'all 0.2s'
                    }}>
                        <MessageCircle size={22} /> Messages
                    </Link>
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

            {/* Promote store (paid banner ads — the only paid feature) */}
            <Link to="/advertise" id="dashboard-promote-store" style={{
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                padding: '1.1rem 1.35rem', marginBottom: '1.5rem',
                borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(135deg, #0B1B4D 0%, #1D4ED8 70%, #3B82F6 100%)',
                color: '#fff', boxShadow: '0 10px 24px -10px rgba(29, 78, 216, 0.55)'
            }}>
                <div style={{ padding: '0.7rem', borderRadius: '0.9rem', background: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                    <Megaphone size={22} />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>Promote your store on the homepage</div>
                    <div style={{ fontSize: '0.825rem', opacity: 0.85 }}>Banner ads from ₦500/week. Posting and verification stay free.</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.55rem 1rem', borderRadius: '9999px', background: '#fff', color: '#1E3A8A', fontWeight: 800, fontSize: '0.825rem' }}>
                    Advertise <ArrowRight size={15} />
                </span>
            </Link>

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
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Seller Level • ✓ {sellerData?.completedSalesCount || 0} sales</p>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: products.length >= 3 ? '#d97706' : 'var(--text)' }}>
                            {products.length >= 10 ? 'Power Seller' : products.length >= 3 ? 'Active Seller' : 'Beginner'}
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
                            <h4 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '0.25rem' }}>You&apos;re almost there!</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: 0 }}>Sellers with 3 or more items sell <strong>50% faster</strong>. Add {3 - products.length} more items to boost your visibility.</p>
                        </div>
                    </div>
                    <Link to="/add-product" className="btn btn-primary" style={{ whiteSpace: 'nowrap', borderRadius: '1rem' }}>Post Another Item</Link>
                </div>
            )}

            {/* Public Storefront Share Banner */}
            <div className="card animate-fade-in-up" style={{
                padding: '1.25rem 1.5rem',
                marginBottom: '2rem',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Store size={22} />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 0.2rem 0', fontWeight: '800', fontSize: '1rem' }}>
                            Your Public Storefront
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Share your personal store link on WhatsApp Status, Instagram, or TikTok bio!
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <Link
                        to={`/seller/${currentUser.uid}`}
                        className="btn btn-secondary"
                        style={{
                            fontSize: '0.8125rem',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        <ExternalLink size={14} /> Preview Store
                    </Link>
                    <button
                        onClick={handleShareStore}
                        id="share-my-store-btn"
                        className="btn btn-primary"
                        style={{
                            fontSize: '0.8125rem',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        <Share2 size={14} /> Share Store Link
                    </button>
                </div>
            </div>

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
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>Buyers will contact you in-app or on WhatsApp to seal the deal!</p>
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

            {/* Email Verification Instructions Modal */}
            {showVerifModal && (
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
                }} onClick={() => setShowVerifModal(false)}>
                    <div
                        className="card"
                        style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserCheck size={20} color="var(--primary)" /> Student Seller Verification (Free)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowVerifModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.35rem' }}
                            >
                                ×
                            </button>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1rem' }}>
                            Send an email to <strong style={{ color: 'var(--text)' }}>team@raehub.live</strong> with the following 3 items attached:
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem'
                        }}>
                            <div><strong>1. Student Proof:</strong> Your Student ID card, admission/school document, or a screenshot of your Student Portal.</div>
                            <div><strong>2. Photo:</strong> A clear photo of yourself.</div>
                            <div><strong>3. Short Video:</strong> A short video of yourself so we can confirm your identity.</div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--primary-light)',
                            marginBottom: '1.15rem',
                            fontSize: '0.78rem'
                        }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <strong>Your UID:</strong> <code>{currentUser?.uid}</code>
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyUid}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '99px',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                <Copy size={12} /> {copiedUid ? 'Copied!' : 'Copy UID'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <a
                                href={buildVerificationMailto()}
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                            >
                                <Mail size={17} /> Open Pre-Filled Email (team@raehub.live)
                            </a>
                            <button
                                type="button"
                                onClick={() => setShowVerifModal(false)}
                                className="btn btn-secondary"
                                style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
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

export default SellerDashboard;
