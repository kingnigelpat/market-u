import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ImageUploader from '../components/ImageUploader';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { Save } from 'lucide-react';
import { INSTITUTIONS, SUPPORTED_SCHOOL } from '../data/institutions';

const AddProduct = () => {
    const { currentUser, userSchoolName } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [sellerData, setSellerData] = useState(null);
    const [formData, setFormData] = useState(() => {
        const querySchool = new URLSearchParams(location.search).get('school');
        return {
            title: '',
            price: '',
            stock: '1',
            description: '',
            category: 'Electronics',
            schoolName: querySchool || ''
        };
    });
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch full seller data to get phone number, school, and verified status
    useEffect(() => {
        const fetchSellerData = async () => {
            if (currentUser) {
                const sellerRef = doc(db, 'users', currentUser.uid);
                const sellerSnap = await getDoc(sellerRef);
                if (sellerSnap.exists()) {
                    const data = sellerSnap.data();
                    setSellerData(data);
                    setFormData(prev => ({
                        ...prev,
                        schoolName: prev.schoolName || data.schoolName || userSchoolName || SUPPORTED_SCHOOL
                    }));
                }
            }
        };
        fetchSellerData();
    }, [currentUser, userSchoolName]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (newImages) => {
        setImages(newImages);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.price || !formData.description) {
            setError("Please fill in all text fields.");
            return;
        }

        // Handle commas in price
        const numericPrice = parseFloat(formData.price.toString().replace(/,/g, ''));
        if (isNaN(numericPrice) || numericPrice < 0) {
            setError("Please enter a valid price.");
            return;
        }

        if (!sellerData) {
            setError("Unable to load seller data. Please try again.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Upload images in parallel for speed
            const uploadPromises = images.map(img => uploadImageToCloudinary(img));
            const uploadedUrls = await Promise.all(uploadPromises);
            const imageUrls = uploadedUrls.filter(url => url !== null);

            const parsedStock = parseInt(formData.stock, 10);
            const stockQuantity = isNaN(parsedStock) || parsedStock < 0 ? 1 : parsedStock;

            // 2. Save product to Firestore
            const productData = {
                sellerId: currentUser.uid,
                sellerName: sellerData.name || 'Anonymous Seller',
                sellerPhone: sellerData.phone || '',
                sellerVerified: !!sellerData.verified,
                title: formData.title,
                description: formData.description,
                price: numericPrice,
                stock: stockQuantity,
                category: formData.category || 'Electronics',
                schoolName: formData.schoolName || sellerData?.schoolName || userSchoolName || SUPPORTED_SCHOOL,
                images: imageUrls,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'products'), productData);

            // 🔔 Broadcast to all buyers — fire and forget (don't block the redirect)
            fetch('/api/notify-new-listing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productTitle: formData.title,
                    sellerName: sellerData.name || 'A seller',
                    category: formData.category || 'Other',
                    // productId is set after redirect — we pass it on the next line
                }),
            }).then(r => r.json()).then(d => {
                console.log('[Notify] Broadcast result:', d);
            }).catch(e => {
                console.warn('[Notify] Broadcast failed (non-critical):', e);
            });

            // Redirect back to dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError("Error adding product. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '0 0 2rem 0' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add New Product</h1>

                <div className="card mobile-card-padding">
                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
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
                                placeholder="e.g., iPhone 13 Pro Max"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="price">Price (₦)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.,]/g, '');
                                    setFormData({ ...formData, price: val });
                                }}
                                required
                                placeholder="e.g., 10000 or 10,000"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="stock">Stock Quantity (Units Available)</label>
                            <input
                                type="number"
                                id="stock"
                                name="stock"
                                min="0"
                                value={formData.stock}
                                onChange={handleChange}
                                required
                                placeholder="e.g. 1, 5, 10"
                            />
                            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.35rem', display: 'block' }}>
                                How many units of this product do you have left in stock?
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select id="category" name="category" value={formData.category || 'Electronics'} onChange={handleChange}>
                                <option value="Electronics">Electronics</option>
                                <option value="Phones & Tablets">Phones & Tablets</option>
                                <option value="Computing">Computing (Laptops)</option>
                                <option value="Fashion">Fashion (Clothing, Shoes)</option>
                                <option value="Health & Beauty">Health & Beauty</option>
                                <option value="Home & Kitchen">Home & Kitchen</option>
                                <option value="Books & Stationery">Books & Stationery</option>
                                <option value="Food & Groceries">Food & Groceries</option>
                                <option value="Services">Services (Tutoring, Haircuts)</option>
                                <option value="Hostels & Rooms">Hostels & Rooms</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="schoolName">Campus / Institution</label>
                            <select
                                id="schoolName"
                                name="schoolName"
                                value={formData.schoolName || ''}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                            >
                                {INSTITUTIONS.map(inst => (
                                    <option key={inst.name} value={inst.name}>
                                        {inst.name} {inst.short ? `(${inst.short})` : ''}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.35rem', display: 'block' }}>
                                This listing will be published in this campus marketplace for student pickup.
                            </small>
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
                                placeholder="Describe your product details here..."
                            />
                        </div>

                        {/* 2-image upload form */}
                        <ImageUploader onChange={handleImageChange} maxImages={2} />

                        <div style={{ marginTop: '2rem' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
                            >
                                {loading ? 'Uploading...' : (
                                    <>
                                        <Save size={20} /> Upload or Post
                                    </>
                                )}
                            </button>
                            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Click to post when you are done filling out the details.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddProduct;
