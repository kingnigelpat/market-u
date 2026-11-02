import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import ReadOnlyRating from './ReadOnlyRating';
import { Eye, GraduationCap, Zap, Flame, Sparkles, Camera } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';

const CATEGORY_COLORS = {
    Electronics: { bg: 'rgba(37, 99, 235, 0.88)', color: '#ffffff' },
    'Phones & Tablets': { bg: 'rgba(2, 132, 199, 0.88)', color: '#ffffff' },
    Computing: { bg: 'rgba(79, 70, 229, 0.88)', color: '#ffffff' },
    Fashion: { bg: 'rgba(217, 119, 6, 0.9)', color: '#ffffff' },
    'Health & Beauty': { bg: 'rgba(219, 39, 119, 0.88)', color: '#ffffff' },
    'Home & Kitchen': { bg: 'rgba(13, 148, 136, 0.88)', color: '#ffffff' },
    'Books & Stationery': { bg: 'rgba(101, 163, 13, 0.88)', color: '#ffffff' },
    Services: { bg: 'rgba(5, 150, 105, 0.9)', color: '#ffffff' },
    'Food & Groceries': { bg: 'rgba(220, 38, 38, 0.9)', color: '#ffffff' },
    'Hostels & Rooms': { bg: 'rgba(124, 58, 237, 0.88)', color: '#ffffff' },
};

