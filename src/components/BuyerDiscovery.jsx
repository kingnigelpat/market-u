import { ArrowRight, Sparkles } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';

const BuyerDiscovery = ({
    collections = [],
    activeCollectionKey = null,
    onSelectCollection
}) => {
    if (!collections || collections.length === 0) return null;

    return (
        <section className="buyer-discovery-section animate-fade-in-up" aria-label="Buyer Discovery Collections">
            <div className="discovery-header">
                <div>
                    <div className="discovery-badge">
                        <Sparkles size={13} />
                        <span>Curated for Students</span>
                    </div>
                    <h2 className="discovery-title">Getting ready for campus?</h2>
                    <p className="discovery-subtitle">
                        Discover essentials across campus without having to guess what to search for.
                    </p>
                </div>
            </div>

            <div className="discovery-grid">
                {collections.map((col) => {
                    const isActive = activeCollectionKey === col.key;
                    return (
                        <div
                            key={col.key}
                            onClick={() => onSelectCollection(col)}
                            className={`discovery-card ${isActive ? 'discovery-card--active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') onSelectCollection(col); }}
                        >
                            <div className="discovery-card-top">
                                <div className="discovery-card-icon-wrap">
                                    <span className="discovery-card-emoji">{col.emoji}</span>
                                </div>
                                <span className="discovery-card-count">
                                    {col.count} {col.count === 1 ? 'item' : 'items'}
                                </span>
                            </div>

                            <div className="discovery-card-body">
                                <h3 className="discovery-card-title">{col.title}</h3>
                                <p className="discovery-card-sub">{col.subtitle}</p>
                            </div>

                            {col.previewImages && col.previewImages.length > 0 && (
                                <div className="discovery-card-previews">
                                    {col.previewImages.map((img, i) => (
                                        <div key={i} className="discovery-thumb-wrap">
                                            <img
                                                src={optimizeImage(img, 120)}
                                                alt=""
                                                className="discovery-thumb"
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="discovery-card-footer">
                                <span className="discovery-card-action">
                                    {isActive ? 'Showing items' : 'Explore collection'}
                                </span>
                                <ArrowRight size={14} className="discovery-card-arrow" />
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .buyer-discovery-section {
                    margin-bottom: 2.5rem;
                }

                .discovery-header {
                    margin-bottom: 1.25rem;
                }

                .discovery-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.725rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--primary);
                    background: var(--primary-light);
                    padding: 0.25rem 0.65rem;
                    border-radius: var(--radius-full);
                    margin-bottom: 0.5rem;
                }

                .discovery-title {
                    font-family: var(--font-display);
                    font-size: 1.4rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    margin: 0 0 0.25rem;
                    color: var(--text);
                }

                .discovery-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin: 0;
                    font-weight: 500;
                }

                .discovery-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                }

                @media (max-width: 1024px) {
                    .discovery-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 600px) {
                    .buyer-discovery-section {
                        margin-bottom: 2rem;
                    }
                    .discovery-title {
                        font-size: 1.15rem;
                    }
                    .discovery-subtitle {
                        font-size: 0.8125rem;
                    }
                    .discovery-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.625rem;
                    }
                    .discovery-card {
                        padding: 0.875rem 0.75rem;
                        border-radius: var(--radius-lg);
                    }
                    .discovery-card-top {
                        margin-bottom: 0.5rem;
                    }
                    .discovery-card-icon-wrap {
                        width: 32px;
                        height: 32px;
                        border-radius: var(--radius-md);
                    }
                    .discovery-card-emoji {
                        font-size: 1rem;
                    }
                    .discovery-card-count {
                        font-size: 0.6875rem;
                        padding: 0.15rem 0.45rem;
                    }
                    .discovery-card-title {
                        font-size: 0.875rem;
                        margin-bottom: 0.15rem;
                    }
                    .discovery-card-sub {
                        font-size: 0.725rem;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .discovery-card-previews {
                        gap: 0.25rem;
                        margin-bottom: 0.5rem;
                    }
                    .discovery-thumb-wrap {
                        width: 28px;
                        height: 28px;
                    }
                    .discovery-card-footer {
                        padding-top: 0.4rem;
                        font-size: 0.725rem;
                    }
                }

                .discovery-card {
                    background: var(--surface-elevated);
                    border: 1.5px solid var(--border);
                    border-radius: var(--radius-xl);
                    padding: 1.15rem;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    box-shadow: var(--shadow-xs);
                }

                .discovery-card:hover {
                    transform: translateY(-3px);
                    border-color: var(--primary);
                    box-shadow: var(--shadow-md);
                }

                .discovery-card--active {
                    border-color: var(--primary);
                    background: var(--surface-elevated);
                    box-shadow: 0 0 0 2px var(--primary-light), var(--shadow-md);
                }

                .discovery-card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.75rem;
                }

                .discovery-card-icon-wrap {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-lg);
                    background: var(--surface);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border);
                }

                .discovery-card-emoji {
                    font-size: 1.25rem;
                }

                .discovery-card-count {
                    font-size: 0.725rem;
                    font-weight: 700;
                    color: var(--text-tertiary);
                    background: var(--surface);
                    padding: 0.2rem 0.55rem;
                    border-radius: var(--radius-full);
                }

                .discovery-card-body {
                    margin-bottom: 0.75rem;
                }

                .discovery-card-title {
                    font-family: var(--font-display);
                    font-size: 1.05rem;
                    font-weight: 800;
                    margin: 0 0 0.15rem;
                    color: var(--text);
                    letter-spacing: -0.01em;
                }

                .discovery-card-sub {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin: 0;
                    line-height: 1.4;
                }

                .discovery-card-previews {
                    display: flex;
                    gap: 0.35rem;
                    margin-bottom: 0.875rem;
                }

                .discovery-thumb-wrap {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    flex-shrink: 0;
                }

                .discovery-thumb {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .discovery-card-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--primary);
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border);
                }

                .discovery-card-arrow {
                    transition: transform 0.2s;
                }

                .discovery-card:hover .discovery-card-arrow {
                    transform: translateX(4px);
                }
            `}</style>
        </section>
    );
};

export default BuyerDiscovery;
