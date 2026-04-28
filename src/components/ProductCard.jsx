import { useState } from 'react';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from './AuthPromptModal';

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

        const message = encodeURIComponent(`Hi ${product.sellerName}, I'm interested in your product: ${product.title} on Market-U!`);
        const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <>
            <Link to={`/product/${product.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: 'var(--bg-color)' }}>
                    <img
                        src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400'}
                        alt={product.title}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {product.category && (
                        <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: '500' }}>
                            {product.category}
                        </span>
                    )}
                </div>
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {product.title}
                        </h3>
                        <span style={{ fontWeight: '700', color: 'var(--primary-color)', marginLeft: '0.5rem' }}>
                            ₦{parseFloat(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        <span>{product.sellerName || 'Seller'}</span>
                        {product.sellerVerified && <VerifiedBadge size={14} />}
                    </div>

                    <button onClick={handleWhatsApp} className="btn btn-whatsapp" style={{ width: '100%', marginTop: 'auto', padding: '0.625rem', fontSize: '0.875rem', justifyContent: 'center', zIndex: 10 }}>
                        <MessageCircle size={16} /> Chat on WhatsApp
                    </button>
                </div>
            </Link>

            <AuthPromptModal 
                isOpen={showPrompt} 
                onClose={() => setShowPrompt(false)} 
                message="Sign up to contact sellers and start using Market-U"
            />
        </>
    );
};

export default ProductCard;
