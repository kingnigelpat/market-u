import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ImageUploader from '../components/ImageUploader';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { Save } from 'lucide-react';

const AddProduct = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [sellerData, setSellerData] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        category: 'Electronics'
    });
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch full seller data to get phone number and verified status
    useEffect(() => {
        const fetchSellerData = async () => {
            if (currentUser) {
                const sellerRef = doc(db, 'users', currentUser.uid);
                const sellerSnap = await getDoc(sellerRef);
                if (sellerSnap.exists()) {
                    setSellerData(sellerSnap.data());
                }
            }
        };
        fetchSellerData();
    }, [currentUser]);

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

            // 2. Save product to Firestore
            const productData = {
                sellerId: currentUser.uid,
                sellerName: sellerData.name || 'Anonymous Seller',
                sellerPhone: sellerData.phone || '',
                sellerVerified: !!sellerData.verified,
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                category: formData.category || 'Electronics',
                images: imageUrls,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'products'), productData);

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
                                placeholder="e.g., iPhone 13 Pro Max"
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
                                placeholder="0.00"
                            />
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
                                {loading ? 'Adding Product...' : (
                                    <>
                                        <Save size={20} /> List Product
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

export default AddProduct;
