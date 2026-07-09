import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '../components/ProductCard';
import { Search, PackagePlus, ArrowRight, Sparkles, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InstallGuideModal from '../components/InstallGuideModal';

const CATEGORIES = [
    { key: 'all', label: 'All', emoji: '🔥' },
    { key: 'verified', label: 'Verified', emoji: '⭐' },
    { key: 'Electronics', label: 'Tech', emoji: '💻' },
    { key: 'Fashion', label: 'Fashion', emoji: '👕' },
    { key: 'Services', label: 'Services', emoji: '🛠️' },
    { key: 'Food & Groceries', label: 'Food', emoji: '🍕' },
];

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

    const handleCategoryClick = (key) => {
        if (key === 'verified') {
            setCategoryFilter('all');
            setVerifiedOnly(true);
        } else {
            setCategoryFilter(key);
            setVerifiedOnly(false);
        }
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'products'),
                    orderBy('createdAt', 'desc'),
                    limit(2000)
                );
                const querySnapshot = await getDocs(q);
                setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
            return (b.views || 0) - (a.views || 0);
        }
        return a.sellerVerified ? -1 : 1;
    });

    const firstName = (currentUser?.displayName || userName)?.split(' ')[0] || 'there';

    return (
        <div className="market-page">
            <div className="market-hero">
                <div className="market-hero-inner container">
                    <div className="market-hero-top">
                        <div>
                            <h1 className="market-greeting">
                                {isAuthenticated ? `Hey, ${firstName}` : 'Campus Market'}
                                <span className="market-wave">{isAuthenticated ? ' 👋' : ' 🚀'}</span>
                            </h1>
                            <p className="market-subtitle">Find what you need, sell what you don&apos;t</p>
                        </div>
                        <div className="live-badge">
                            <span className="live-badge-dot" />
                            Live
                        </div>
                    </div>

                    <div className="market-search-wrap">
                        <Search size={20} className="market-search-icon" />
                        <input
                            type="text"
                            placeholder="Search laptops, books, fashion..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="market-search-input search-input-focus"
                        />
                        {searchTerm && (
                            <button className="market-search-clear" onClick={() => setSearchTerm('')}>
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="market-filters hide-scrollbar">
                        {CATEGORIES.map(({ key, label, emoji }) => {
                            const isActive = key === 'verified' ? verifiedOnly : categoryFilter === key && !verifiedOnly;
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleCategoryClick(key)}
                                    className={`filter-chip ${isActive ? 'filter-chip--active' : ''}`}
                                >
                                    <span>{emoji}</span> {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="container market-body" ref={productsRef}>
                {showDownloadPrompt && (
                    <div className="download-banner animate-fade-in-up">
                        <button onClick={dismissDownloadPrompt} className="download-banner-close" aria-label="Dismiss">
                            <X size={18} />
                        </button>
                        <div className="download-banner-icon">
                            <Sparkles size={22} />
                        </div>
                        <div className="download-banner-text">
                            <h3>{isSeller ? 'Manage your store on the go' : 'Get the MarketU app'}</h3>
                            <p>{isSeller ? 'Track views, reply faster, and never miss a buyer.' : 'Faster browsing and instant drop notifications.'}</p>
                        </div>
                        <button className="btn btn-primary download-banner-btn" onClick={() => setShowInstallGuide(true)}>
                            Install App
                        </button>
                    </div>
                )}

                <div className="market-section-header">
                    <h2 className="market-section-title">
                        {categoryFilter === 'all' && !searchTerm ? 'Trending now' : categoryFilter === 'all' ? 'Search results' : categoryFilter}
                    </h2>
                    <span className="market-count">{filteredProducts.length} items</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <div key={n} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="skeleton" style={{ paddingTop: '100%', width: '100%', borderRadius: 0 }}></div>
                                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div className="skeleton" style={{ height: '1.25rem', width: '80%' }}></div>
                                    <div className="skeleton" style={{ height: '1rem', width: '50%' }}></div>
                                    <div className="skeleton" style={{ height: '2.5rem', width: '100%', borderRadius: '99px', marginTop: '0.5rem' }}></div>
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
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <PackagePlus size={36} />
                        </div>
                        <h3>Nothing here yet</h3>
                        <p>Try different keywords or browse all categories to see what&apos;s available on campus.</p>
                        <button onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setVerifiedOnly(false); }} className="btn btn-primary">
                            Clear filters
                        </button>
                    </div>
                )}

                {!isAuthenticated && (
                    <div className="guest-cta">
                        <Link to="/register" className="guest-cta-inner">
                            <div className="guest-cta-content">
                                <p className="guest-cta-title">Join 500+ students on MarketU</p>
                                <p className="guest-cta-sub">Buy, sell, and connect on campus</p>
                            </div>
                            <div className="guest-cta-arrow">
                                <ArrowRight size={20} />
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

            <style>{`
                .market-page {
                    background: var(--bg);
                    min-height: 100vh;
                }

                .market-hero {
                    position: sticky;
                    top: 0;
                    z-index: 40;
                    background: var(--nav-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border);
                    padding: 1.5rem 0 1.25rem;
                }

                .market-hero-inner {
                    padding: 0 1.5rem;
                }

                .market-hero-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.25rem;
                }

                .market-greeting {
                    font-family: var(--font-display);
                    font-size: 1.5rem;
                    font-weight: 800;
                    letter-spacing: -0.03em;
                    margin: 0;
                    color: var(--text);
                }

                .market-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin: 0.25rem 0 0;
                    font-weight: 500;
                }

                .live-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 0.375rem 0.75rem;
                    border-radius: var(--radius-full);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--secondary);
                    flex-shrink: 0;
                }

                .live-badge-dot {
                    width: 6px; height: 6px;
                    background: var(--secondary);
                    border-radius: 50%;
                    animation: pulse-live 2s ease-in-out infinite;
                }

                @keyframes pulse-live {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
                    50% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
                }

                .market-search-wrap {
                    position: relative;
                    margin-bottom: 1rem;
                }

                .market-search-icon {
                    position: absolute;
                    top: 50%;
                    left: 1.125rem;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .market-search-input {
                    width: 100%;
                    padding: 0.9375rem 1rem 0.9375rem 3.25rem;
                    font-size: 0.9375rem;
                    font-weight: 500;
                    background: var(--surface-elevated);
                    border: 1.5px solid var(--border);
                    border-radius: var(--radius-full);
                    color: var(--text);
                    outline: none;
                    transition: all 0.2s ease;
                }

                .market-search-clear {
                    position: absolute;
                    top: 50%;
                    right: 1.125rem;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    padding: 0.25rem;
                    border-radius: 50%;
                    transition: all 0.2s;
                }

                .market-search-clear:hover {
                    color: var(--text);
                    background: var(--surface);
                }

                .market-filters {
                    display: flex;
                    gap: 0.5rem;
                    overflow-x: auto;
                    padding-bottom: 0.25rem;
                }

                .filter-chip {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-full);
                    border: 1.5px solid var(--border);
                    background: var(--surface-elevated);
                    color: var(--text);
                    font-weight: 600;
                    font-size: 0.8125rem;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }

                .filter-chip:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                }

                .filter-chip--active {
                    background: var(--gradient-primary);
                    border-color: transparent;
                    color: white;
                    box-shadow: 0 4px 12px var(--primary-glow);
                }

                .market-body {
                    padding: 1.5rem 1.5rem 6rem;
                }

                .download-banner {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.25rem 1.5rem;
                    background: var(--surface-elevated);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-xl);
                    margin-bottom: 2rem;
                    position: relative;
                    flex-wrap: wrap;
                }

                .download-banner-close {
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                    color: var(--text-tertiary);
                    padding: 0.25rem;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                .download-banner-close:hover { opacity: 1; }

                .download-banner-icon {
                    width: 44px; height: 44px;
                    border-radius: 12px;
                    background: var(--primary-light);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .download-banner-text h3 {
                    font-weight: 700;
                    font-size: 0.9375rem;
                    margin: 0 0 0.125rem;
                }

                .download-banner-text p {
                    color: var(--text-secondary);
                    font-size: 0.8125rem;
                    margin: 0;
                }

                .download-banner-btn {
                    margin-left: auto;
                    font-size: 0.8125rem;
                    padding: 0.5rem 1.25rem;
                }

                .market-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.25rem;
                }

                .market-section-title {
                    font-family: var(--font-display);
                    font-size: 1.25rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    margin: 0;
                }

                .market-count {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    background: var(--surface);
                    padding: 0.3rem 0.75rem;
                    border-radius: var(--radius-full);
                }

                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    border: 2px dashed var(--border);
                    border-radius: var(--radius-2xl);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .empty-state-icon {
                    width: 72px; height: 72px;
                    border-radius: 50%;
                    background: var(--surface);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                    margin-bottom: 1.25rem;
                }

                .empty-state h3 {
                    font-family: var(--font-display);
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                }

                .empty-state p {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                    max-width: 360px;
                    font-size: 0.9375rem;
                }

                .guest-cta {
                    position: fixed;
                    bottom: 1.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 100;
                    width: calc(100% - 2rem);
                    max-width: 480px;
                }

                .guest-cta-inner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--text);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: var(--radius-full);
                    text-decoration: none;
                    box-shadow: var(--shadow-xl);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }

                [data-theme="dark"] .guest-cta-inner {
                    background: var(--surface-elevated);
                    border: 1px solid var(--border);
                }

                .guest-cta-inner:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25);
                }

                .guest-cta-title {
                    margin: 0;
                    font-weight: 700;
                    font-size: 0.9375rem;
                }

                .guest-cta-sub {
                    margin: 0;
                    font-size: 0.8125rem;
                    opacity: 0.65;
                }

                .guest-cta-arrow {
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    background: var(--gradient-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                @media (max-width: 640px) {
                    .download-banner {
                        flex-direction: column;
                        text-align: center;
                        padding-top: 2rem;
                    }
                    .download-banner-btn { margin-left: 0; }
                    .download-banner-text { text-align: center; }
                }
            `}</style>
        </div>
    );
};

export default Home;
