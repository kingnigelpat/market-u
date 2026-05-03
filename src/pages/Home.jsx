import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, PackagePlus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { isAuthenticated, isSeller, userRole } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [verifiedOnly, setVerifiedOnly] = useState(false);

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

    // Filter AND SORT (Verified first, then by views/demand)
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
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
        <div className="market-container" style={{ paddingBottom: '8rem' }}>
            {/* Market Hero Section */}
            <div className="market-hero" style={{ 
                backgroundColor: '#1e40af',
                padding: '4rem 1.5rem',
                borderRadius: '0 0 3rem 3rem',
                marginBottom: '3rem',
                color: 'white',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Slideshow Background */}
                <div className="hero-slideshow">
                    <div className="hero-slide" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80)' }}></div>
                    <div className="hero-slide" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80)' }}></div>
                    <div className="hero-slide" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80)' }}></div>
                </div>

                {/* Gradient Overlay for Readability */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.85) 0%, rgba(30, 64, 175, 0.95) 100%)', zIndex: 1 }}></div>

                {/* Animated Decorative circles */}
                <div className="floating-circle-1" style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', zIndex: 2 }}></div>
                <div className="floating-circle-2" style={{ position: 'absolute', bottom: '-20%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', zIndex: 2 }}></div>

                <div className="container" style={{ position: 'relative', zIndex: 3 }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
                        Explore the Campus Marketplace
                    </h1>
                    <p style={{ fontSize: '1.125rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
                        Find the best deals on electronics, services, fashion, and more from verified student sellers.
                    </p>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '1.5rem', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                            <Search size={22} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for items, brands, or services..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="market-search-input"
                            style={{ 
                                width: '100%', 
                                padding: '1.25rem 1.5rem 1.25rem 4rem', 
                                fontSize: '1.125rem', 
                                borderRadius: '1.5rem', 
                                border: 'none', 
                                backgroundColor: 'var(--surface-color)', 
                                color: 'var(--text-primary)',
                                outline: 'none',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="container">
                {/* Buyer to Seller Prompt Banner */}
                {isAuthenticated && !isSeller && (
                    <div className="animate-fade-in-up" style={{ 
                        marginBottom: '2.5rem', 
                        padding: '1.5rem', 
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid rgba(37, 99, 235, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '1rem'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '800', marginBottom: '0.25rem' }}>Want to earn extra money?</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>List your products or services on Market-U and reach hundreds of students.</p>
                        </div>
                        <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem' }}>
                            Start Selling Today
                        </Link>
                    </div>
                )}

                {/* Filters Section */}
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                            <SlidersHorizontal size={18} /> Filters:
                        </div>
                        <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(false) }} className={`filter-pill ${categoryFilter === 'all' && !verifiedOnly ? 'active' : ''}`}>All Items</button>
                        <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(true) }} className={`filter-pill ${verifiedOnly ? 'active' : ''}`}>⭐ Verified Only</button>
                        <button onClick={() => setCategoryFilter('Services')} className={`filter-pill ${categoryFilter === 'Services' ? 'active' : ''}`}>🛠️ Services</button>
                        <button onClick={() => setCategoryFilter('Electronics')} className={`filter-pill ${categoryFilter === 'Electronics' ? 'active' : ''}`}>💻 Electronics</button>
                        <button onClick={() => setCategoryFilter('Fashion')} className={`filter-pill ${categoryFilter === 'Fashion' ? 'active' : ''}`}>👕 Fashion</button>
                        <button onClick={() => setCategoryFilter('Food & Groceries')} className={`filter-pill ${categoryFilter === 'Food & Groceries' ? 'active' : ''}`}>🍕 Food</button>
                    </div>

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

            <style>{`
                .hero-slideshow {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 0;
                }
                .hero-slide {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-size: cover;
                    background-position: center;
                    opacity: 0;
                    animation: slideFade 18s infinite;
                }
                .hero-slide:nth-child(1) { animation-delay: 0s; }
                .hero-slide:nth-child(2) { animation-delay: 6s; }
                .hero-slide:nth-child(3) { animation-delay: 12s; }
                
                @keyframes slideFade {
                    0% { opacity: 0; transform: scale(1.05); }
                    10% { opacity: 1; transform: scale(1); }
                    33% { opacity: 1; transform: scale(1); }
                    43% { opacity: 0; transform: scale(1.05); }
                    100% { opacity: 0; transform: scale(1.05); }
                }

                .floating-circle-1 {
                    animation: float1 10s ease-in-out infinite;
                }
                .floating-circle-2 {
                    animation: float2 12s ease-in-out infinite reverse;
                }
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-30px, 20px) scale(1.1); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(30px, -20px) scale(1.1); }
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
                        padding: 3rem 1rem;
                        border-radius: 0 0 2rem 2rem;
                    }
                    .market-hero h1 {
                        font-size: 1.75rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Home;
