import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '../components/ProductCard';
import { Search, PackagePlus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InstallGuideModal from '../components/InstallGuideModal';

const Home = () => {
    const { isAuthenticated, isSeller, currentUser, userName } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const productsRef = useRef(null);

    const [showDownloadPrompt, setShowDownloadPrompt] = useState(() => {
        return localStorage.getItem('hideDownloadPrompt') !== 'true';
    });

    const dismissDownloadPrompt = () => {
        setShowDownloadPrompt(false);
        localStorage.setItem('hideDownloadPrompt', 'true');
    };

    const handleSearch = (term, category = null) => {
        if (term !== null) setSearchTerm(term);
        if (category !== null) setCategoryFilter(category);
        
        // Scroll down to products
        setTimeout(() => {
            if (productsRef.current) {
                productsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Fetch Products - Limit to top 50 for speed
                const q = query(
                    collection(db, 'products'), 
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
                const querySnapshot = await getDocs(q);

                let productsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setProducts(productsData);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        const matchesVerified = !verifiedOnly || Boolean(product.sellerVerified) === true;
        return matchesSearch && matchesCategory && matchesVerified;
    }).sort((a, b) => {
        if (a.sellerVerified === b.sellerVerified) {
            const viewsA = a.views || 0;
            const viewsB = b.views || 0;
            return viewsB - viewsA;
        }
        return a.sellerVerified ? -1 : 1;
    });

    return (
        <div className="market-container" style={{ paddingBottom: '8rem', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
            {/* Minimal Active Dashboard Hero - Mobile First */}
            <div className="dashboard-hero" style={{ 
                backgroundColor: 'var(--surface-color)',
                padding: '1.5rem 1rem',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '1.5rem',
                position: 'sticky',
                top: 0,
                zIndex: 40,
                boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)'
            }}>
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: 0 }}>
                    {/* Header / Greeting */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                                {isAuthenticated ? `Hi, ${(currentUser?.displayName || userName)?.split(' ')[0] || 'there'} 👋` : 'Campus Market 🚀'}
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
                                Find what you need instantly
                            </p>
                        </div>
                        {/* Active Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', backgroundColor: '#f0fdf4', padding: '0.375rem 0.75rem', borderRadius: '99px', border: '1px solid #bbf7d0' }}>
                            <span style={{ width: '6px', height: '6px', backgroundColor: '#16a34a', borderRadius: '50%', boxShadow: '0 0 8px #16a34a', animation: 'pulse 2s infinite' }}></span>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803d' }}>Live</span>
                        </div>
                    </div>

                    {/* Main Search Bar */}
                    <div style={{ position: 'relative', marginBottom: '1.25rem', width: '100%' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '1.25rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search campus items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                            className="search-input-focus"
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3.5rem',
                                fontSize: '1rem',
                                fontWeight: '500',
                                backgroundColor: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '1rem',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
                            }}
                        />
                    </div>

                    {/* Quick Category Chips */}
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="hide-scrollbar">
                        <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(false) }} className={`filter-pill ${categoryFilter === 'all' && !verifiedOnly ? 'active' : ''}`}>🔥 All</button>
                        <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(true) }} className={`filter-pill ${verifiedOnly ? 'active' : ''}`}>⭐ Verified</button>
                        <button onClick={() => setCategoryFilter('Electronics')} className={`filter-pill ${categoryFilter === 'Electronics' ? 'active' : ''}`}>💻 Tech</button>
                        <button onClick={() => setCategoryFilter('Fashion')} className={`filter-pill ${categoryFilter === 'Fashion' ? 'active' : ''}`}>👕 Fashion</button>
                        <button onClick={() => setCategoryFilter('Services')} className={`filter-pill ${categoryFilter === 'Services' ? 'active' : ''}`}>🛠️ Services</button>
                        <button onClick={() => setCategoryFilter('Food & Groceries')} className={`filter-pill ${categoryFilter === 'Food & Groceries' ? 'active' : ''}`}>🍕 Food</button>
                    </div>
                </div>
            </div>

            <div className="container" ref={productsRef}>
                {/* Download App Prompt Banner */}
                {showDownloadPrompt && (
                    <div className="animate-fade-in-up" style={{ 
                        marginBottom: '2.5rem', 
                        padding: '1.5rem', 
                        background: isSeller 
                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)' 
                            : 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%)',
                        borderRadius: 'var(--radius-xl)',
                        border: isSeller ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(37, 99, 235, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '1rem',
                        position: 'relative'
                    }}>
                        <button 
                            onClick={dismissDownloadPrompt}
                            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}
                            aria-label="Dismiss"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <div>
                            {isSeller ? (
                                <>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '800', marginBottom: '0.25rem', color: '#d97706' }}>⭐️ Premium Seller Access</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Download our app to manage your store, track views, and reply to customers faster!</p>
                                </>
                            ) : (
                                <>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '800', marginBottom: '0.25rem' }}>Get the Market-U App</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Experience faster browsing and get instant notifications when items drop.</p>
                                </>
                            )}
                        </div>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => setShowInstallGuide(true)}
                            style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', backgroundColor: isSeller ? '#d97706' : 'var(--primary-color)', color: 'white', border: 'none' }}
                        >
                            Download App
                        </button>
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {categoryFilter === 'all' && !searchTerm ? '🔥 Trending & Just Added' : categoryFilter === 'all' ? 'Search Results' : categoryFilter}
                            <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-color)', padding: '0.25rem 0.75rem', borderRadius: '99px' }}>
                                {filteredProducts.length} items
                            </span>
                        </h2>
                    </div>
                </div>

                {/* Product Feed */}
                {loading ? (
                    <div className="grid grid-cols-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <div key={n} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>
                                <div className="skeleton" style={{ paddingTop: '100%', width: '100%', borderRadius: '0' }}></div>
                                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div className="skeleton" style={{ height: '1.25rem', width: '80%' }}></div>
                                    <div className="skeleton" style={{ height: '1rem', width: '50%' }}></div>
                                    <div className="skeleton" style={{ height: '1.5rem', width: '40%', marginTop: 'auto' }}></div>
                                    <div className="skeleton" style={{ height: '2.5rem', width: '100%', borderRadius: '1rem', marginTop: '0.5rem' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-4">
                        {filteredProducts.map((product, index) => (
                            <ProductCard key={product.id} product={product} index={index} />
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', borderStyle: 'dashed', backgroundColor: 'transparent' }}>
                        <div style={{ backgroundColor: 'var(--surface-color)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <PackagePlus size={40} color="var(--text-secondary)" />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem' }}>No items found</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>Try different keywords or check all categories to see what else is available.</p>
                        <button onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setVerifiedOnly(false) }} className="btn btn-primary" style={{ padding: '0.875rem 2.5rem', borderRadius: '1rem' }}>
                            Clear all filters
                        </button>
                    </div>
                )}

                {/* Guest CTA Sticky Bar */}
                {!isAuthenticated && (
                    <div style={{
                        position: 'fixed',
                        bottom: '2.5rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        width: 'calc(100% - 2rem)',
                        maxWidth: '550px'
                    }}>
                        <Link to="/register" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#1e293b',
                            color: 'white',
                            padding: '1.25rem 2rem',
                            borderRadius: '2rem',
                            textDecoration: 'none',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)'
                        }} className="guest-cta-bar">
                            <div>
                                <p style={{ margin: 0, fontWeight: '800', fontSize: '1.05rem' }}>Unlock the full experience</p>
                                <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>Join 500+ students buying and selling daily</p>
                            </div>
                            <div style={{ 
                                backgroundColor: 'var(--primary-color)', 
                                padding: '0.75rem', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)'
                            }}>
                                <ArrowRight size={22} />
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            <InstallGuideModal 
                isOpen={showInstallGuide} 
                onClose={() => setShowInstallGuide(false)} 
            />

            <style>{`
                .hero-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    animation: float-orb 20s infinite alternate ease-in-out;
                    will-change: transform;
                }
                .orb-1 { width: 450px; height: 450px; background: rgba(56, 189, 248, 0.5); top: -150px; left: -100px; }
                .orb-2 { width: 350px; height: 350px; background: rgba(139, 92, 246, 0.5); bottom: -50px; right: -50px; animation-delay: -5s; }
                .orb-3 { width: 300px; height: 300px; background: rgba(236, 72, 153, 0.4); top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -10s; }

                @keyframes float-orb {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(30px, 50px) scale(1.1); }
                }

                .hero-search-input {
                    width: 100%;
                    padding: 1.25rem 8rem 1.25rem 3.5rem;
                    font-size: 1.125rem;
                    border-radius: 1rem;
                    border: 1px solid rgba(255,255,255,0.15);
                    background-color: rgba(255,255,255,0.05);
                    color: white;
                    outline: none;
                    backdrop-filter: blur(16px);
                    transition: all 0.3s ease;
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
                }
                .hero-search-input::placeholder {
                    color: #64748b;
                }
                .hero-search-input:focus {
                    background-color: rgba(255,255,255,0.08);
                    border-color: rgba(56, 189, 248, 0.6);
                    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
                }
                .hero-search-btn {
                    position: absolute;
                    top: 0.4rem;
                    right: 0.4rem;
                    bottom: 0.4rem;
                    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
                    color: white;
                    border: none;
                    border-radius: 0.75rem;
                    padding: 0 1.5rem;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                }
                .hero-search-btn:hover {
                    transform: scale(1.02);
                }

                .hero-tag {
                    color: #cbd5e1;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 0.3rem 0.8rem;
                    border-radius: 1rem;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .hero-tag:hover {
                    background: rgba(255,255,255,0.15);
                    color: white;
                    border-color: rgba(255,255,255,0.3);
                }

                .filter-pill {
                    padding: 0.625rem 1.25rem;
                    border-radius: 99px;
                    border: 1px solid var(--border-color);
                    background-color: var(--surface-color);
                    color: var(--text-primary);
                    font-weight: 600;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                .filter-pill:hover {
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                    transform: translateY(-1px);
                }
                .filter-pill.active {
                    background-color: var(--primary-color);
                    border-color: var(--primary-color);
                    color: white;
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
                }
                .market-search-input:focus {
                    transform: scale(1.02);
                    box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.15) !important;
                }
                .guest-cta-bar:hover {
                    transform: translateY(-2px);
                    background-color: #0f172a !important;
                }
                
                @media (max-width: 640px) {
                    .market-hero {
                        padding: 4rem 1rem 3rem 1rem;
                        border-radius: 1.5rem;
                        margin: 0.5rem;
                    }
                    .hero-title {
                        font-size: 2.5rem !important;
                    }
                    .hide-mobile {
                        display: none;
                    }
                    .hero-search-input {
                        padding: 1rem 5.5rem 1rem 2.5rem;
                        font-size: 1rem;
                    }
                    .hero-search-btn {
                        padding: 0 1rem;
                        font-size: 0.875rem;
                    }
                    .hero-search-icon {
                        left: 0.75rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Home;
