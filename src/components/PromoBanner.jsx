import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, MapPin, MessageCircle, Settings, ChevronRight } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';
import VerifiedBadge from './VerifiedBadge';

const PromoBanner = ({
    campaign,
    products = [],
    isAdmin = false,
    onOpenAdminModal,
    onCtaClick
}) => {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    // Pick 2-3 real matching products for visual showcase
    const targetCats = campaign?.targetCategories || ['Fashion', 'Electronics', 'Home & Kitchen'];
    const featuredProducts = products
        .filter(p => targetCats.includes(p.category) && p.images && p.images.length > 0)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 3);

    const handleProductClick = (e, productId) => {
        e.stopPropagation();
        navigate(`/product/${productId}`);
    };

    return (
        <section className="promo-banner-wrap animate-fade-in-up" aria-label="Promotional Campaign">
            <div className="promo-banner">
                {/* Background decorative ambient glows */}
                <div className="promo-glow promo-glow--1" />
                <div className="promo-glow promo-glow--2" />

                {/* ── Left Column: Content & CTA ── */}
                <div className="promo-content">
                    {/* Campaign tag / badge */}
                    <div className="promo-badge-row">
                        <span className="promo-badge">
                            <span className="promo-badge-dot" />
                            <Sparkles size={12} className="promo-badge-icon" />
                            {campaign?.badgeText || 'CAMPUS RESUMPTION'}
                        </span>

                        {isAdmin && (
                            <button
                                onClick={onOpenAdminModal}
                                className="promo-admin-btn"
                                title="Admin: Edit homepage campaign"
                                aria-label="Edit campaign settings"
                            >
                                <Settings size={13} />
                                <span>Edit Campaign</span>
                            </button>
                        )}
                    </div>

                    {/* Bold headline */}
                    <h2 className="promo-title">
                        {campaign?.title || 'BACK TO CAMPUS'}
                    </h2>

                    {/* Supporting punchy copy */}
                    <p className="promo-subtitle">
                        {campaign?.subtitle || 'New semester? Find the things you actually need.'}
                    </p>

                    {/* Value perks strip */}
                    <div className="promo-perks hide-on-mobile">
                        <div className="promo-perk-item">
                            <ShieldCheck size={14} className="promo-perk-icon" />
                            <span>Verified Student Sellers</span>
                        </div>
                        <div className="promo-perk-divider" />
                        <div className="promo-perk-item">
                            <MapPin size={14} className="promo-perk-icon" />
                            <span>On-Campus Pickup</span>
                        </div>
                        <div className="promo-perk-divider" />
                        <div className="promo-perk-item">
                            <MessageCircle size={14} className="promo-perk-icon" />
                            <span>Direct WhatsApp</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="promo-actions">
                        <button
                            onClick={onCtaClick}
                            className="btn btn-primary promo-cta-btn"
                        >
                            <span>{campaign?.ctaText || 'Shop Resumption Essentials'}</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Right Column: Dynamic Real Products Showcase (Desktop) ── */}
                <div className="promo-visual hide-on-mobile">
                    {campaign?.bannerImageUrl ? (
                        <div className="promo-custom-image-wrap">
                            <img
                                src={campaign.bannerImageUrl}
                                alt={campaign.title}
                                className="promo-custom-image"
                            />
                        </div>
                    ) : featuredProducts.length > 0 ? (
                        <div className="promo-product-stage">
                            <div className="promo-stage-label">
                                <span>🔥 Trending Resumption Picks</span>
                            </div>

                            <div className="promo-cards-grid">
                                {featuredProducts.map((prod, idx) => {
                                    const isHovered = hoveredCard === prod.id;
                                    return (
                                        <div
                                            key={prod.id}
                                            onClick={(e) => handleProductClick(e, prod.id)}
                                            onMouseEnter={() => setHoveredCard(prod.id)}
                                            onMouseLeave={() => setHoveredCard(null)}
                                            className={`promo-mini-card promo-mini-card--${idx} ${isHovered ? 'promo-mini-card--hovered' : ''}`}
                                        >
                                            <div className="promo-mini-img-wrap">
                                                <img
                                                    src={optimizeImage(prod.images[0], 250)}
                                                    alt={prod.title}
                                                    className="promo-mini-img"
                                                    loading="eager"
                                                />
                                                <span className="promo-mini-tag">{prod.category}</span>
                                            </div>
                                            <div className="promo-mini-info">
                                                <div className="promo-mini-title">{prod.title}</div>
                                                <div className="promo-mini-bottom">
                                                    <span className="promo-mini-price">
                                                        ₦{(parseFloat(prod.price) || 0).toLocaleString()}
                                                    </span>
                                                    {prod.sellerVerified && (
                                                        <span className="promo-mini-verified" title="Verified Seller">
                                                            <VerifiedBadge size={13} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="promo-placeholder-stage">
                            <div className="promo-tag-pill">🎒 Campus Essentials</div>
                            <p>Discover fashion, tech & room gear from verified students.</p>
                        </div>
                    )}
                </div>

                {/* ── Mobile Product Preview Strip ── */}
                {featuredProducts.length > 0 && !campaign?.bannerImageUrl && (
                    <div className="promo-mobile-showcase show-on-mobile hide-scrollbar">
                        <div className="promo-mobile-label">
                            <span>Featured for campus:</span>
                        </div>
                        <div className="promo-mobile-scroll">
                            {featuredProducts.map((prod) => (
                                <div
                                    key={prod.id}
                                    onClick={(e) => handleProductClick(e, prod.id)}
                                    className="promo-mobile-card"
                                >
                                    <img
                                        src={optimizeImage(prod.images[0], 160)}
                                        alt={prod.title}
                                        className="promo-mobile-card-img"
                                    />
                                    <div className="promo-mobile-card-details">
                                        <span className="promo-mobile-card-title">{prod.title}</span>
                                        <span className="promo-mobile-card-price">
                                            ₦{(parseFloat(prod.price) || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <ChevronRight size={14} className="promo-mobile-card-arrow" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .promo-banner-wrap {
                    margin-bottom: 2rem;
                }

                .promo-banner {
                    position: relative;
                    background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 45%, #2563EB 85%, #3B82F6 100%);
                    border-radius: var(--radius-2xl);
                    padding: 2.25rem 2.5rem;
                    color: #FFFFFF;
                    display: grid;
                    grid-template-columns: 1.15fr 0.85fr;
                    gap: 2.5rem;
                    align-items: center;
                    overflow: hidden;
                    box-shadow: 0 16px 36px -10px rgba(30, 58, 138, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
                }

                [data-theme="dark"] .promo-banner {
                    background: linear-gradient(135deg, #0A1428 0%, #172554 45%, #1E40AF 85%, #1D4ED8 100%);
                    box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(59, 130, 246, 0.2) inset;
                }

                .promo-glow {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(60px);
                    pointer-events: none;
                    opacity: 0.35;
                }

                .promo-glow--1 {
                    top: -40px;
                    right: 15%;
                    width: 260px;
                    height: 260px;
                    background: #60A5FA;
                }

                .promo-glow--2 {
                    bottom: -50px;
                    left: 20%;
                    width: 220px;
                    height: 220px;
                    background: #F59E0B;
                    opacity: 0.22;
                }

                .promo-content {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .promo-badge-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }

                .promo-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.3rem 0.8rem;
                    background: rgba(255, 255, 255, 0.16);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    border-radius: var(--radius-full);
                    font-size: 0.725rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: #FFFFFF;
                }

                .promo-badge-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #FBBF24;
                    box-shadow: 0 0 8px #FBBF24;
                }

                .promo-badge-icon {
                    color: #FBBF24;
                }

                .promo-admin-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.3rem 0.75rem;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: var(--radius-full);
                    color: #E2E8F0;
                    font-size: 0.725rem;
                    font-weight: 700;
                    transition: all 0.2s;
                }

                .promo-admin-btn:hover {
                    background: rgba(0, 0, 0, 0.5);
                    color: #FFFFFF;
                    border-color: #FFFFFF;
                    transform: translateY(-1px);
                }

                .promo-title {
                    font-family: var(--font-display);
                    font-size: clamp(2rem, 3.8vw, 3rem);
                    font-weight: 800;
                    line-height: 1.05;
                    letter-spacing: -0.03em;
                    color: #FFFFFF;
                    margin: 0;
                    text-shadow: 0 2px 10px rgba(15, 23, 42, 0.25);
                }

                .promo-subtitle {
                    font-size: 1.05rem;
                    line-height: 1.45;
                    color: rgba(255, 255, 255, 0.9);
                    max-width: 480px;
                    margin: 0;
                    font-weight: 500;
                }

                .promo-perks {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin: 0.25rem 0 0.5rem;
                    flex-wrap: wrap;
                }

                .promo-perk-item {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.775rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.92);
                }

                .promo-perk-icon {
                    color: #60A5FA;
                }

                .promo-perk-divider {
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.4);
                }

                .promo-actions {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                    align-items: center;
                }

                .promo-cta-btn {
                    background: #FFFFFF;
                    color: #1E3A8A;
                    font-size: 0.9375rem;
                    font-weight: 800;
                    padding: 0.8rem 1.6rem;
                    border-radius: var(--radius-full);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    border: none;
                }

                .promo-cta-btn:hover {
                    background: #F8FAFC;
                    color: #1D4ED8;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.3);
                }

                /* ── Right Column Visual Stage ── */
                .promo-visual {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .promo-product-stage {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .promo-stage-label {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.03em;
                    color: rgba(255, 255, 255, 0.85);
                    text-transform: uppercase;
                }

                .promo-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                    gap: 0.875rem;
                    width: 100%;
                }

                .promo-mini-card {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: var(--radius-lg);
                    padding: 0.5rem;
                    cursor: pointer;
                    color: #0F172A;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
                    display: flex;
                    flex-direction: column;
                    border: 1px solid rgba(255, 255, 255, 0.8);
                }

                .promo-mini-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25);
                    background: #FFFFFF;
                }

                .promo-mini-img-wrap {
                    position: relative;
                    width: 100%;
                    padding-top: 100%;
                    border-radius: calc(var(--radius-lg) - 4px);
                    overflow: hidden;
                    background: #F1F5F9;
                }

                .promo-mini-img {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                }

                .promo-mini-tag {
                    position: absolute;
                    top: 4px; left: 4px;
                    background: rgba(15, 23, 42, 0.8);
                    color: white;
                    font-size: 0.6rem;
                    font-weight: 700;
                    padding: 0.15rem 0.4rem;
                    border-radius: var(--radius-sm);
                    backdrop-filter: blur(4px);
                }

                .promo-mini-info {
                    padding: 0.45rem 0.25rem 0.15rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }

                .promo-mini-title {
                    font-size: 0.75rem;
                    font-weight: 700;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: #0F172A;
                }

                .promo-mini-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .promo-mini-price {
                    font-size: 0.775rem;
                    font-weight: 800;
                    color: #2563EB;
                }

                .promo-custom-image-wrap {
                    width: 100%;
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                }

                .promo-custom-image {
                    width: 100%;
                    height: 240px;
                    object-fit: cover;
                    display: block;
                }

                .promo-placeholder-stage {
                    padding: 2rem;
                    border: 1.5px dashed rgba(255, 255, 255, 0.35);
                    border-radius: var(--radius-xl);
                    text-align: center;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 0.875rem;
                }

                .promo-tag-pill {
                    display: inline-block;
                    padding: 0.35rem 0.8rem;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: var(--radius-full);
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }

                /* ── Mobile Showcase ── */
                .show-on-mobile {
                    display: none;
                }

                @media (max-width: 860px) {
                    .promo-banner {
                        grid-template-columns: 1fr;
                        padding: 1.75rem 1.25rem;
                        gap: 1.25rem;
                    }

                    .hide-on-mobile {
                        display: none !important;
                    }

                    .show-on-mobile {
                        display: block;
                    }

                    .promo-title {
                        font-size: 1.85rem;
                    }

                    .promo-subtitle {
                        font-size: 0.9375rem;
                    }

                    .promo-cta-btn {
                        width: 100%;
                        justify-content: center;
                    }

                    .promo-mobile-showcase {
                        margin-top: 0.5rem;
                        border-top: 1px solid rgba(255, 255, 255, 0.15);
                        padding-top: 1rem;
                    }

                    .promo-mobile-label {
                        font-size: 0.725rem;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.04em;
                        color: rgba(255, 255, 255, 0.8);
                        margin-bottom: 0.6rem;
                    }

                    .promo-mobile-scroll {
                        display: flex;
                        gap: 0.625rem;
                        overflow-x: auto;
                        padding-bottom: 0.25rem;
                    }

                    .promo-mobile-card {
                        flex: 0 0 190px;
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: var(--radius-md);
                        padding: 0.4rem 0.5rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        cursor: pointer;
                        color: #0F172A;
                    }

                    .promo-mobile-card-img {
                        width: 44px;
                        height: 44px;
                        border-radius: var(--radius-sm);
                        object-fit: cover;
                        flex-shrink: 0;
                    }

                    .promo-mobile-card-details {
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        flex: 1;
                    }

                    .promo-mobile-card-title {
                        font-size: 0.75rem;
                        font-weight: 700;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        color: #0F172A;
                    }

                    .promo-mobile-card-price {
                        font-size: 0.725rem;
                        font-weight: 800;
                        color: #2563EB;
                    }

                    .promo-mobile-card-arrow {
                        color: #64748B;
                        flex-shrink: 0;
                    }
                }

                @media (max-width: 480px) {
                    .promo-banner {
                        padding: 1.25rem 1rem;
                        border-radius: var(--radius-xl);
                        gap: 0.875rem;
                    }

                    .promo-badge {
                        font-size: 0.675rem;
                        padding: 0.25rem 0.65rem;
                    }

                    .promo-admin-btn {
                        font-size: 0.675rem;
                        padding: 0.25rem 0.6rem;
                    }

                    .promo-title {
                        font-size: clamp(1.35rem, 5.5vw, 1.65rem);
                        line-height: 1.15;
                    }

                    .promo-subtitle {
                        font-size: 0.85rem;
                        line-height: 1.35;
                    }

                    .promo-cta-btn {
                        padding: 0.65rem 1.25rem;
                        font-size: 0.85rem;
                    }

                    .promo-mobile-card {
                        flex: 0 0 160px;
                        padding: 0.35rem 0.45rem;
                    }

                    .promo-mobile-card-img {
                        width: 38px;
                        height: 38px;
                    }

                    .promo-mobile-card-title {
                        font-size: 0.7rem;
                    }

                    .promo-mobile-card-price {
                        font-size: 0.7rem;
                    }
                }
            `}</style>
        </section>
    );
};

export default PromoBanner;
