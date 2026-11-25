import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Package, CheckCircle2, AlertTriangle, Loader, ArrowLeft, Truck, Lock } from 'lucide-react';
import { callEscrow, ESCROW_STATUS, formatNaira } from '../utils/escrowService';
import { optimizeImage } from '../utils/cloudinary';

const toMs = (ts) => (ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0);

const Orders = () => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [buying, setBuying] = useState([]);
    const [selling, setSelling] = useState([]);
    const [tab, setTab] = useState('buying');
    const [loading, setLoading] = useState(true);
    const [busyRef, setBusyRef] = useState(null);
    const [banner, setBanner] = useState(null);
    const verifiedRef = useRef(false);

    // After Paystack redirects back: /orders?reference=MU-...
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const reference = params.get('reference') || params.get('trxref');
        if (!reference || !currentUser || verifiedRef.current) return;
        verifiedRef.current = true;
        setBanner({ type: 'info', text: 'Confirming your payment with Paystack…' });
        callEscrow('verify', { reference })
            .then(({ status }) => {
                if (status === 'paid_held') {
                    setBanner({ type: 'success', text: 'Payment successful! Your money is held safely by MarketU until you confirm you received the item.' });
                } else {
                    setBanner({ type: 'warning', text: `Payment status: ${ESCROW_STATUS[status]?.label || status}. If you were charged, it will update shortly.` });
                }
            })
            .catch(err => setBanner({ type: 'error', text: err.message }))
            .finally(() => navigate('/orders', { replace: true }));
    }, [location.search, currentUser, navigate]);

    useEffect(() => {
        if (!currentUser?.uid) return;
        let a = false, b = false;
        const done = () => { if (a && b) setLoading(false); };
        const sortDesc = (list) => list.sort((x, y) => toMs(y.createdAt) - toMs(x.createdAt));
        const u1 = onSnapshot(query(collection(db, 'escrow_orders'), where('buyerId', '==', currentUser.uid)),
            s => { setBuying(sortDesc(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.status !== 'pending_payment' && o.status !== 'cancelled'))); a = true; done(); },
            () => { a = true; done(); });
        const u2 = onSnapshot(query(collection(db, 'escrow_orders'), where('sellerId', '==', currentUser.uid)),
            s => { setSelling(sortDesc(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.status !== 'pending_payment' && o.status !== 'cancelled'))); b = true; done(); },
            () => { b = true; done(); });
        return () => { u1(); u2(); };
    }, [currentUser]);

    useEffect(() => {
        if (!loading && buying.length === 0 && selling.length > 0) setTab('selling');
    }, [loading, buying.length, selling.length]);

    const run = async (action, order, extra = {}) => {
        setBusyRef(order.id);
        try {
            await callEscrow(action, { reference: order.id, ...extra });
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyRef(null);
        }
    };

    const list = tab === 'buying' ? buying : selling;

    return (
        <div className="container" style={{ maxWidth: '820px', paddingTop: '1rem', paddingBottom: '1.5rem' }}>
            <button onClick={() => navigate(-1)} className="btn" style={{ paddingLeft: 0, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                <ArrowLeft size={18} /> Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(37,99,235,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>My Safe Pay Orders</h1>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Money is held by MarketU until the buyer confirms delivery.</p>
                </div>
            </div>

            {banner && (
                <div style={{
                    padding: '0.85rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600,
                    background: banner.type === 'success' ? 'rgba(16,185,129,0.1)' : banner.type === 'error' ? 'rgba(239,68,68,0.1)' : banner.type === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(37,99,235,0.08)',
                    color: banner.type === 'success' ? '#047857' : banner.type === 'error' ? 'var(--danger)' : 'var(--text)',
                    border: '1px solid var(--border)'
                }}>
                    {banner.text}
                </div>
            )}

            {/* How it works */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem', marginBottom: '1.1rem' }}>
                {[
                    { icon: Lock, t: '1. Buyer pays MarketU', d: 'Money is held, not sent to seller yet' },
                    { icon: Truck, t: '2. Seller hands over item', d: 'Meet on campus or deliver' },
                    { icon: CheckCircle2, t: '3. Buyer confirms', d: 'Seller gets paid. Problem? We refund.' },
                ].map(s => (
                    <div key={s.t} style={{ padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <s.icon size={16} style={{ color: 'var(--primary)' }} />
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', marginTop: '0.25rem' }}>{s.t}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{s.d}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                {[{ k: 'buying', l: `Buying (${buying.length})` }, { k: 'selling', l: `Selling (${selling.length})` }].map(x => (
                    <button key={x.k} onClick={() => setTab(x.k)} style={{
                        padding: '0.45rem 1rem', borderRadius: 99, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                        border: tab === x.k ? 'none' : '1px solid var(--border)',
                        background: tab === x.k ? 'var(--primary)' : 'var(--surface)', color: tab === x.k ? '#fff' : 'var(--text-secondary)'
                    }}>{x.l}</button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} /> Loading orders…
                </div>
            ) : list.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                    <Package size={36} style={{ color: 'var(--text-tertiary)', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontWeight: 800, marginBottom: '0.35rem' }}>No {tab === 'buying' ? 'purchases' : 'sales'} yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        {tab === 'buying' ? 'Tap "Pay Safely" on any product to buy with MarketU protection.' : 'When a student pays for your item with Safe Pay, it shows up here.'}
                    </p>
                    <Link to="/market" className="btn btn-primary">Browse Market</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {list.map(order => {
                        const st = ESCROW_STATUS[order.status] || { label: order.status, color: 'var(--text)', bg: 'var(--surface)' };
                        const busy = busyRef === order.id;
                        const asBuyer = tab === 'buying';
                        return (
                            <div key={order.id} className="card" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.85rem' }}>
                                    <Link to={`/product/${order.productId}`} style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                        {order.productImage && <img src={optimizeImage(order.productImage, 150)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </Link>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{order.productTitle}</span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: 99, color: st.color, background: st.bg }}>{st.label}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                            {asBuyer ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`} • Ref {order.id}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                            <strong>{formatNaira(asBuyer ? order.totalAmount : order.itemAmount)}</strong>
                                            {asBuyer && order.feeAmount > 0 && (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}> (item {formatNaira(order.itemAmount)} + Safe Pay fee {formatNaira(order.feeAmount)})</span>
                                            )}
                                            {!asBuyer && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}> you receive</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {order.status === 'paid_held' && asBuyer && (
                                    <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
                                        {order.sellerMarkedDeliveredAt && (
                                            <div style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 700, marginBottom: '0.5rem' }}>
                                                Seller says they handed over the item.
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <button disabled={busy} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 180 }}
                                                onClick={() => { if (window.confirm('Only confirm if you have received the item and it is okay. The seller will be paid. Continue?')) run('confirm', order); }}>
                                                {busy ? <Loader size={16} className="spin" /> : <CheckCircle2 size={16} />} I received it — release payment
                                            </button>
                                            <button disabled={busy} className="btn btn-secondary" style={{ justifyContent: 'center', color: 'var(--danger)' }}
                                                onClick={() => { const r = window.prompt('What went wrong? (e.g. item not delivered, wrong/fake item)'); if (r) run('dispute', order, { reason: r }); }}>
                                                <AlertTriangle size={16} /> Report a problem
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {order.status === 'paid_held' && !asBuyer && (
                                    <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', fontSize: '0.82rem' }}>
                                        <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>
                                            The buyer has paid and MarketU is holding the money. Hand over the item, then ask the buyer to tap <strong>"I received it"</strong>.
                                            {order.buyerPhone && <> Buyer phone: <strong>{order.buyerPhone}</strong></>}
                                        </p>
                                        {order.sellerMarkedDeliveredAt ? (
                                            <span style={{ color: '#059669', fontWeight: 800 }}>✓ You marked this as handed over — waiting for buyer to confirm.</span>
                                        ) : (
                                            <button disabled={busy} className="btn btn-primary" onClick={() => run('seller_delivered', order)}>
                                                {busy ? <Loader size={16} className="spin" /> : <Truck size={16} />} I have handed over the item
                                            </button>
                                        )}
                                    </div>
                                )}

                                {order.status === 'disputed' && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#B45309' }}>
                                        Reported problem: “{order.disputeReason}”. MarketU will contact both sides via <strong>team@raehub.live</strong>.
                                    </div>
                                )}
                                {order.status === 'released' && !asBuyer && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#047857' }}>
                                        Buyer confirmed. Your payout of {formatNaira(order.itemAmount)} is being processed to your bank account.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Orders;

