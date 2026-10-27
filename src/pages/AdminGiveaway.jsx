import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getAdminGiveawayWinners,
    updateWinnerPayoutStatus,
    getGiveawayConfig,
    updateGiveawayConfig
} from '../utils/referralService';
import { formatWhatsAppNumber } from '../utils/phoneUtils';
import {
    Gift, Copy, Check, MessageCircle,
    ArrowLeft, RefreshCw, Settings, ShieldAlert, Building2
} from 'lucide-react';

const AdminGiveaway = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const [loading, setLoading] = useState(true);
    const [winners, setWinners] = useState([]);
    const [config, setConfig] = useState({ budgetCap: 50, rewardAmount: 1000, active: true });
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'Pending', 'Paid'
    const [copiedKey, setCopiedKey] = useState(null);
    const [actionBusyId, setActionBusyId] = useState(null);

    // Settings modal
    const [showSettings, setShowSettings] = useState(false);
    const [capInput, setCapInput] = useState(50);
    const [rewardInput, setRewardInput] = useState(1000);
    const [activeInput, setActiveInput] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [wList, cfg] = await Promise.all([
                getAdminGiveawayWinners(),
                getGiveawayConfig()
            ]);
            setWinners(wList);
            setConfig(cfg);
            setCapInput(cfg.budgetCap);
            setRewardInput(cfg.rewardAmount);
            setActiveInput(cfg.active);
        } catch (err) {
            console.error('Error loading giveaway winners:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);

    const handleCopy = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (err) {
            console.warn('Copy to clipboard failed:', err);
        }
    };

    const handleTogglePayout = async (winner) => {
        const nextStatus = winner.status === 'Paid' ? 'Pending' : 'Paid';
        const confirmMsg = nextStatus === 'Paid'
            ? `Confirm payment of ₦${winner.rewardAmount?.toLocaleString() || '1,000'} to ${winner.userName}?`
            : `Revert ${winner.userName}'s status to Pending?`;

        if (!window.confirm(confirmMsg)) return;

        setActionBusyId(winner.id);
        try {
            await updateWinnerPayoutStatus(winner.id, nextStatus);
            await loadData();
        } catch (err) {
            alert('Failed to update status: ' + (err.message || err));
        } finally {
            setActionBusyId(null);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            await updateGiveawayConfig({
                budgetCap: parseInt(capInput, 10),
                rewardAmount: parseInt(rewardInput, 10),
                active: activeInput
            });
            setShowSettings(false);
            await loadData();
        } catch (err) {
            alert('Could not update settings: ' + (err.message || err));
        } finally {
            setSavingSettings(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="container" style={{ maxWidth: '480px', padding: '4rem 1.5rem', textAlign: 'center' }}>
                <ShieldAlert size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontWeight: '900', marginBottom: '0.5rem' }}>Admin Access Required</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Only Market-U platform administrators can view and process giveaway payouts.
                </p>
                <Link to="/" className="btn btn-primary">Go to Marketplace</Link>
            </div>
        );
    }

    const pendingWinners = winners.filter(w => w.status !== 'Paid');
    const paidWinners = winners.filter(w => w.status === 'Paid');

    const filteredWinners = filterTab === 'all'
        ? winners
        : filterTab === 'Pending'
            ? pendingWinners
            : paidWinners;

    const totalPaidAmount = paidWinners.reduce((sum, w) => sum + (w.rewardAmount || 1000), 0);
    const totalPendingAmount = pendingWinners.reduce((sum, w) => sum + (w.rewardAmount || 1000), 0);

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
                                Giveaway Payouts
                            </h1>
                            <span style={{
                                backgroundColor: config.active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: config.active ? 'var(--success)' : 'var(--danger)',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '999px'
                            }}>
                                {config.active ? 'Active' : 'Paused'}
                            </span>
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Manual bank transfer verification queue for students who referred 5 friends
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
                    >
                        <Settings size={14} /> Budget Cap
                    </button>
                    <button
                        onClick={loadData}
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
                        fontWeight: '700',
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text)',
                        textDecoration: 'none',
                        border: '1px solid var(--border)'
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
                        fontWeight: '800',
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        textDecoration: 'none'
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

            {/* Budget Cap & Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.875rem',
                marginBottom: '1.75rem'
            }}>
                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-tertiary)' }}>
                        Winners / Budget Cap
                    </span>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--primary)', margin: '0.2rem 0' }}>
                        {winners.length} / {config.budgetCap}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {(config.budgetCap - winners.length)} winner slots remaining
                    </span>
                </div>

                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-tertiary)' }}>
                        Pending Payouts
                    </span>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#eab308', margin: '0.2rem 0' }}>
                        ₦{totalPendingAmount.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {pendingWinners.length} students awaiting payment
                    </span>
                </div>

                <div className="card" style={{ padding: '1.15rem', borderRadius: 'var(--radius-xl)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-tertiary)' }}>
                        Total Paid Out
                    </span>
                    <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--success)', margin: '0.2rem 0' }}>
                        ₦{totalPaidAmount.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {paidWinners.length} students successfully rewarded
                    </span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                    onClick={() => setFilterTab('all')}
                    className={`btn ${filterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.45rem 0.875rem', fontSize: '0.85rem' }}
                >
                    All Winners ({winners.length})
                </button>
                <button
                    onClick={() => setFilterTab('Pending')}
                    className={`btn ${filterTab === 'Pending' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.45rem 0.875rem', fontSize: '0.85rem' }}
                >
                    ⏳ Pending ({pendingWinners.length})
                </button>
                <button
                    onClick={() => setFilterTab('Paid')}
                    className={`btn ${filterTab === 'Paid' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.45rem 0.875rem', fontSize: '0.85rem' }}
                >
                    ✅ Paid ({paidWinners.length})
                </button>
            </div>

            {/* Winners List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading winners queue...
                </div>
            ) : filteredWinners.length === 0 ? (
                <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
                    <Gift size={36} color="var(--text-tertiary)" style={{ margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontWeight: '800', marginBottom: '0.4rem' }}>No Winners Found</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                        {filterTab === 'Pending'
                            ? 'No winners waiting for payout right now.'
                            : 'Students who successfully refer 5 friends will appear here with their bank details.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredWinners.map((winner) => {
                        const isPaid = winner.status === 'Paid';
                        const isBusy = actionBusyId === winner.id;
                        const dateStr = winner.completedAt?.toDate ? winner.completedAt.toDate().toLocaleString('en-GB') : 'Recent';
                        const cleanPhone = formatWhatsAppNumber(winner.userPhone);
                        const bank = winner.bankDetails;

                        return (
                            <div
                                key={winner.id}
                                className="card"
                                style={{
                                    padding: '1.25rem',
                                    borderRadius: 'var(--radius-xl)',
                                    border: isPaid ? '1px solid var(--border)' : '1.5px solid #eab308'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>
                                                {winner.userName || 'Student Winner'}
                                            </h3>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                padding: '0.2rem 0.55rem',
                                                borderRadius: '999px',
                                                backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                                                color: isPaid ? 'var(--success)' : '#ca8a04'
                                            }}>
                                                {isPaid ? 'PAID ✅' : 'PENDING PAYOUT ⏳'}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Referred {winner.referralCount || 5} friends • Completed {dateStr}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {cleanPhone && (
                                            <a
                                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${winner.userName}! Re: your Market-U ₦1,000 Referral Giveaway reward:`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{
                                                    backgroundColor: '#25D366',
                                                    color: '#fff',
                                                    padding: '0.45rem 0.8rem',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: '700',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem'
                                                }}
                                            >
                                                <MessageCircle size={14} /> WhatsApp
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleTogglePayout(winner)}
                                            disabled={isBusy}
                                            className={`btn ${isPaid ? 'btn-secondary' : 'btn-primary'}`}
                                            style={{
                                                padding: '0.45rem 0.85rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: '800'
                                            }}
                                        >
                                            {isBusy ? 'Saving...' : isPaid ? 'Mark as Pending' : 'Mark as Paid ₦1,000'}
                                        </button>
                                    </div>
                                </div>

                                {/* Bank Details Box */}
                                <div style={{
                                    backgroundColor: 'var(--surface-elevated)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '0.875rem 1rem',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                            <Building2 size={14} />
                                            BANK ACCOUNT FOR TRANSFER
                                        </div>

                                        {bank?.accountNumber && (
                                            <button
                                                onClick={() => handleCopy(bank.accountNumber, winner.id)}
                                                className="btn btn-ghost"
                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                            >
                                                {copiedKey === winner.id ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                                                {copiedKey === winner.id ? 'Copied Account!' : 'Copy Account'}
                                            </button>
                                        )}
                                    </div>

                                    {bank ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bank:</span>
                                                <div style={{ fontWeight: '700' }}>{bank.bankName || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Account Number:</span>
                                                <div style={{ fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{bank.accountNumber || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Account Name:</span>
                                                <div style={{ fontWeight: '700' }}>{bank.accountName || 'N/A'}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ color: '#ca8a04', fontSize: '0.8125rem', fontWeight: '600' }}>
                                            ⏳ Student has not submitted their bank details yet. You can chat them on WhatsApp via the button above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Settings Modal ── */}
            {showSettings && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    zIndex: 2500
                }}>
                    <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                            Giveaway Settings
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                            Adjust budget limit and reward parameters:
                        </p>

                        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                                    Budget Cap (Max Winners)
                                </label>
                                <input
                                    type="number"
                                    value={capInput}
                                    onChange={(e) => setCapInput(e.target.value)}
                                    min="1"
                                    max="500"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Max budget: ₦{(capInput * rewardInput).toLocaleString()}
                                </span>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.35rem', display: 'block' }}>
                                    Reward Amount (₦)
                                </label>
                                <input
                                    type="number"
                                    value={rewardInput}
                                    onChange={(e) => setRewardInput(e.target.value)}
                                    min="100"
                                    step="100"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <input
                                    type="checkbox"
                                    id="activeGiveaway"
                                    checked={activeInput}
                                    onChange={(e) => setActiveInput(e.target.checked)}
                                    style={{ width: 'auto' }}
                                />
                                <label htmlFor="activeGiveaway" style={{ fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' }}>
                                    Giveaway Program Active
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSettings(false)}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSettings}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    {savingSettings ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminGiveaway;
