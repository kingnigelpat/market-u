import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAnalyticsSummary } from '../utils/analyticsService';
import {
    Eye, MessageCircle, Users, ArrowLeft,
    RefreshCw, TrendingUp, ExternalLink, ShieldAlert
} from 'lucide-react';

const AdminAnalytics = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalEvents: 0,
        totals: { views: 0, whatsapp: 0, inApp: 0, replies: 0, referrals: 0, totalClicks: 0 },
        daily: [],
        sellers: [],
        products: []
    });
    const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'sellers', 'products'

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const summary = await getAnalyticsSummary(1000);
            setData(summary);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchAnalytics();
        }
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="container" style={{ maxWidth: '480px', padding: '4rem 1.5rem', textAlign: 'center' }}>
                <ShieldAlert size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontWeight: '900', marginBottom: '0.5rem' }}>Admin Access Required</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Only Market-U platform administrators can view telemetry and analytics.
                </p>
                <Link to="/" className="btn btn-primary">Go to Marketplace</Link>
            </div>
        );
    }

    const { totals, daily, sellers, products } = data;
    const inquiryConversion = totals.views > 0
        ? ((totals.totalClicks / totals.views) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="container" style={{ maxWidth: '960px', padding: '1.5rem 1rem 4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-ghost"
                        style={{ padding: '0.5rem', borderRadius: '50%' }}
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h1 style={{ fontSize: '1.35rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
                                Platform Analytics
                            </h1>
                            <span style={{
                                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '999px'
                            }}>
                                Live Data
                            </span>
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Daily product traffic, WhatsApp clicks, in-app questions, and seller response tracking
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Admin Subnav */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.75rem',
                marginBottom: '1.5rem',
                overflowX: 'auto'
            }}>
                <Link
                    to="/admin/analytics"
                    style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        fontWeight: '800',
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        textDecoration: 'none'
                    }}
                >
                    📊 Traffic & Clicks
                </Link>
                <Link
                    to="/admin/giveaway"
                    style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text)',
                        textDecoration: 'none',
                        border: '1px solid var(--border)'
                    }}
                >
                    🎁 Giveaway Payouts
                </Link>
                <Link
                    to="/admin/ads"
                    style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text)',
                        textDecoration: 'none',
                        border: '1px solid var(--border)'
                    }}
                >
                    📢 Ads Manager
                </Link>
            </div>

            {/* Overview Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.875rem',
                marginBottom: '1.75rem'
            }}>
                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '700' }}>Product Views</span>
                        <Eye size={18} color="var(--primary)" />
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text)' }}>
                        {totals.views.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Across all listings</span>
                </div>

                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '700' }}>WhatsApp Clicks</span>
                        <span style={{ fontSize: '1.1rem' }}>💬</span>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#16a34a' }}>
                        {totals.whatsapp.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>wa.me chats opened</span>
                </div>

                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '700' }}>In-App Questions</span>
                        <MessageCircle size={18} color="var(--primary)" />
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--primary)' }}>
                        {totals.inApp.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>&quot;Ask in app&quot; taps</span>
                </div>

                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '700' }}>Inquiry Rate</span>
                        <TrendingUp size={18} color="#eab308" />
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text)' }}>
                        {inquiryConversion}%
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Clicks per view</span>
                </div>

                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '700' }}>Referral Signups</span>
                        <Users size={18} color="#8b5cf6" />
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#8b5cf6' }}>
                        {totals.referrals.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Via promo codes</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                    📅 Daily Breakdown ({daily.length} days)
                </button>
                <button
                    onClick={() => setActiveTab('sellers')}
                    className={`btn ${activeTab === 'sellers' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                    🏪 Clicks per Seller ({sellers.length})
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                    📦 Traffic by Product ({products.length})
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Crunching analytics data...
                </div>
            ) : (
                <>
                    {/* ── Daily Breakdown Table ── */}
                    {activeTab === 'daily' && (
                        <div className="card" style={{ padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: '800' }}>
                                Daily Traffic & Engagement History
                            </div>
                            {daily.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No events logged yet. Once buyers browse listings, click WhatsApp, or ask questions, daily stats will appear here.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Date</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Views</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#16a34a' }}>WhatsApp Clicks</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800', color: 'var(--primary)' }}>In-App Questions</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Seller Replies</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#8b5cf6' }}>Promo Signups</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {daily.map((d, i) => (
                                                <tr key={d.date || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>{d.date}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>{d.views}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#16a34a', fontWeight: '700' }}>{d.whatsapp}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontWeight: '700' }}>{d.inApp}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>{d.replies}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#8b5cf6', fontWeight: '700' }}>{d.referrals}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Clicks Per Seller Table ── */}
                    {activeTab === 'sellers' && (
                        <div className="card" style={{ padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: '800' }}>
                                Inquiries Generated Per Seller (Task 2)
                            </div>
                            {sellers.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No seller contact button clicks logged yet.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Seller ID</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#16a34a' }}>WhatsApp Clicks</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800', color: 'var(--primary)' }}>In-App Asks</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Total Inquiries</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sellers.map((s) => (
                                                <tr key={s.sellerId} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '700', fontFamily: 'monospace' }}>
                                                        {s.sellerId}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#16a34a', fontWeight: '700' }}>
                                                        {s.whatsapp}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontWeight: '700' }}>
                                                        {s.inApp}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>
                                                        {s.totalClicks}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <Link to={`/store/${s.sellerId}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                                                            View Store <ExternalLink size={12} style={{ marginLeft: '0.2rem' }} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Products Table ── */}
                    {activeTab === 'products' && (
                        <div className="card" style={{ padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: '800' }}>
                                Most Viewed Products & Inquiries
                            </div>
                            {products.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No product views tracked yet.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Product</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Views</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#16a34a' }}>WhatsApp Clicks</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800', color: 'var(--primary)' }}>In-App Asks</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.slice(0, 30).map((p) => (
                                                <tr key={p.productId} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '700', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {p.title}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>{p.views}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#16a34a', fontWeight: '700' }}>{p.whatsapp}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontWeight: '700' }}>{p.inApp}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <Link to={`/product/${p.productId}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                                                            View <ExternalLink size={12} style={{ marginLeft: '0.2rem' }} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminAnalytics;
