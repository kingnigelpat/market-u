import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import ReadOnlyRating from './ReadOnlyRating';
import { Heart, Eye } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';

const CATEGORY_COLORS = {
    Electronics: { bg: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED' },
    Fashion: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' },
    Services: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981' },
    'Food & Groceries': { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
};

const ProductCard = ({ product, index = 0 }) => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);
    const catStyle = CATEGORY_COLORS[product.category] || { bg: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED' };

    return (
        <div
            onClick={() => navigate(`/product/${product.id}`)}
            className="product-card animate-fade-in-up"
            style={{ animationDelay: `${index * 0.04}s` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="product-card-image-wrap">
                {!imgLoaded && <div className="product-card-skeleton" />}
                <img
                    src={product.images?.length > 0 ? optimizeImage(product.images[0], 300) : 'https://via.placeholder.com/300'}
                    alt={product.title}
                    loading={index > 5 ? 'lazy' : 'eager'}
                    fetchPriority={index <= 2 ? 'high' : 'auto'}
                    className={`product-card-image ${imgLoaded ? 'loaded' : ''}`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgLoaded(true)}
                />
                {product.category && (
                    <span className="product-card-category" style={{ background: catStyle.bg, color: catStyle.color }}>
                        {product.category}
                    </span>
                )}
                {product.views > 50 && (
                    <span className="product-card-popular">Popular</span>
                )}
                {index < 3 && (
                    <span className="product-card-new">NEW</span>
                )}
                {hovered && (
                    <div className="product-card-overlay">
                        <Eye size={18} />
                        <span>Quick view</span>
                    </div>
                )}
            </div>

            <div className="product-card-body">
                <h3 className="product-card-title">{product.title}</h3>

                <div className="product-card-seller">
                    <span className={product.sellerVerified ? 'seller-verified' : ''}>
                        {product.sellerName || 'Seller'}
                    </span>
                    {product.sellerVerified && <VerifiedBadge size={14} />}
                    <ReadOnlyRating sellerId={product.sellerId} />
                </div>

                <div className="product-card-price-row">
                    <div className="product-card-price">
                        ₦{parseFloat(product.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {product.views && (
                        <div className="product-card-views">
                            <Eye size={12} /> {product.views}
                        </div>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                    className="product-card-cta"
                >
                    <Heart size={15} fill={hovered ? 'white' : 'none'} />
                    I&apos;m Interested
                </button>
            </div>

            <style>{`
                .product-card {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    cursor: pointer;
                    background: var(--surface-elevated);
                    border-radius: var(--radius-xl);
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow-xs);
                    overflow: hidden;
                    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .product-card:hover {
                    transform: translateY(-6px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--primary-light);
                }

                .product-card-image-wrap {
                    position: relative;
                    padding-top: 100%;
                    background: var(--surface);
                    overflow: hidden;
                }

                .product-card-skeleton {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(90deg, var(--surface) 8%, var(--border) 18%, var(--surface) 33%);
                    background-size: 2000px 100%;
                    animation: shimmer 2s infinite linear;
                }

                .product-card-image {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
                    opacity: 0;
                }

                .product-card-image.loaded {
                    opacity: 1;
                }

                .product-card:hover .product-card-image.loaded {
                    transform: scale(1.08);
                }

                .product-card-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    color: white;
                    font-weight: 700;
                    font-size: 0.875rem;
                    animation: fadeIn 0.2s ease;
                    z-index: 10;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .product-card-category {
                    position: absolute;
                    top: 0.625rem;
                    left: 0.625rem;
                    font-size: 0.6875rem;
                    font-weight: 700;
                    padding: 0.25rem 0.625rem;
                    border-radius: var(--radius-full);
                    z-index: 5;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    backdrop-filter: blur(4px);
                }

                .product-card-new {
                    position: absolute;
                    bottom: 0.625rem;
                    right: 0.625rem;
                    background: var(--gradient-accent);
                    color: white;
                    font-size: 0.625rem;
                    font-weight: 800;
                    padding: 0.2rem 0.5rem;
                    border-radius: var(--radius-full);
                    z-index: 5;
                    letter-spacing: 0.05em;
                }

                .product-card-popular {
                    position: absolute;
                    bottom: 0.625rem;
                    left: 0.625rem;
                    background: var(--gradient-cool);
                    color: white;
                    font-size: 0.625rem;
                    font-weight: 800;
                    padding: 0.2rem 0.5rem;
                    border-radius: var(--radius-full);
                    z-index: 5;
                    letter-spacing: 0.05em;
                }

                .product-card-body {
                    padding: 1rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .product-card-title {
                    font-size: 0.9375rem;
                    font-weight: 700;
                    margin: 0 0 0.375rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 1.35;
                    letter-spacing: -0.01em;
                    color: var(--text);
                }

                .product-card-seller {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.8125rem;
                    color: var(--text-secondary);
                    margin-bottom: auto;
                    flex-wrap: wrap;
                }

                .seller-verified {
                    font-weight: 700;
                    color: var(--text);
                }

                .product-card-price-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin: 0.75rem 0;
                }

                .product-card-price {
                    font-family: var(--font-display);
                    font-weight: 800;
                    font-size: 1.125rem;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    letter-spacing: -0.02em;
                }

                .product-card-views {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.6875rem;
                    color: var(--text-tertiary);
                    font-weight: 600;
                }

                .product-card-cta {
                    width: 100%;
                    margin-top: auto;
                    padding: 0.675rem;
                    font-size: 0.8125rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.375rem;
                    background: ${hovered ? 'var(--gradient-primary)' : 'var(--primary-light)'};
                    color: ${hovered ? 'white' : 'var(--primary)'};
                    border: none;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all 0.25s ease;
                    font-family: inherit;
                }

                .product-card-cta:hover {
                    background: var(--gradient-primary);
                    color: white;
                    box-shadow: 0 4px 14px var(--primary-glow);
                    transform: translateY(-1px);
                }

                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
            `}</style>
        </div>
    );
};

export default ProductCard;
