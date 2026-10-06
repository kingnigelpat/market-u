import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';
import { trackAdImpression, trackAdClick } from '../utils/adService';

const AUTO_ADVANCE_MS = 6000;

const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const ctaLabel = (linkType) =>
    linkType === 'store' ? 'Visit Store' : linkType === 'product' ? 'View Item' : 'Learn More';

/**
 * Homepage banner carousel.
 * Paid ads rotate first (shuffled for fairness), followed by the admin campaign slide.
 * If there are no ads it just renders the campaign slide on its own.
 */
const AdCarousel = ({ ads = [], campaignSlide }) => {
    const navigate = useNavigate();
    // Shuffle once per distinct set of ad IDs so the order is stable while browsing
    const adKey = ads.map((a) => a.id).sort().join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const orderedAds = useMemo(() => shuffle(ads), [adKey]);
    const slides = useMemo(
        () => [...orderedAds.map((ad) => ({ type: 'ad', ad })), ...(campaignSlide ? [{ type: 'campaign' }] : [])],
        [orderedAds, campaignSlide]
    );

    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const touchStartX = useRef(null);
    const total = slides.length;

    useEffect(() => { if (index >= total) setIndex(0); }, [total, index]);

    const go = useCallback((i) => setIndex(((i % total) + total) % total), [total]);

    // Auto-advance
    useEffect(() => {
        if (total < 2 || paused) return;
        const t = setTimeout(() => go(index + 1), AUTO_ADVANCE_MS);
        return () => clearTimeout(t);
    }, [index, total, paused, go]);

    // Impression tracking for the visible ad
    useEffect(() => {
        const s = slides[index];
        if (s?.type === 'ad' && document.visibilityState === 'visible') trackAdImpression(s.ad.id);
    }, [index, slides]);

    const openAd = (ad) => {
        trackAdClick(ad.id);
        const url = ad.linkUrl || '';
        if (url.startsWith('/') && !url.startsWith('//')) {
            navigate(url);
        } else if (/^https:\/\//i.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    if (total === 0) return null;
    if (total === 1 && slides[0].type === 'campaign') return campaignSlide;

    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; setPaused(true); };
    const onTouchEnd = (e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        setPaused(false);
        if (start == null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    };

    return (
        <section
            className="adc-wrap animate-fade-in-up"
            aria-roledescription="carousel"
            aria-label="Featured and sponsored"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="adc-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <div className="adc-track" style={{ transform: `translateX(-${index * 100}%)` }}>
                    {slides.map((s, i) => (
                        <div
                            key={s.type === 'ad' ? s.ad.id : 'campaign'}
                            className="adc-slide"
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${i + 1} of ${total}`}
                            aria-hidden={i !== index}
                        >
                            {s.type === 'campaign' ? campaignSlide : (
                                <button
                                    type="button"
                                    id={`sponsored-ad-${s.ad.id}`}
                                    className="adc-ad"
                                    onClick={() => openAd(s.ad)}
                                    tabIndex={i === index ? 0 : -1}
                                >
                                    <img
                                        src={optimizeImage(s.ad.imageUrl, 1200)}
                                        alt={s.ad.title}
                                        className="adc-ad-img"
                                        loading={i === 0 ? 'eager' : 'lazy'}
                                    />
                                    <div className="adc-ad-shade" />
                                    <span className="adc-sponsored">Sponsored</span>
                                    <div className="adc-ad-body">
                                        <span className="adc-ad-by">{s.ad.advertiserName}</span>
                                        <h2 className="adc-ad-title">{s.ad.title}</h2>
                                        {s.ad.subtitle && <p className="adc-ad-sub">{s.ad.subtitle}</p>}
                                        <span className="adc-ad-cta">
                                            {ctaLabel(s.ad.linkType)} <ArrowUpRight size={15} />
                                        </span>
                                    </div>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button type="button" className="adc-arrow adc-arrow--prev" onClick={() => go(index - 1)} aria-label="Previous slide">
                    <ChevronLeft size={18} />
                </button>
                <button type="button" className="adc-arrow adc-arrow--next" onClick={() => go(index + 1)} aria-label="Next slide">
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="adc-dots" role="tablist">
                {slides.map((s, i) => (
                    <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Go to slide ${i + 1}`}
                        className={`adc-dot ${i === index ? 'adc-dot--active' : ''}`}
                        onClick={() => go(i)}
                    >
                        {i === index && !paused && total > 1 && (
                            <span className="adc-dot-fill" style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }} />
                        )}
                    </button>
                ))}
            </div>

            <style>{`
                .adc-wrap { margin-bottom: 2rem; }
                .adc-viewport {
                    position: relative;
                    overflow: hidden;
                    border-radius: var(--radius-2xl);
                    box-shadow: 0 16px 36px -12px rgba(15, 23, 42, 0.35);
                    touch-action: pan-y;
                }
                .adc-track {
                    display: flex;
                    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
                    will-change: transform;
                }
                .adc-slide {
                    flex: 0 0 100%;
                    min-width: 0;
                    display: flex;
                }
                .adc-slide > * { width: 100%; }
                .adc-slide .promo-banner-wrap { margin-bottom: 0; height: 100%; animation: none; }
                .adc-slide .promo-banner { height: 100%; border-radius: 0; box-shadow: none; }

                .adc-ad {
                    position: relative;
                    display: block;
                    width: 100%;
                    min-height: clamp(220px, 32vw, 380px);
                    padding: 0;
                    border: none;
                    background: #0F172A;
                    cursor: pointer;
                    overflow: hidden;
                    text-align: left;
                    color: #fff;
                    font: inherit;
                }
                .adc-ad-img {
                    position: absolute; inset: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    transition: transform 6s ease-out;
                }
                .adc-ad:hover .adc-ad-img { transform: scale(1.04); }
                .adc-ad-shade {
                    position: absolute; inset: 0;
                    background: linear-gradient(90deg, rgba(2, 6, 23, 0.82) 0%, rgba(2, 6, 23, 0.45) 45%, rgba(2, 6, 23, 0) 75%);
                }
                .adc-sponsored {
                    position: absolute; top: 1rem; right: 1rem;
                    padding: 0.25rem 0.65rem;
                    font-size: 0.65rem; font-weight: 800;
                    letter-spacing: 0.08em; text-transform: uppercase;
                    color: #FDE68A;
                    background: rgba(15, 23, 42, 0.55);
                    border: 1px solid rgba(253, 230, 138, 0.35);
                    border-radius: var(--radius-full);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .adc-ad-body {
                    position: absolute; left: 0; bottom: 0; top: 0;
                    display: flex; flex-direction: column; justify-content: center;
                    gap: 0.5rem;
                    padding: 2rem 2.5rem;
                    max-width: min(560px, 75%);
                }
                .adc-ad-by {
                    font-size: 0.75rem; font-weight: 700;
                    letter-spacing: 0.05em; text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.75);
                }
                .adc-ad-title {
                    font-family: var(--font-display);
                    font-size: clamp(1.5rem, 3.4vw, 2.6rem);
                    font-weight: 800; line-height: 1.05;
                    letter-spacing: -0.02em;
                    color: #fff; margin: 0;
                    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
                }
                .adc-ad-sub {
                    font-size: 0.975rem; line-height: 1.45;
                    color: rgba(255, 255, 255, 0.88); margin: 0;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                }
                .adc-ad-cta {
                    align-self: flex-start;
                    display: inline-flex; align-items: center; gap: 0.35rem;
                    margin-top: 0.5rem;
                    padding: 0.6rem 1.2rem;
                    background: #fff; color: #0F172A;
                    font-size: 0.85rem; font-weight: 800;
                    border-radius: var(--radius-full);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
                    transition: transform 0.2s;
                }
                .adc-ad:hover .adc-ad-cta { transform: translateY(-2px); }

                .adc-arrow {
                    position: absolute; top: 50%;
                    transform: translateY(-50%);
                    width: 36px; height: 36px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.18);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: #fff;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    opacity: 0; transition: opacity 0.2s, background 0.2s;
                    z-index: 3;
                }
                .adc-viewport:hover .adc-arrow { opacity: 1; }
                .adc-arrow:hover { background: rgba(255, 255, 255, 0.32); }
                .adc-arrow--prev { left: 0.75rem; }
                .adc-arrow--next { right: 0.75rem; }

                .adc-dots {
                    display: flex; justify-content: center; gap: 0.4rem;
                    margin-top: 0.75rem;
                }
                .adc-dot {
                    position: relative;
                    width: 8px; height: 8px;
                    border-radius: var(--radius-full);
                    background: var(--border);
                    overflow: hidden;
                    transition: width 0.3s, background 0.3s;
                    padding: 0;
                }
                .adc-dot--active { width: 28px; background: var(--primary-light); }
                .adc-dot-fill {
                    position: absolute; inset: 0;
                    background: var(--primary);
                    transform-origin: left;
                    animation: adc-fill linear forwards;
                }
                .adc-dot--active:not(:has(.adc-dot-fill)) { background: var(--primary); }
                @keyframes adc-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

                @media (max-width: 860px) {
                    .adc-arrow { display: none; }
                    .adc-ad { min-height: 230px; }
                    .adc-ad-shade {
                        background: linear-gradient(0deg, rgba(2, 6, 23, 0.88) 0%, rgba(2, 6, 23, 0.4) 55%, rgba(2, 6, 23, 0.05) 100%);
                    }
                    .adc-ad-body {
                        top: auto; max-width: 100%;
                        padding: 1.25rem 1.15rem;
                        gap: 0.35rem;
                    }
                    .adc-ad-sub { font-size: 0.85rem; }
                    .adc-ad-cta { padding: 0.5rem 1rem; font-size: 0.8rem; }
                    .adc-sponsored { top: 0.75rem; right: 0.75rem; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .adc-track, .adc-ad-img { transition: none; }
                }
            `}</style>
        </section>
    );
};

export default AdCarousel;
