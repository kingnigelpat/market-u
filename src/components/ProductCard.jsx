import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import ReadOnlyRating from './ReadOnlyRating';
import { Heart } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';

const ProductCard = ({ product, index = 0 }) => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);

    return (
        <>
            <div
                onClick={() => navigate(`/product/${product.id}`)}
                className="card animate-fade-in-up"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    position: 'relative',
                    animationDelay: `${index * 0.05}s`,
                    cursor: 'pointer'
                }}
            >
                <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: 'var(--bg-color)', overflow: 'hidden' }}>
                    <img
                        src={product.images && product.images.length > 0 ? optimizeImage(product.images[0], 300) : 'https://via.placeholder.com/300'}
                        alt={product.title}
                        loading={index > 5 ? "lazy" : "eager"}
                        fetchPriority={index <= 2 ? "high" : "auto"}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                        className="product-card-image"
                    />
                    {product.category && (
                        <span style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: '500', zIndex: 5 }}>
                            {product.category}
                        </span>
                    )}
                    {index < 3 && (
                        <span style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', background: 'var(--danger-color)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: '800', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', letterSpacing: '0.05em' }}>
                            NEW
                        </span>
                    )}
                </div>

                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
                            {product.title}
                        </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'auto', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: product.sellerVerified ? '700' : '500', color: product.sellerVerified ? 'var(--text-primary)' : 'inherit' }}>{product.sellerName || 'Seller'}</span>
                        {product.sellerVerified && <VerifiedBadge size={14} />}
                        <ReadOnlyRating sellerId={product.sellerId} />
                    </div>

                    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: '800', color: 'var(--primary-color)', fontSize: '1.125rem' }}>
                            ₦{parseFloat(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* "I'm Interested" card button — navigates to product detail to complete the action */}
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                        className="btn"
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        style={{
                            width: '100%',
                            marginTop: 'auto',
                            padding: '0.625rem',
                            fontSize: '0.875rem',
                            justifyContent: 'center',
                            zIndex: 10,
                            backgroundColor: hovered ? 'var(--primary-hover)' : 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-lg)',
                            transition: 'all 0.2s ease',
                            boxShadow: hovered ? '0 6px 16px -4px rgba(37,99,235,0.4)' : '0 2px 8px -2px rgba(37,99,235,0.25)',
                        }}
                    >
                        <Heart size={16} /> I&apos;m Interested
                    </button>
                </div>
            </div>
        </>
    );
};

export default ProductCard;
