import { useState, useEffect } from 'react';
import { collection, query, documentId, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { Heart, PackageSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

const SavedItems = () => {
    const { savedItems } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSavedProducts = async () => {
            if (!savedItems || savedItems.length === 0) {
                setProducts([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Firestore 'in' query has a limit of 10 items.
                // If a user has more than 10 saved items, we need to chunk the array.
                const chunks = [];
                for (let i = 0; i < savedItems.length; i += 10) {
                    chunks.push(savedItems.slice(i, i + 10));
                }

                let allProducts = [];
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'products'),
                        where(documentId(), 'in', chunk)
                    );
                    const querySnapshot = await getDocs(q);
                    const chunkProducts = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    allProducts = [...allProducts, ...chunkProducts];
                }

                setProducts(allProducts);
            } catch (error) {
                console.error("Error fetching saved products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSavedProducts();
    }, [savedItems]);

    return (
        <div className="container" style={{ padding: '2rem 1rem', minHeight: '80vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <Heart size={28} color="#ef4444" fill="#ef4444" />
                <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
                    Saved Items
                </h1>
            </div>

            {loading ? (
                <div className="grid grid-cols-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>
                            <div className="skeleton" style={{ paddingTop: '100%', width: '100%', borderRadius: '0' }}></div>
                            <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="skeleton" style={{ height: '1.25rem', width: '80%' }}></div>
                                <div className="skeleton" style={{ height: '1rem', width: '50%' }}></div>
                                <div className="skeleton" style={{ height: '1.5rem', width: '40%', marginTop: 'auto' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-4">
                    {products.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', borderStyle: 'dashed', backgroundColor: 'transparent' }}>
                    <div style={{ backgroundColor: 'var(--surface-color)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <PackageSearch size={40} color="var(--text-secondary)" />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem' }}>Your wishlist is empty</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
                        Browse the market and tap the heart icon on any product to save it for later.
                    </p>
                    <Link to="/market" className="btn btn-primary" style={{ padding: '0.875rem 2.5rem', borderRadius: '1rem' }}>
                        Start Browsing
                    </Link>
                </div>
            )}
        </div>
    );
};

export default SavedItems;
