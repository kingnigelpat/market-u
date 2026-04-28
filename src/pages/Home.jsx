import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, PackagePlus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { isAuthenticated } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [verifiedOnly, setVerifiedOnly] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Fetch dynamically verified sellers directly from User database
                const usersQuery = query(collection(db, 'users'), where('verified', '==', true));
                const verifiedUsersSnap = await getDocs(usersQuery);
                const verifiedSellerIds = new Set(verifiedUsersSnap.docs.map(doc => doc.id));

                // Fetch Products - Limit to top 50 for speed
                const q = query(
                    collection(db, 'products'), 
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
                const querySnapshot = await getDocs(q);

                let productsData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Override local product verified state if the seller's root account is verified
                    const isActuallyVerified = verifiedSellerIds.has(data.sellerId) || data.sellerVerified;

                    return {
                        id: doc.id,
                        ...data,
                        sellerVerified: isActuallyVerified
                    };
                });

                setProducts(productsData);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Filter AND SORT (Verified first)
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        const matchesVerified = !verifiedOnly || Boolean(product.sellerVerified) === true;
        return matchesSearch && matchesCategory && matchesVerified;
    }).sort((a, b) => {
        if (a.sellerVerified === b.sellerVerified) return 0;
        return a.sellerVerified ? -1 : 1;
    });

    return (
        <div className="container" style={{ paddingBottom: '8rem', paddingTop: '1.5rem' }}>
            {/* Search Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '1.25rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                        <Search size={22} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search sneakers, electronics, services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input-focus"
                        style={{ 
                            width: '100%', 
                            padding: '1.125rem 1.25rem 1.125rem 3.5rem', 
                            fontSize: '1.125rem', 
                            borderRadius: '1.25rem', 
                            border: '1px solid var(--border-color)', 
                            backgroundColor: 'var(--surface-color)', 
                            outline: 'none',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.2s'
                        }}
                    />
                </div>
            </div>

            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem', msOverflowStyle: 'none', scrollbarWidth: 'none', justifyContent: 'center', WebkitOverflowScrolling: 'touch' }}>
                <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(false) }} className={`btn ${categoryFilter === 'all' && !verifiedOnly ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', padding: '0.625rem 1.25rem' }}>All Items</button>
                <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(true) }} className={`btn ${verifiedOnly ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', padding: '0.625rem 1.25rem' }}>⭐ Verified Only</button>
                <button onClick={() => setCategoryFilter('Services')} className={`btn ${categoryFilter === 'Services' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', padding: '0.625rem 1.25rem' }}>🛠️ Services</button>
                <button onClick={() => setCategoryFilter('Electronics')} className={`btn ${categoryFilter === 'Electronics' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', padding: '0.625rem 1.25rem' }}>Electronics</button>
                <button onClick={() => setCategoryFilter('Fashion')} className={`btn ${categoryFilter === 'Fashion' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', padding: '0.625rem 1.25rem' }}>Fashion</button>
                <button onClick={() => setCategoryFilter('Food & Groceries')} className={`btn ${categoryFilter === 'Food & Groceries' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', padding: '0.625rem 1.25rem' }}>Food</button>
            </div>

            {/* Product Feed */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Loading items...</p>
                </div>
            ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-4">
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', borderStyle: 'dashed' }}>
                    <PackagePlus size={64} color="var(--border-color)" style={{ marginBottom: '1.5rem' }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem' }}>No items found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>Try different keywords or check all categories.</p>
                    <button onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setVerifiedOnly(false) }} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                        Clear filters
                    </button>
                </div>
            )}

            {/* Guest CTA Sticky Bar */}
            {!isAuthenticated && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    width: 'calc(100% - 2rem)',
                    maxWidth: '500px'
                }}>
                    <Link to="/register" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--text-primary)',
                        color: 'white',
                        padding: '1.25rem 1.75rem',
                        borderRadius: '1.5rem',
                        textDecoration: 'none',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: '800', fontSize: '1rem' }}>Ready to buy or sell?</p>
                            <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.8 }}>Sign up to contact sellers and post items</p>
                        </div>
                        <div style={{ backgroundColor: 'var(--primary-color)', padding: '0.5rem', borderRadius: '50%' }}>
                            <ArrowRight size={20} />
                        </div>
                    </Link>
                </div>
            )}

            {/* Footer */}
            <footer style={{ marginTop: '6rem', textAlign: 'center', paddingBottom: '2rem' }}>
                <a href="https://www.raehub.live" target="_blank" rel="noopener noreferrer" className="rae-link">
                    Created by <span>Rae Company</span>
                </a>
            </footer>
        </div>
    );
};

export default Home;
