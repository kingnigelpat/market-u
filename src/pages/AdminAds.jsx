import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ExternalLink, Eye, MousePointerClick, Clock, StopCircle, Megaphone, Wallet, Bell, Send, Sparkles, AlertCircle } from 'lucide-react';
import { subscribeToAllAds, approveAd, rejectAd, endAdNow, getEffectiveStatus, getDaysLeft } from '../utils/adService';
import { optimizeImage } from '../utils/cloudinary';
import { formatNaira } from '../config/ads';

const TABS = [
    { key: 'pending_payment', label: 'Pending' },
    { key: 'active', label: 'Live' },
    { key: 'expired', label: 'Ended' },
    { key: 'rejected', label: 'Rejected' },
];

const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

const AdminAds = () => {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending_payment');
    const [busyId, setBusyId] = useState(null);
    const [broadcastMsg, setBroadcastMsg] = useState('Buy from Market-U today');
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState(null);
    const [audienceData, setAudienceData] = useState(null);
    const [showAudienceList, setShowAudienceList] = useState(false);
    const [loadingAudience, setLoadingAudience] = useState(false);

    const fetchAudience = async () => {
        setLoadingAudience(true);
        try {
            const res = await fetch('/api/daily-reminder?action=subscribers');
            if (res.ok) {
                const data = await res.json();
                setAudienceData(data);
            }
        } catch (err) {
            console.error('Failed to fetch audience in AdminAds:', err);
        } finally {
            setLoadingAudience(false);
        }
    };

    useEffect(() => {
        fetchAudience();
    }, []);

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMsg.trim()) return;
        if (!confirm(`Send "${broadcastMsg.trim()}" notification to ALL registered buyers right now?`)) return;

        setSendingBroadcast(true);
        setBroadcastResult(null);
        try {
            const res = await fetch('/api/daily-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: broadcastMsg.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setBroadcastResult({
                    type: 'success',
                    text: data.total > 0
                        ? `✅ Broadcast sent successfully! ${data.succeeded} devices received the alert (${data.failed} failed/expired out of ${data.total}).`
                        : `ℹ️ Broadcast processed. Note: 0 user device tokens registered in database yet. Devices get registered as buyers allow notifications on Market-U.`
                });
            } else {
                setBroadcastResult({
                    type: 'error',
                    text: `❌ Error (${res.status}): ${data.error || 'Failed to broadcast'}`
                });
            }
        } catch (err) {
            setBroadcastResult({
                type: 'error',
                text: `❌ Network error: ${err.message || 'Could not reach serverless endpoint'}`
            });
        } finally {
            setSendingBroadcast(false);
        }
    };

    useEffect(() => subscribeToAllAds((list) => { setAds(list); setLoading(false); }), []);

    const grouped = useMemo(() => {
        const g = { pending_payment: [], active: [], expired: [], rejected: [] };
        ads.forEach((ad) => g[getEffectiveStatus(ad)]?.push(ad));
        return g;
    }, [ads]);

    const revenue = useMemo(
        () => ads.filter((a) => ['active', 'expired'].includes(a.status)).reduce((s, a) => s + (a.amount || 0), 0),
        [ads]
    );

    const run = async (id, fn) => {
        setBusyId(id);
        try { await fn(); } catch (e) { console.error(e); alert('Action failed: ' + (e.message || e)); }
        finally { setBusyId(null); }
    };

    const onApprove = (ad) => {
        if (!confirm(`Confirm you received ${formatNaira(ad.amount)} for "${ad.title}"? It will go live now for ${ad.weeks} week(s).`)) return;
        run(ad.id, () => approveAd(ad));
    };
    const onReject = (ad) => {
        const reason = prompt('Reason for rejecting (shown to advertiser, optional):', '');
        if (reason === null) return;
        run(ad.id, () => rejectAd(ad.id, reason.trim()));
    };
    const onEnd = (ad) => {
        if (!confirm(`End "${ad.title}" now?`)) return;
        run(ad.id, () => endAdNow(ad.id));
    };

    const list = grouped[tab] || [];

    return (
        <div className="container aa-page">
            <header className="aa-head">
                <div>
                    <h1 className="aa-h1"><Megaphone size={26} /> Ads Manager</h1>
                    <p className="aa-muted">Approve banner ads after confirming payment.</p>
                </div>
                <div className="aa-stats">
                    <div className="aa-stat"><span>Live now</span><strong>{grouped.active.length}</strong></div>
                    <div className="aa-stat"><span>Awaiting</span><strong>{grouped.pending_payment.length}</strong></div>
                    <div className="aa-stat aa-stat--rev"><span><Wallet size={13} /> Revenue</span><strong>{formatNaira(revenue)}</strong></div>
                </div>
            </header>

            {/* Daily Buyer Push Broadcast Section */}
            <section className="aa-broadcast-card">
                <div className="aa-bc-top">
                    <div className="aa-bc-icon-badge">
                        <Bell size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="aa-bc-title-row">
                            <h2 className="aa-bc-title">Daily Buyer Push Broadcast</h2>
                            <span className="aa-bc-badge">⏰ Automated: 11:00 AM WAT Daily</span>
                        </div>
                        <p className="aa-bc-desc">
                            All registered buyers receive a daily reminder on their phones & laptops to visit Market-U and buy campus items. You can also trigger an immediate broadcast right now.
                        </p>
                    </div>
                </div>

                {/* Audience stats */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                }}>
                    <span style={{ fontSize: '0.9rem', color: '#a5b4fc', fontWeight: 700 }}>
                        👥 Audience: {audienceData
                            ? `${audienceData.totalSubscribers} students subscribed (${audienceData.totalTokens} active devices)`
                            : loadingAudience ? 'Checking subscribers...' : 'Audience data ready'}
                    </span>
                    {audienceData && audienceData.subscribers?.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowAudienceList(prev => !prev)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#38bdf8',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {showAudienceList ? '▲ Hide List' : `▼ View Subscribers (${audienceData.totalSubscribers})`}
                        </button>
                    )}
                </div>

                {/* Collapsible Subscribers List */}
                {showAudienceList && audienceData?.subscribers && (
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '0.85rem 1rem',
                        maxHeight: '240px',
                        overflowY: 'auto'
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.6rem' }}>
                            Students who accepted push notifications ({audienceData.subscribers.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {audienceData.subscribers.map((sub, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                                        <strong style={{ color: '#fff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{sub.name}</strong>
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{sub.email} • {sub.schoolName}</span>
                                    </div>
                                    <span style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                                        {sub.tokensCount} device{sub.tokensCount > 1 ? 's' : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSendBroadcast} className="aa-bc-form">
                    <div className="aa-bc-input-wrap">
                        <input
                            type="text"
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Notification text (e.g. Buy from Market-U today)"
                            className="aa-bc-input"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={sendingBroadcast}
                        className="btn btn-primary aa-bc-btn"
                        id="send-daily-broadcast-btn"
                    >
                        {sendingBroadcast ? (
                            <>Sending Broadcast...</>
                        ) : (
                            <>
                                <Send size={15} /> Send Broadcast Now
                            </>
                        )}
                    </button>
                </form>

                {broadcastResult && (
                    <div className={`aa-bc-alert aa-bc-alert--${broadcastResult.type}`}>
                        {broadcastResult.type === 'success' ? <Sparkles size={16} /> : <AlertCircle size={16} />}
                        <span>{broadcastResult.text}</span>
                    </div>
                )}
            </section>

            <div className="aa-tabs" role="tablist">
                {TABS.map((t) => (
                    <button key={t.key} role="tab" id={`aa-tab-${t.key}`} aria-selected={tab === t.key}
                        className={tab === t.key ? 'is-active' : ''} onClick={() => setTab(t.key)}>
                        {t.label} <span>{grouped[t.key].length}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="page-loader"><div className="page-spinner" /></div>
            ) : list.length === 0 ? (
                <div className="aa-empty">Nothing here.</div>
            ) : (
                <div className="aa-list">
                    {list.map((ad) => {
                        const days = getDaysLeft(ad);
                        const internal = ad.linkUrl?.startsWith('/');
                        return (
                            <article key={ad.id} className="aa-card">
                                <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="aa-img-wrap">
                                    <img src={optimizeImage(ad.imageUrl, 600)} alt={ad.title} />
                                </a>
                                <div className="aa-main">
                                    <div className="aa-top">
                                        <div>
                                            <h3>{ad.title}</h3>
                                            {ad.subtitle && <p className="aa-muted">{ad.subtitle}</p>}
                                        </div>
                                        <strong className="aa-amount">{formatNaira(ad.amount)}</strong>
                                    </div>
                                    <dl className="aa-meta">
                                        <div><dt>Advertiser</dt><dd>{ad.advertiserName} <em>({ad.advertiserType})</em></dd></div>
                                        <div><dt>School</dt><dd>{ad.schoolName}</dd></div>
                                        <div><dt>Duration</dt><dd>{ad.weeks} week{ad.weeks > 1 ? 's' : ''}</dd></div>
                                        <div><dt>Submitted</dt><dd>{fmtDate(ad.createdAt)}</dd></div>
                                        <div><dt>Ad ID</dt><dd><code>{ad.id.slice(0, 8)}</code></dd></div>
                                        {ad.paymentRef && <div><dt>Payment ref</dt><dd>{ad.paymentRef}</dd></div>}
                                        <div className="aa-link">
                                            <dt>Link</dt>
                                            <dd>
                                                {internal
                                                    ? <Link to={ad.linkUrl} target="_blank">{ad.linkUrl} <ExternalLink size={12} /></Link>
                                                    : <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer nofollow">{ad.linkUrl} <ExternalLink size={12} /></a>}
                                            </dd>
                                        </div>
                                        {ad.startDate && <div><dt>Runs</dt><dd>{fmtDate(ad.startDate)} → {fmtDate(ad.endDate)}</dd></div>}
                                    </dl>
                                    <div className="aa-foot">
                                        <div className="aa-perf">
                                            <span><Eye size={14} /> {ad.impressions || 0}</span>
                                            <span><MousePointerClick size={14} /> {ad.clicks || 0}</span>
                                            {tab === 'active' && days !== null && <span><Clock size={14} /> {days}d left</span>}
                                            {ad.rejectionReason && <span className="aa-reason">“{ad.rejectionReason}”</span>}
                                        </div>
                                        <div className="aa-actions">
                                            {tab === 'pending_payment' && (
                                                <>
                                                    <button className="btn btn-secondary" disabled={busyId === ad.id} onClick={() => onReject(ad)} id={`aa-reject-${ad.id}`}>
                                                        <XCircle size={16} /> Reject
                                                    </button>
                                                    <button className="btn btn-primary" disabled={busyId === ad.id} onClick={() => onApprove(ad)} id={`aa-approve-${ad.id}`}>
                                                        <CheckCircle2 size={16} /> Paid – Go live
                                                    </button>
                                                </>
                                            )}
                                            {tab === 'active' && (
                                                <button className="btn btn-secondary" disabled={busyId === ad.id} onClick={() => onEnd(ad)} id={`aa-end-${ad.id}`}>
                                                    <StopCircle size={16} /> End now
                                                </button>
                                            )}
                                            {tab === 'rejected' && (
                                                <button className="btn btn-secondary" disabled={busyId === ad.id} onClick={() => onApprove(ad)}>
                                                    <CheckCircle2 size={16} /> Approve anyway
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <style>{`
                .aa-page { padding-top: 1.5rem; padding-bottom: 4rem; }
                .aa-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 1.25rem; margin-bottom: 1.5rem; }
                .aa-h1 { display: flex; align-items: center; gap: 0.6rem; font-family: var(--font-display); font-size: 2rem; font-weight: 800; }
                .aa-muted { color: var(--text-secondary); font-size: 0.875rem; }
                .aa-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; }
                .aa-stat { padding: 0.75rem 1.1rem; border-radius: var(--radius-lg); background: var(--surface-elevated); border: 1px solid var(--border); min-width: 110px; }
                .aa-stat span { display: flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
                .aa-stat strong { font-family: var(--font-display); font-size: 1.5rem; }
                .aa-stat--rev { background: var(--gradient-primary); border: none; color: #fff; }
                .aa-stat--rev span { color: rgba(255,255,255,0.85); }

                /* Broadcast Card */
                .aa-broadcast-card {
                    background: linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: var(--radius-xl);
                    padding: 1.35rem 1.5rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(99, 102, 241, 0.1);
                    display: flex;
                    flex-direction: column;
                    gap: 1.1rem;
                }
                .aa-bc-top {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                }
                .aa-bc-icon-badge {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #f59e0b, #ef4444);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    flex-shrink: 0;
                    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
                }
                .aa-bc-title-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    margin-bottom: 0.3rem;
                }
                .aa-bc-title {
                    font-size: 1.15rem;
                    font-weight: 800;
                    margin: 0;
                    color: #fff;
                }
                .aa-bc-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    background: rgba(99, 102, 241, 0.2);
                    border: 1px solid rgba(99, 102, 241, 0.4);
                    color: #a5b4fc;
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 0.2rem 0.6rem;
                    border-radius: var(--radius-full);
                }
                .aa-bc-desc {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                    line-height: 1.5;
                }
                .aa-bc-form {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .aa-bc-input-wrap {
                    flex: 1;
                    min-width: 260px;
                }
                .aa-bc-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius-lg);
                    background: var(--surface-elevated);
                    border: 1px solid var(--border);
                    color: #fff;
                    font-size: 0.9rem;
                    font-weight: 600;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .aa-bc-input:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
                }
                .aa-bc-btn {
                    padding: 0.75rem 1.4rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    font-weight: 700;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .aa-bc-alert {
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius-md);
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    line-height: 1.4;
                }
                .aa-bc-alert--success {
                    background: rgba(34, 197, 94, 0.12);
                    border: 1px solid rgba(34, 197, 94, 0.35);
                    color: #4ade80;
                }
                .aa-bc-alert--error {
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.35);
                    color: #f87171;
                }

                .aa-tabs { display: flex; gap: 0.4rem; border-bottom: 1px solid var(--border); margin-bottom: 1.25rem; overflow-x: auto; }
                .aa-tabs button { padding: 0.7rem 1rem; font-weight: 700; font-size: 0.875rem; color: var(--text-secondary); border-bottom: 2.5px solid transparent; margin-bottom: -1px; display: inline-flex; gap: 0.4rem; align-items: center; white-space: nowrap; }
                .aa-tabs button span { font-size: 0.7rem; padding: 0.05rem 0.45rem; border-radius: var(--radius-full); background: var(--surface); }
                .aa-tabs button.is-active { color: var(--primary); border-bottom-color: var(--primary); }
                .aa-tabs button.is-active span { background: var(--primary-light); }

                .aa-empty { padding: 3rem; text-align: center; color: var(--text-secondary); border: 1.5px dashed var(--border); border-radius: var(--radius-xl); }
                .aa-list { display: flex; flex-direction: column; gap: 1rem; }
                .aa-card { display: grid; grid-template-columns: 300px 1fr; gap: 1.25rem; padding: 1rem; border-radius: var(--radius-xl); background: var(--surface-elevated); border: 1px solid var(--border); box-shadow: var(--shadow-xs); }
                .aa-img-wrap { display: block; border-radius: var(--radius-lg); overflow: hidden; background: #0F172A; aspect-ratio: 3 / 1.3; }
                .aa-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
                .aa-main { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
                .aa-top { display: flex; justify-content: space-between; gap: 1rem; }
                .aa-top h3 { font-size: 1.1rem; font-weight: 800; }
                .aa-amount { font-family: var(--font-display); font-size: 1.3rem; color: var(--primary); white-space: nowrap; }
                .aa-meta { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem 1rem; }
                .aa-meta dt { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-tertiary); }
                .aa-meta dd { font-size: 0.85rem; font-weight: 600; overflow-wrap: anywhere; }
                .aa-meta em { font-style: normal; color: var(--text-secondary); font-weight: 500; }
                .aa-link { grid-column: 1 / -1; }
                .aa-link a { color: var(--primary); display: inline-flex; align-items: center; gap: 0.25rem; }
                .aa-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; margin-top: auto; }
                .aa-perf { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary); }
                .aa-perf span { display: inline-flex; align-items: center; gap: 0.3rem; }
                .aa-reason { color: var(--danger); font-style: italic; }
                .aa-actions { display: flex; gap: 0.5rem; }
                .aa-actions .btn:disabled { opacity: 0.6; cursor: wait; transform: none; }
                @media (max-width: 760px) { .aa-card { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
};

export default AdminAds;
