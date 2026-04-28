import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Save, ArrowLeft } from 'lucide-react';

const EditProduct = () => {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        category: 'Electronics'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const docRef = doc(db, 'products', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.sellerId !== currentUser.uid) {
                        setError("You don't have permission to edit this product.");
                    } else {
                        setFormData({
                            title: data.title || '',
                            price: data.price || '',
                            description: data.description || '',
                            category: data.category || 'Electronics'
                        });
                    }
                } else {
                    setError("Product not found.");
                }
            } catch (err) {
                console.error("Error fetching product:", err);
                setError("Failed to load product details.");
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchProduct();
        }
    }, [id, currentUser]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.price || !formData.description) {
            setError("Please fill in all text fields.");
            return;
        }

        setSaving(true);
        setError('');

        try {
            const docRef = doc(db, 'products', id);
            await updateDoc(docRef, {
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                category: formData.category
            });

            // Redirect back to product detail
            navigate(`/product/${id}`);
        } catch (err) {
            console.error(err);
            setError("Error updating product. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading product details...</div>;
    }

    if (error && !formData.title) {
        return <div className="container" style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--danger-color)' }}>{error}</div>;
    }

    return (
        <div className="container" style={{ padding: '0 0 2rem 0' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="btn"
                    style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}
                >
                    <ArrowLeft size={20} /> Back
                </button>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>Edit Product</h1>

                <div className="card mobile-card-padding">
                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="title">Product Title</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="price">Price (₦)</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select id="category" name="category" value={formData.category} onChange={handleChange}>
                                <option value="Electronics">Electronics</option>
                                <option value="Clothing">Clothing</option>
                                <option value="Services">Services</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description (Condition, Features, etc.)</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows="5"
                            />
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
                            >
                                {saving ? 'Saving...' : (
                                    <>
                                        <Save size={20} /> Update Product
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProduct;
