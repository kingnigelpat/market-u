import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { INSTITUTIONS, DEFAULT_CAMPUS, searchInstitutions, getAddSchoolWhatsAppUrl } from '../data/institutions';
import { useAuth } from '../context/AuthContext';
import {
    GraduationCap,
    Search,
    ShoppingBag,
    Sparkles,
    ChevronRight,
    PlusCircle,
    ArrowRight,
    Flame,
    MessageCircle
} from 'lucide-react';

const CATEGORY_TABS = [
    { key: 'all', label: 'All Institutions' },
    { key: 'active', label: '🔥 Active Markets' },
    { key: 'federal_uni', label: 'Federal Universities' },
    { key: 'state_uni', label: 'State Universities' },
    { key: 'private_uni', label: 'Private Universities' },
    { key: 'polytechnics', label: 'Polytechnics' },
];

const SchoolsDashboard = () => {
    const { isSeller, userSchoolName } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch products to compute real-time marketplace metrics per school
    useEffect(() => {
        const fetchMarketplaceStats = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'products'),
                    orderBy('createdAt', 'desc'),
                    limit(1500)
                );
                const snap = await getDocs(q);
                const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProducts(items);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMarketplaceStats();
    }, []);

    // Aggregated metrics per school
    const { schoolListingCounts, schoolSellerCounts, totalActiveProducts } = useMemo(() => {
        const listingCounts = {};
        const sellerSets = {};

        products.forEach(p => {
            // Default legacy listings to Western Delta University
            const sch = p.schoolName || 'Western Delta University';
            listingCounts[sch] = (listingCounts[sch] || 0) + 1;

            if (!sellerSets[sch]) sellerSets[sch] = new Set();
            if (p.sellerId) sellerSets[sch].add(p.sellerId);
        });

        const sellerCounts = {};
        Object.keys(sellerSets).forEach(sch => {
            sellerCounts[sch] = sellerSets[sch].size;
        });

        return {
            schoolListingCounts: listingCounts,
            schoolSellerCounts: sellerCounts,
            totalActiveProducts: products.length
        };
    }, [products]);

    // Filter institutions based on search and activeTab
    const filteredInstitutions = useMemo(() => {
        let list = searchInstitutions(search);

        if (activeTab === 'active') {
            list = list.filter(i => (schoolListingCounts[i.name] || 0) > 0);
        } else if (activeTab === 'federal_uni') {
            list = list.filter(i => i.category === 'Federal University');
        } else if (activeTab === 'state_uni') {
            list = list.filter(i => i.category === 'State University');
        } else if (activeTab === 'private_uni') {
            list = list.filter(i => i.category === 'Private University');
        } else if (activeTab === 'polytechnics') {
            list = list.filter(i => i.type === 'Polytechnic');
        }

        // Sort: Schools with active listings first, then alphabetical
        return [...list].sort((a, b) => {
            const countA = schoolListingCounts[a.name] || 0;
            const countB = schoolListingCounts[b.name] || 0;
            if (countB !== countA) return countB - countA;
            return a.name.localeCompare(b.name);
        });
    }, [search, activeTab, schoolListingCounts]);

    const handleEnterMarketplace = (schoolName) => {
        localStorage.setItem('marketu_selected_campus', schoolName);
        navigate(`/market?school=${encodeURIComponent(schoolName)}`);
    };

    return (
        <div className="schools-dashboard-page">
            <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
                {/* ── Hero Banner ── */}
                <div className="schools-hero animate-fade-in-up">
                    <div className="schools-hero-content">
                        <div className="schools-hero-badge">
                            <Sparkles size={14} />
                            <span>Campus Network & Marketplace Hub</span>
                        </div>
                        <h1 className="schools-hero-title">
                            Explore Campus Marketplaces Across Nigeria 🎓
                        </h1>
                        <p className="schools-hero-subtitle">
                            Every university & polytechnic now has a dedicated student marketplace.
                            Buy, sell, and trade safely within your campus community with 0% commission.
                        </p>

                        {/* Quick Metrics */}
                        <div className="schools-hero-metrics">
                            <div className="schools-metric-item">
                                <span className="metric-val">{INSTITUTIONS.length}+</span>
                                <span className="metric-label">Campuses Supported</span>
                            </div>
                            <div className="schools-metric-divider" />
                            <div className="schools-metric-item">
                                <span className="metric-val">{totalActiveProducts}</span>
                                <span className="metric-label">Active Listings</span>
                            </div>
                            <div className="schools-metric-divider" />
                            <div className="schools-metric-item">
                                <span className="metric-val">₦0</span>
                                <span className="metric-label">Commission (100% Free)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Search & Filter Controls ── */}
                <div className="schools-controls-bar">
                    <div className="schools-search-input-wrap">
                        <Search size={18} className="schools-search-icon" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by school or acronym (e.g. UNILAG, UNIBEN, DELSU, WDU, FUTA)..."
                            className="schools-search-input"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="schools-search-clear-btn">
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="schools-tabs-scroll">
                        {CATEGORY_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`schools-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Active Results Header ── */}
                <div className="schools-results-header">
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>
                        Showing {filteredInstitutions.length} {filteredInstitutions.length === 1 ? 'School' : 'Schools'}
                    </span>
                    <button
                        onClick={() => handleEnterMarketplace(DEFAULT_CAMPUS)}
                        className="schools-universal-btn"
                    >
                        Browse All Campuses Combined <ArrowRight size={14} />
                    </button>
                </div>

                {/* ── Schools Grid ── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        Loading campus directory...
                    </div>
                ) : filteredInstitutions.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: 'var(--radius-xl)' }}>
                        <GraduationCap size={44} style={{ color: 'var(--text-tertiary)', margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>No schools matched your search</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                            Can't find your campus? You can message the admin on WhatsApp to add it!
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => { setSearch(''); setActiveTab('all'); }} className="btn btn-secondary">
                                Reset Filters
                            </button>
                            <a
                                href={getAddSchoolWhatsAppUrl(search)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <MessageCircle size={16} /> Message Admin to Add Your School
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="schools-grid">
                        {filteredInstitutions.map((inst) => {
                            const listingCount = schoolListingCounts[inst.name] || 0;
                            const sellerCount = schoolSellerCounts[inst.name] || 0;
                            const isUserCampus = userSchoolName === inst.name;
                            const hasActiveListings = listingCount > 0;

                            return (
                                <div
                                    key={inst.name}
                                    className={`school-card ${isUserCampus ? 'school-card--user' : ''} ${hasActiveListings ? 'school-card--active' : ''}`}
                                >
                                    <div className="school-card-header">
                                        <div className="school-card-icon-wrap">
                                            <GraduationCap size={22} />
                                        </div>
                                        <div className="school-card-tags">
                                            <span className="school-type-pill">
                                                {inst.type}
                                            </span>
                                            {hasActiveListings && (
                                                <span className="school-active-pill">
                                                    <Flame size={12} /> {listingCount} {listingCount === 1 ? 'item' : 'items'}
                                                </span>
                                            )}
                                            {isUserCampus && (
                                                <span className="school-my-campus-pill">
                                                    Your Campus
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="school-card-body">
                                        <h3 className="school-card-name">
                                            {inst.name}
                                        </h3>
                                        {inst.short && (
                                            <span className="school-card-short">
                                                Acronym: <strong>{inst.short}</strong>
                                            </span>
                                        )}
                                        <p className="school-card-category">
                                            {inst.category}
                                        </p>

                                        {/* Activity Stats */}
                                        <div className="school-card-stats-row">
                                            <div className="school-card-stat">
                                                <span className="stat-num">{listingCount}</span>
                                                <span className="stat-txt">Listings</span>
                                            </div>
                                            <div className="school-card-stat">
                                                <span className="stat-num">{sellerCount}</span>
                                                <span className="stat-txt">Sellers</span>
                                            </div>
                                            <div className="school-card-stat">
                                                <span className="stat-num" style={{ color: 'var(--success)' }}>Free</span>
                                                <span className="stat-txt">Pickup</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="school-card-actions">
                                        <button
                                            type="button"
                                            onClick={() => handleEnterMarketplace(inst.name)}
                                            className="school-card-enter-btn"
                                        >
                                            <ShoppingBag size={15} />
                                            <span>Enter Market</span>
                                        </button>

                                        {isSeller ? (
                                            <Link
                                                to={`/add-product?school=${encodeURIComponent(inst.name)}`}
                                                className="school-card-post-btn"
                                                title="Post item for this campus"
                                            >
                                                <PlusCircle size={16} />
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleEnterMarketplace(inst.name)}
                                                className="school-card-post-btn"
                                                title="View listings"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Campus Ambassador / Expansion Banner ── */}
                <div className="schools-ambassador-banner animate-fade-in-up">
                    <div style={{ flex: 1, minWidth: '240px' }}>
                        <span className="ambassador-tag">CAMPUS COMMUNITY</span>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0.4rem 0 0.5rem', color: '#fff' }}>
                            Want to Lead Market-U on Your Campus? 🚀
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9375rem', margin: 0, maxWidth: '580px', lineHeight: '1.5' }}>
                            Become a Market-U Campus Lead! Help fellow students buy and sell safely,
                            earn rewards, and boost your university's digital marketplace.
                        </p>
                    </div>

                    <a
                        href="https://wa.me/2347073544811?text=Hi%2C%20I%20am%20interested%20in%20becoming%20a%20Market-U%20Campus%20Ambassador%20for%20my%20school!"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ambassador-cta-btn"
                    >
                        <MessageCircle size={18} /> Chat with Admin on WhatsApp
                    </a>
                </div>
            </div>

            <style>{`
                .schools-hero {
                    background: linear-gradient(135deg, #0B1B4D 0%, #1E40AF 50%, #2563EB 100%);
                    border-radius: var(--radius-2xl);
                    padding: 2.75rem 2rem;
                    color: white;
                    margin-bottom: 2rem;
                    box-shadow: 0 12px 36px -10px rgba(37, 99, 235, 0.4);
                    position: relative;
                    overflow: hidden;
                }

                .schools-hero::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -20%;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
                    pointer-events: none;
                }

                .schools-hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.35rem 0.85rem;
                    border-radius: var(--radius-full);
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(8px);
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    margin-bottom: 1rem;
                }

                .schools-hero-title {
                    font-size: 2.25rem;
                    font-weight: 900;
                    letter-spacing: -0.03em;
                    line-height: 1.15;
                    margin: 0 0 0.85rem 0;
                }

                .schools-hero-subtitle {
                    font-size: 1.0625rem;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.9);
                    max-width: 650px;
                    margin: 0 0 2rem 0;
                }

                .schools-hero-metrics {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    padding: 1rem 1.5rem;
                    border-radius: var(--radius-xl);
                    width: fit-content;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    flex-wrap: wrap;
                }

                .schools-metric-item {
                    display: flex;
                    flex-direction: column;
                }

                .metric-val {
                    font-size: 1.35rem;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                }

                .metric-label {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 600;
                }

                .schools-metric-divider {
                    width: 1px;
                    height: 28px;
                    background: rgba(255, 255, 255, 0.2);
                }

                .schools-controls-bar {
                    margin-bottom: 1.75rem;
                }

                .schools-search-input-wrap {
                    position: relative;
                    margin-bottom: 1rem;
                }

                .schools-search-input {
                    width: 100%;
                    padding: 1rem 4.5rem 1rem 3rem;
                    font-size: 1rem;
                    border-radius: var(--radius-xl);
                    border: 1.5px solid var(--border);
                    background: var(--surface-elevated);
                    color: var(--text);
                    outline: none;
                    box-sizing: border-box;
                    box-shadow: var(--shadow-sm);
                    transition: all 0.2s;
                }

                .schools-search-input:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px var(--primary-light);
                }

                .schools-search-icon {
                    position: absolute;
                    left: 1.1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-secondary);
                }

                .schools-search-clear-btn {
                    position: absolute;
                    right: 1.1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--primary);
                    font-weight: 700;
                    font-size: 0.8125rem;
                    cursor: pointer;
                }

                .schools-tabs-scroll {
                    display: flex;
                    gap: 0.5rem;
                    overflow-x: auto;
                    padding-bottom: 0.25rem;
                }

                .schools-tab-btn {
                    padding: 0.5rem 1.125rem;
                    border-radius: var(--radius-full);
                    border: 1.5px solid var(--border);
                    background: var(--surface-elevated);
                    color: var(--text-secondary);
                    font-size: 0.8125rem;
                    font-weight: 700;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s;
                }

                .schools-tab-btn:hover {
                    border-color: var(--primary-light);
                    color: var(--text);
                }

                .schools-tab-btn.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    box-shadow: 0 2px 8px var(--primary-glow);
                }

                .schools-results-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.25rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .schools-universal-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.8125rem;
                    font-weight: 800;
                    color: var(--primary);
                    background: var(--primary-light);
                    padding: 0.4rem 0.875rem;
                    border-radius: var(--radius-full);
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .schools-universal-btn:hover {
                    background: var(--primary);
                    color: white;
                }

                .schools-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
                    gap: 1.25rem;
                    margin-bottom: 3rem;
                }

                .school-card {
                    background: var(--surface-elevated);
                    border: 1.5px solid var(--border);
                    border-radius: var(--radius-xl);
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    transition: all 0.2s ease;
                    box-shadow: var(--shadow-sm);
                }

                .school-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .school-card--user {
                    border-color: var(--primary);
                    background: linear-gradient(to bottom, var(--primary-light), var(--surface-elevated));
                }

                .school-card-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    margin-bottom: 0.875rem;
                    gap: 0.5rem;
                }

                .school-card-icon-wrap {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: var(--surface);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .school-card-tags {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.35rem;
                }

                .school-type-pill {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    background: var(--surface);
                    padding: 0.2rem 0.55rem;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border);
                }

                .school-active-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.72rem;
                    font-weight: 800;
                    color: #d97706;
                    background: rgba(245, 158, 11, 0.12);
                    padding: 0.2rem 0.55rem;
                    border-radius: var(--radius-full);
                }

                .school-my-campus-pill {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: white;
                    background: var(--primary);
                    padding: 0.2rem 0.55rem;
                    border-radius: var(--radius-full);
                }

                .school-card-body {
                    flex: 1;
                    margin-bottom: 1.25rem;
                }

                .school-card-name {
                    font-size: 1.0625rem;
                    font-weight: 800;
                    color: var(--text);
                    margin: 0 0 0.25rem 0;
                    line-height: 1.3;
                }

                .school-card-short {
                    font-size: 0.8125rem;
                    color: var(--primary);
                    display: block;
                    margin-bottom: 0.35rem;
                }

                .school-card-category {
                    font-size: 0.78rem;
                    color: var(--text-secondary);
                    margin: 0 0 1rem 0;
                }

                .school-card-stats-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.65rem 0.875rem;
                    background: var(--surface);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border);
                }

                .school-card-stat {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }

                .stat-num {
                    font-size: 0.9375rem;
                    font-weight: 800;
                    color: var(--text);
                }

                .stat-txt {
                    font-size: 0.68rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                .school-card-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .school-card-enter-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.45rem;
                    padding: 0.65rem 1rem;
                    border-radius: var(--radius-lg);
                    background: var(--primary);
                    color: white;
                    font-size: 0.875rem;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .school-card-enter-btn:hover {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                }

                .school-card-post-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-lg);
                    background: var(--surface);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }

                .school-card-post-btn:hover {
                    background: var(--primary-light);
                    color: var(--primary);
                    border-color: var(--primary);
                }

                .schools-ambassador-banner {
                    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
                    border-radius: var(--radius-2xl);
                    padding: 2rem 2.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: var(--shadow-lg);
                }

                .ambassador-tag {
                    font-size: 0.72rem;
                    font-weight: 800;
                    color: #38BDF8;
                    letter-spacing: 0.08em;
                }

                .ambassador-cta-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.85rem 1.5rem;
                    border-radius: var(--radius-full);
                    background: #2563EB;
                    color: white;
                    font-weight: 800;
                    font-size: 0.9375rem;
                    text-decoration: none;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
                    transition: all 0.2s;
                }

                .ambassador-cta-btn:hover {
                    background: #1D4ED8;
                    transform: translateY(-1px);
                }

                @media (max-width: 768px) {
                    .schools-hero {
                        padding: 2rem 1.25rem;
                    }
                    .schools-hero-title {
                        font-size: 1.625rem;
                    }
                    .schools-hero-subtitle {
                        font-size: 0.9375rem;
                    }
                    .schools-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default SchoolsDashboard;