const ProductCard = ({ product, index = 0 }) => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const catStyle = CATEGORY_COLORS[product.category] || { bg: 'rgba(15, 23, 42, 0.78)', color: '#ffffff' };

    const images = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.imageUrl
        ? [product.imageUrl]
        : ['https://via.placeholder.com/400'];

    // Show second image on hover if product has multiple photos
    const activeImage = hovered && images.length > 1 ? images[1] : images[0];

    const stockNum = (product.stock !== undefined && product.stock !== null) ? parseInt(product.stock, 10) : null;
    const isOutOfStock = stockNum !== null && stockNum <= 0;
    const isLowStock = stockNum !== null && stockNum > 0 && stockNum <= 3;
    const isHot = (product.views || 0) >= 25;
    const isNew = index < 4;

    const numPrice = parseFloat(product.price) || 0;

    return (
        <div
            onClick={() => navigate(`/product/${product.id}`)}
            className={`product-card animate-fade-in-up ${isHot ? 'product-card--hot' : ''}`}
            style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* ── Image Stage ── */}
            <div className="product-card-image-wrap">
                {!imgLoaded && <div className="product-card-skeleton" />}
                <img
                    src={optimizeImage(activeImage, 400)}
                    alt={product.title}
                    loading={index > 5 ? 'lazy' : 'eager'}
                    fetchPriority={index <= 2 ? 'high' : 'auto'}
                    className={`product-card-image ${imgLoaded ? 'loaded' : ''}`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgLoaded(true)}
                />

                {/* Subtle bottom gradient for badge legibility */}
                <div className="product-card-vignette" />

                {/* Top Left: Category Pill */}
                {product.category && (
                    <span
                        className="product-card-category"
                        style={{ background: catStyle.bg, color: catStyle.color }}
                    >
                        {product.category}
                    </span>
                )}

                {/* Top Right: Urgency / Hype Badge */}
                {isOutOfStock ? (
                    <span className="product-card-badge product-card-badge--out">
                        Sold Out
                    </span>
                ) : isLowStock ? (
                    <span className="product-card-badge product-card-badge--low">
                        🚨 Only {stockNum} left!
                    </span>
                ) : isHot ? (
                    <span className="product-card-badge product-card-badge--hot">
                        <Flame size={11} fill="currentColor" /> Hot Drop
                    </span>
                ) : isNew ? (
                    <span className="product-card-badge product-card-badge--new">
                        <Sparkles size={11} /> Fresh
                    </span>
                ) : null}

                {/* Bottom Left: Live Social Proof / Views */}
                <div className="product-card-social-proof">
                    {product.views > 0 ? (
                        <>
                            <Eye size={11} />
                            <span>{product.views} {product.views >= 20 ? '🔥 viewing' : 'views'}</span>
                        </>
                    ) : (
                        <>
                            <Zap size={11} fill="#F59E0B" color="#F59E0B" />
                            <span>Campus Pick</span>
                        </>
                    )}
                </div>

                {/* Bottom Right: Multi-photo counter */}
                {images.length > 1 && (
                    <div className="product-card-photo-count">
                        <Camera size={10} />
                        <span>{images.length}</span>
                    </div>
                )}
            </div>

            {/* ── Card Body ── */}
            <div className="product-card-body">
                {/* Price + Deal Tag */}
                <div className="product-card-price-row">
                    <div className="product-card-price">
                        ₦{numPrice.toLocaleString('en-NG', {
                            maximumFractionDigits: (numPrice % 1 === 0 ? 0 : 2)
                        })}
                    </div>
                    {!isOutOfStock && (
                        <span className={`product-card-deal-tag ${isLowStock ? 'product-card-deal-tag--urgent' : ''}`}>
                            {isLowStock ? '⚡ Going Fast' : '✨ Campus Deal'}
                        </span>
                    )}
                </div>

                {/* Product Title */}
                <h3 className="product-card-title">{product.title}</h3>

                {/* Seller + Rating Row */}
                <div className="product-card-seller">
                    <span className={product.sellerVerified ? 'seller-verified' : 'seller-name'}>
                        {product.sellerName || 'Student Seller'}
                    </span>
                    {product.sellerVerified && <VerifiedBadge size={13} />}
                    <ReadOnlyRating sellerId={product.sellerId} />
                </div>

                {/* Campus Tag */}
                {product.schoolName && (
                    <div className="product-card-campus">
                        <GraduationCap size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>{product.schoolName}</span>
                    </div>
                )}

                {/* Magnetic Impulse CTA Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                    className={`product-card-cta ${isOutOfStock ? 'product-card-cta--disabled' : ''}`}
                >
                    {isOutOfStock ? (
                        <span>Sold Out</span>
                    ) : (
                        <>
                            <Zap size={14} fill="currentColor" className="product-card-cta-icon" />
                            <span>{isLowStock ? 'Claim Before Gone' : 'Grab This Deal'}</span>
                        </>
                    )}
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
                    border: 1.5px solid var(--border);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                    position: relative;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                                box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                                border-color 0.25s ease;
                }

                .product-card--hot {
                    border-color: rgba(245, 158, 11, 0.38);
                }

                .product-card:hover {
                    transform: translateY(-7px);
                    box-shadow: 0 20px 32px -10px rgba(37, 99, 235, 0.22), 0 8px 16px -6px rgba(0, 0, 0, 0.1);
                    border-color: var(--primary);
                }

                .product-card-image-wrap {
                    position: relative;
                    padding-top: 96%;
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
                    transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                    opacity: 0;
                }

                .product-card-image.loaded {
                    opacity: 1;
                }

                .product-card:hover .product-card-image.loaded {
                    transform: scale(1.09);
                }

                .product-card-vignette {
                    position: absolute;
                    inset: auto 0 0 0;
                    height: 48%;
                    background: linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 100%);
                    pointer-events: none;
                    z-index: 2;
                }

                .product-card-category {
                    position: absolute;
                    top: 0.6rem;
                    left: 0.6rem;
                    font-size: 0.65rem;
                    font-weight: 800;
                    padding: 0.22rem 0.6rem;
                    border-radius: var(--radius-full);
                    z-index: 5;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .product-card-badge {
                    position: absolute;
                    top: 0.6rem;
                    right: 0.6rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.22rem;
                    font-size: 0.65rem;
                    font-weight: 800;
                    padding: 0.22rem 0.6rem;
                    border-radius: var(--radius-full);
                    z-index: 5;
                    letter-spacing: 0.03em;
                    text-transform: uppercase;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
                }

                .product-card-badge--hot {
                    background: linear-gradient(135deg, #FF512F 0%, #F09819 100%);
                    animation: badgePulse 2.2s infinite ease-in-out;
                }

                .product-card-badge--low {
                    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
                    animation: badgePulse 1.6s infinite ease-in-out;
                }

                .product-card-badge--new {
                    background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
                }

                .product-card-badge--out {
                    background: rgba(15, 23, 42, 0.85);
                }

                @keyframes badgePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.06); }
                }

                .product-card-social-proof {
                    position: absolute;
                    bottom: 0.55rem;
                    left: 0.6rem;
                    z-index: 5;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.28rem;
                    background: rgba(15, 23, 42, 0.72);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    color: #ffffff;
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 0.2rem 0.55rem;
                    border-radius: var(--radius-full);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }

                .product-card-photo-count {
                    position: absolute;
                    bottom: 0.55rem;
                    right: 0.6rem;
                    z-index: 5;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.2rem;
                    background: rgba(15, 23, 42, 0.72);
                    color: #ffffff;
                    font-size: 0.625rem;
                    font-weight: 700;
                    padding: 0.18rem 0.45rem;
                    border-radius: var(--radius-full);
                }

                .product-card-body {
                    padding: 0.9rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .product-card-price-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.35rem;
                    margin-bottom: 0.35rem;
                }

                .product-card-price {
                    font-family: var(--font-display);
                    font-weight: 900;
                    font-size: 1.2rem;
                    color: var(--primary);
                    letter-spacing: -0.03em;
                    line-height: 1.1;
                }

                .product-card-deal-tag {
                    font-size: 0.625rem;
                    font-weight: 800;
                    padding: 0.15rem 0.45rem;
                    border-radius: var(--radius-full);
                    background: rgba(16, 185, 129, 0.12);
                    color: #059669;
                    white-space: nowrap;
                }

                .product-card-deal-tag--urgent {
                    background: rgba(245, 158, 11, 0.15);
                    color: #D97706;
                }

                .product-card-title {
                    font-size: 0.925rem;
                    font-weight: 800;
                    margin: 0 0 0.35rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 1.32;
                    letter-spacing: -0.01em;
                    color: var(--text);
                }

                .product-card-seller {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.25rem;
                    flex-wrap: wrap;
                }

                .seller-verified {
                    font-weight: 700;
                    color: var(--text);
                }

                .seller-name {
                    font-weight: 600;
                }

                .product-card-campus {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    margin-bottom: 0.65rem;
                }

                .product-card-campus span {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .product-card-cta {
                    width: 100%;
                    margin-top: auto;
                    padding: 0.65rem 0.75rem;
                    font-size: 0.8125rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.35rem;
                    border: none;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    background: var(--gradient-primary);
                    color: white;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
                    transition: all 0.22s ease;
                    font-family: inherit;
                    position: relative;
                    overflow: hidden;
                }

                .product-card:hover .product-card-cta:not(.product-card-cta--disabled) {
                    background: linear-gradient(135deg, #1D4ED8 0%, #F59E0B 100%);
                    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
                    transform: translateY(-1px);
                }

                .product-card-cta--disabled {
                    background: var(--surface);
                    color: var(--text-tertiary);
                    box-shadow: none;
                }

                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }

                @media (max-width: 480px) {
                    .product-card-body {
                        padding: 0.65rem 0.55rem;
                    }

                    .product-card-price {
                        font-size: 1.02rem;
                    }

                    .product-card-deal-tag {
                        font-size: 0.55rem;
                        padding: 0.1rem 0.35rem;
                    }

                    .product-card-title {
                        font-size: 0.8125rem;
                        margin-bottom: 0.2rem;
                    }

                    .product-card-seller {
                        font-size: 0.6875rem;
                        gap: 0.2rem;
                    }

                    .product-card-cta {
                        padding: 0.5rem 0.4rem;
                        font-size: 0.75rem;
                    }

                    .product-card-category,
                    .product-card-badge {
                        font-size: 0.575rem;
                        padding: 0.16rem 0.45rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default ProductCard;
