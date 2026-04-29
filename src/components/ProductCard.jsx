import { useState } from 'react';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from './AuthPromptModal';
import { optimizeImage } from '../utils/cloudinary';

const ProductCard = ({ product }) => {
    const { isAuthenticated } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);

    const handleWhatsApp = (e) => {
        e.preventDefault(); // Prevent navigating to product detail
        
        if (!isAuthenticated) {
            setShowPrompt(true);
            return;
        }

        let phone = product.sellerPhone ? product.sellerPhone.replace(/\D/g, '') : '';
        // Standardize to Nigeria (+234)
        if (phone.startsWith('0')) {
            phone = '234' + phone.substring(1);
        } else if (phone && !phone.startsWith('234')) {
            phone = '234' + phone;
        }

        const message = encodeURIComponent(`Hi ${product.sellerName}, I'm interested in your product: ${product.title} on Market U!`);
        const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
        window.location.href = whatsappUrl;
    };

    return (
        <>
            <Link to={`/product/${product.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: 'var(--bg-color)' }}>
                    <img
                        src={product.images && product.images.length > 0 ? optimizeImage(product.images[0], 400) : 'https://via.placeholder.com/400'}
                        alt={product.title}
                        loading="lazy"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                        className="product-card-image"
                    />
                    {product.category && (
                        <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: '500' }}>
                            {product.category}
                        </span>
                    )}
                </div>
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
                            {product.title}
                        </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'auto' }}>
                        <span style={{ fontWeight: product.sellerVerified ? '700' : '500', color: product.sellerVerified ? 'var(--text-primary)' : 'inherit' }}>{product.sellerName || 'Seller'}</span>
                        {product.sellerVerified && <VerifiedBadge size={14} />}
                    </div>

                    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: '800', color: 'var(--primary-color)', fontSize: '1.125rem' }}>
                            ₦{parseFloat(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <button onClick={handleWhatsApp} className="btn btn-whatsapp" style={{ width: '100%', marginTop: 'auto', padding: '0.625rem', fontSize: '0.875rem', justifyContent: 'center', zIndex: 10 }}>
                        <MessageCircle size={16} /> Chat on WhatsApp
                    </button>
                </div>
            </Link>

            <AuthPromptModal 
                isOpen={showPrompt} 
                onClose={() => setShowPrompt(false)} 
                message="Sign up to contact sellers and start using Market U"
            />
        </>
    );
};

export default ProductCard;
