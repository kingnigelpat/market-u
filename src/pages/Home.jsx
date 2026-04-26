import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, PackagePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
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

                // Fetch Products
                const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
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
        <div className="container" style={{ paddingBottom: '4rem', paddingTop: '0.75rem' }}>
            {/* Top Navigation Search */}
            <div className="mobile-card-padding" style={{ backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="What are you looking for?"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', fontSize: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', outline: 'none' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                        <SlidersHorizontal size={18} color="var(--text-secondary)" />
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', flex: 1 }}>
                            <option value="all">All Categories</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Clothing">Clothing</option>
                            <option value="Services">Services</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>
                        <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }} />
                        Verified Sellers Only
                    </label>
                </div>
            </div>

            {/* Quick Action Row */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(false) }} className={`btn ${categoryFilter === 'all' && !verifiedOnly ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>Browse All</button>
                <button onClick={() => { setCategoryFilter('all'); setVerifiedOnly(true) }} className={`btn ${verifiedOnly ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>⭐ Verified Only</button>
                <button onClick={() => setCategoryFilter('Electronics')} className={`btn ${categoryFilter === 'Electronics' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>💻 Electronics</button>
                <button onClick={() => setCategoryFilter('Clothing')} className={`btn ${categoryFilter === 'Clothing' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '99px', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>👕 Clothing</button>
            </div>

            {/* Product Feed */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>Loading feed...</div>
            ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-4">
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <PackagePlus size={48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />

                    {verifiedOnly ? (
                        <>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No verified products match</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>There are currently no products available from verified sellers matching your search.</p>
                            <button onClick={() => setVerifiedOnly(false)} className="btn btn-secondary">
                                View all sellers instead
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No products found</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>We couldn't find any listings matching your specific search criteria.</p>
                            <Link to="/add-product" className="btn btn-primary">
                                Be the first to list a product
                            </Link>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Home;
