import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ShieldCheck, Loader } from 'lucide-react';
import { callEscrow, ESCROW_STATUS, formatNaira } from '../utils/escrowService';

const toMs = (ts) => (ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0);

const FILTERS = ['action_needed', 'paid_held', 'disputed', 'released', 'paid_out', 'refunded', 'all'];
const FILTER_LABELS = {
    action_needed: 'Needs action', paid_held: 'Holding', disputed: 'Disputes', released: 'Payout due',
    paid_out: 'Paid out', refunded: 'Refunded', all: 'All',
};

const AdminEscrow = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('action_needed');
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'escrow_orders'), snap => {
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)));
        });
        return () => unsub();
    }, []);

    const run = async (action, order, needsNote) => {
        let reason;
        if (needsNote) {
            reason = window.prompt(needsNote);
            if (reason === null) return;
        } else if (!window.confirm(`${action.replace('admin_', '').replace(/_/g, ' ')} for ${order.id}?`)) {
            return;
        }
        setBusy(order.id + action);
        try {
            await callEscrow(action, { reference: order.id, reason });
        } catch (e) {
            alert(e.message);
        } finally {
            setBusy(null);
        }
    };

    const visible = orders.filter(o => {
        if (filter === 'all') return o.status !== 'pending_payment' && o.status !== 'cancelled';
        if (filter === 'action_needed') return ['disputed', 'released', 'flagged'].includes(o.status);
        return o.status === filter;
    });

    const held = orders.filter(o => o.status === 'paid_held' || o.status === 'disputed').reduce((s, o) => s + (o.totalAmount || 0), 0);
    const due = orders.filter(o => o.status === 'released').reduce((s, o) => s + (o.itemAmount || 0), 0);
    const fees = orders.filter(o => ['released', 'paid_out'].includes(o.status)).reduce((s, o) => s + (o.feeAmount || 0), 0);

    return (
        <div className="container" style={{ paddingTop: '1rem', paddingBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={24} color="var(--primary)" /> Safe Pay (Escrow) Admin
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Release money to sellers after delivery, refund buyers on valid disputes, and record payouts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
                {[['Currently held', held], ['Payouts due to sellers', due], ['Safe Pay fees earned', fees]].map(([l, v]) => (
                    <div key={l} className="card" style={{ padding: '0.9rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{l}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>{formatNaira(v)}</div>
                    </div>
                ))}
            </div>

            <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '1rem' }}>
                {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: '0.4rem 0.85rem', borderRadius: 99, fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer',
                        border: filter === f ? 'none' : '1px solid var(--border)', background: filter === f ? 'var(--primary)' : 'var(--surface)',
                        color: filter === f ? '#fff' : 'var(--text-secondary)'
                    }}>{FILTER_LABELS[f]}</button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Nothing here.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {visible.map(o => {
                        const st = ESCROW_STATUS[o.status] || { label: o.status };
                        return (
                            <div key={o.id} className="card" style={{ padding: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <strong>{o.productTitle}</strong>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: 99, color: st.color, background: st.bg }}>{st.label}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.6 }}>
                                    Ref <code>{o.id}</code> • Paid {formatNaira(o.totalAmount)} (item {formatNaira(o.itemAmount)} + fee {formatNaira(o.feeAmount)})<br />
                                    Buyer: {o.buyerName} ({o.buyerEmail}{o.buyerPhone ? `, ${o.buyerPhone}` : ''})<br />
                                    Seller: {o.sellerName}{o.sellerPhone ? ` (${o.sellerPhone})` : ''} • UID <code>{o.sellerId}</code>
                                    {o.disputeReason && <><br /><span style={{ color: '#B45309' }}>Dispute: “{o.disputeReason}”</span></>}
                                    {o.flagReason && <><br /><span style={{ color: 'var(--danger)' }}>{o.flagReason}</span></>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                                    {['paid_held', 'disputed'].includes(o.status) && (
                                        <>
                                            <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }} disabled={!!busy} onClick={() => run('admin_release', o)}>
                                                {busy === o.id + 'admin_release' ? <Loader size={14} /> : null} Release to seller
                                            </button>
                                            <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', color: 'var(--danger)' }} disabled={!!busy}
                                                onClick={() => run('admin_refund', o, 'Refund note (why are we refunding?)')}>
                                                {busy === o.id + 'admin_refund' ? <Loader size={14} /> : null} Refund buyer (Paystack)
                                            </button>
                                        </>
                                    )}
                                    {o.status === 'released' && (
                                        <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }} disabled={!!busy}
                                            onClick={() => run('admin_mark_paid_out', o, `After sending ${formatNaira(o.itemAmount)} to ${o.sellerName}, enter the transfer reference / note:`)}>
                                            Mark seller as paid out
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminEscrow;

