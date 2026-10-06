import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ExternalLink, Eye, MousePointerClick, Clock, StopCircle, Megaphone, Wallet } from 'lucide-react';
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
