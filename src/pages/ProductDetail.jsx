import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageCircle, ArrowLeft, Trash2, Edit } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const docRef = doc(db, 'products', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const productData = { id: docSnap.id, ...docSnap.data() };

                    try {
                        const sellerRef = doc(db, 'users', productData.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            productData.sellerVerified = Boolean(sellerSnap.data().verified) || Boolean(productData.sellerVerified);
                        }
                    } catch (e) {
                        console.error("Could not fetch seller dynamically", e);
                    }

                    setProduct(productData);
                } else {
                    console.error("No such product!");
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    if (loading) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading product details...</div>;
    }

    if (!product) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Product not found.</div>;
    }

    const handleWhatsApp = () => {
        // Format phone number (remove non-digits, ensure standard format)
        const phone = product.sellerPhone ? product.sellerPhone.replace(/\D/g, '') : '';
        const message = encodeURIComponent(`Hi ${product.sellerName}, I'm interested in your product: ${product.title} on Market-U!`);
        const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const isOwner = currentUser && product && currentUser.uid === product.sellerId;

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            setDeleting(true);
            try {
                await deleteDoc(doc(db, 'products', id));
                navigate('/dashboard');
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Failed to delete product.");
                setDeleting(false);
            }
        }
    };

    return (
        <div className="container">
            <button
                onClick={() => navigate(-1)}
                className="btn"
                style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}
            >
                <ArrowLeft size={20} /> Back
            </button>

            <div className="card" style={{ padding: '1.5rem' }}>
                <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                    {/* Images Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {product.images && product.images.length > 0 ? (
                            <>
                                <div style={{ position: 'relative', width: '100%', paddingTop: '75%', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-color)' }}>
                                    <img
                                        src={product.images[0]}
                                        alt={product.title}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                                {product.images.length > 1 && (
                                    <div style={{ position: 'relative', width: '100%', paddingTop: '75%', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-color)' }}>
                                        <img
                                            src={product.images[1]}
                                            alt={`${product.title} - view 2`}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                                No images available
                            </div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>{product.title}</h1>
                            <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                                ₦{parseFloat(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontWeight: '500' }}>Seller: {product.sellerName}</span>
                            {product.sellerVerified && <VerifiedBadge />}
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Description</h3>
                            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{product.description}</p>
                        </div>

                        <button
                            onClick={handleWhatsApp}
                            className="btn btn-whatsapp"
                            style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', justifyContent: 'center' }}
                        >
                            <MessageCircle />
                            Contact on WhatsApp
                        </button>

                        {isOwner && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                                <Link
                                    to={`/edit-product/${id}`}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.875rem', fontSize: '1rem', justifyContent: 'center', borderColor: '#E5E7EB' }}
                                >
                                    <Edit size={18} />
                                    Edit Post
                                </Link>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="btn"
                                    style={{ padding: '0.875rem', fontSize: '1rem', justifyContent: 'center', backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }}
                                >
                                    <Trash2 size={18} />
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
