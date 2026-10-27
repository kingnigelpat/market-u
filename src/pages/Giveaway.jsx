import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    generateReferralCode,
    getReferralProgress,
    listUserReferrals,
    submitWinnerBankDetails,
    getGiveawayConfig
} from '../utils/referralService';
import {
    ArrowLeft, Gift, Share2, Copy, Check, Users, Sparkles,
    ShieldCheck, CheckCircle2
} from 'lucide-react';

const Giveaway = () => {
    const navigate = useNavigate();
    const { currentUser, isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState({ count: 0, target: 5, isWinner: false, payoutStatus: 'In Progress', winnerDoc: null });
    const [referrals, setReferrals] = useState([]);
    const [copied, setCopied] = useState(false);
    const [config, setConfig] = useState({ budgetCap: 50, rewardAmount: 1000, active: true });

    // Bank details state
    const [bankForm, setBankForm] = useState({
        bankName: '',
        accountNumber: '',
        accountName: ''
    });
    const [savingBank, setSavingBank] = useState(false);
    const [bankSuccess, setBankSuccess] = useState(false);
    const [bankError, setBankError] = useState('');

    const userReferralCode = currentUser ? generateReferralCode(currentUser.uid) : '';
    const shareLink = `${window.location.origin}/register?ref=${userReferralCode}`;

    useEffect(() => {
        if (!isAuthenticated) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const [prog, list, cfg] = await Promise.all([
                    getReferralProgress(currentUser.uid),
                    listUserReferrals(currentUser.uid),
                    getGiveawayConfig()
                ]);

                setProgress(prog);
                setReferrals(list);
                setConfig(cfg);

                if (prog.winnerDoc?.bankDetails) {
                    setBankForm({
                        bankName: prog.winnerDoc.bankDetails.bankName || '',
                        accountNumber: prog.winnerDoc.bankDetails.accountNumber || '',
                        accountName: prog.winnerDoc.bankDetails.accountName || ''
                    });
                }
            } catch (err) {
                console.error('Error loading giveaway data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentUser, isAuthenticated]);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(userReferralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.warn('Copy code failed:', err);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.warn('Copy link failed:', err);
        }
    };

    const handleWhatsAppShare = () => {
        const text = `Hey! 🛍️ Use my promo code *${userReferralCode}* on Market-U to buy or sell anything on campus safely.\n\nSign up here with my code:\n${shareLink}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Market-U Campus Marketplace',
                    text: `Use my promo code ${userReferralCode} to join Market-U!`,
                    url: shareLink
                });
            } catch (err) {
                if (err.name !== 'AbortError') console.warn(err);
            }
        } else {
            handleCopyLink();
        }
    };

    const handleSaveBank = async (e) => {
        e.preventDefault();
        setBankError('');
        setBankSuccess(false);

        if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim() || !bankForm.accountName.trim()) {
            setBankError('Please fill in Bank Name, Account Number, and Account Name.');
            return;
        }

        if (bankForm.accountNumber.trim().length !== 10 || isNaN(bankForm.accountNumber.trim())) {
            setBankError('Account number must be a valid 10-digit NUBAN.');
            return;
        }

        setSavingBank(true);
        try {
            await submitWinnerBankDetails(currentUser.uid, bankForm);
            setBankSuccess(true);
            const updatedProg = await getReferralProgress(currentUser.uid);
            setProgress(updatedProg);
        } catch (err) {
            setBankError(err.message || 'Failed to save bank details.');
        } finally {
            setSavingBank(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container" style={{ maxWidth: '560px', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem', color: 'var(--primary)'
                }}>
                    <Gift size={32} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.75rem' }}>
                    Invite 5 Friends, Win ₦1,000!
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                    Sign in to get your exclusive referral promo code, track your invited friends in real-time, and claim your cash reward.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                        Log In
                    </Link>
                    <Link to="/register" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem' }}>
                        Register
                    </Link>
                </div>
            </div>
        );
    }

    const percentage = Math.min(100, Math.round((progress.count / 5) * 100));
    const remaining = Math.max(0, 5 - progress.count);

    return (
        <div className="container" style={{ maxWidth: '680px', padding: '1.5rem 1rem 4rem' }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="btn btn-ghost"
                    style={{ padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
                        Invite & Earn ₦1,000
                    </h1>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Verified Campus Referral Giveaway
                    </span>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading your referral tracker...
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* ── Main Progress Hero Card ── */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
                        color: '#fff',
                        borderRadius: 'var(--radius-2xl)',
                        padding: '1.75rem',
                        boxShadow: '0 12px 30px -8px rgba(37, 99, 235, 0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute', top: '-20px', right: '-20px',
                            width: '120px', height: '120px', borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            pointerEvents: 'none'
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Sparkles size={18} color="#fde047" />
                            <span style={{ fontSize: '0.8125rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fde047' }}>
                                Student Giveaway
                            </span>
                        </div>

                        <h2 style={{ fontSize: '1.65rem', fontWeight: '900', lineHeight: '1.2', marginBottom: '0.5rem' }}>
                            Invite 5 Friends, Get ₦{config.rewardAmount?.toLocaleString()} Cash
                        </h2>

                        <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.9375rem', lineHeight: '1.5', margin: '0 0 1.25rem' }}>
                            Every student you invite who uses your promo code and browses a listing counts toward your cash reward. Paid directly to your bank account!
                        </p>

                        {/* Progress Bar Container */}
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: 'var(--radius-xl)',
                            padding: '1rem 1.25rem',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                                <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>
                                    {progress.count} of 5 Friends Joined
                                </span>
                                <span style={{
                                    backgroundColor: progress.isWinner ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                                    color: '#fff',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: '800'
                                }}>
                                    {progress.isWinner ? 'GOAL ACHIEVED 🎉' : `${remaining} left`}
                                </span>
                            </div>

                            {/* Meter Bar */}
                            <div style={{
                                width: '100%',
                                height: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '999px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    backgroundColor: progress.isWinner ? '#22c55e' : '#fde047',
                                    borderRadius: '999px',
                                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                }} />
                            </div>

                            <p style={{ margin: '0.65rem 0 0', fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                                {progress.isWinner
                                    ? 'Awesome job! You reached 5 friends. Submit your bank account details below to receive payment.'
                                    : `Share your promo code with ${remaining} more friend${remaining === 1 ? '' : 's'} on WhatsApp to unlock your ₦1,000!`}
                            </p>
                        </div>
                    </div>

                    {/* ── Promo Code & Share Card ── */}
                    <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Your Exclusive Promo Code
                        </span>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--surface-elevated)',
                            padding: '0.875rem 1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            border: '1.5px dashed var(--primary)',
                            margin: '0.75rem 0 1.25rem'
                        }}>
                            <div>
                                <span style={{ fontSize: '1.35rem', fontWeight: '900', letterSpacing: '0.08em', color: 'var(--primary)' }}>
                                    {userReferralCode}
                                </span>
                            </div>
                            <button
                                onClick={handleCopyCode}
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem', fontSize: '0.875rem' }}
                            >
                                {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy Code'}
                            </button>
                        </div>

                        {/* WhatsApp & Share Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                            <button
                                onClick={handleWhatsAppShare}
                                className="btn"
                                style={{
                                    backgroundColor: '#25D366',
                                    color: '#fff',
                                    fontWeight: '800',
                                    padding: '0.85rem 1.25rem',
                                    borderRadius: 'var(--radius-lg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.6rem',
                                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)'
                                }}
                            >
                                <Share2 size={18} /> Share on WhatsApp
                            </button>
                            <button
                                onClick={handleNativeShare}
                                className="btn btn-secondary"
                                style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Share Link"
                            >
                                <Copy size={18} />
                            </button>
                        </div>
                    </div>

                    {/* ── Winner Payout Section (When 5 reached) ── */}
                    {progress.isWinner && (
                        <div className="card" style={{
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-xl)',
                            border: '2px solid var(--success)',
                            backgroundColor: 'rgba(34, 197, 94, 0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--success)'
                                }}>
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>
                                        ₦1,000 Cash Reward Unlocked!
                                    </h3>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        Status: <strong style={{ color: progress.payoutStatus === 'Paid' ? 'var(--success)' : '#eab308' }}>
                                            {progress.payoutStatus === 'Paid' ? 'Paid to Your Account ✅' : 'Pending Admin Transfer ⏳'}
                                        </strong>
                                    </span>
                                </div>
                            </div>

                            {progress.payoutStatus === 'Paid' ? (
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--success)',
                                    fontSize: '0.9rem',
                                    fontWeight: '700'
                                }}>
                                    🎉 Your ₦1,000 giveaway reward has been paid out! Thank you for inviting students to Market-U.
                                </div>
                            ) : (
                                <form onSubmit={handleSaveBank} style={{ marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        Enter your Nigerian bank account details so our admin can send your ₦1,000 reward:
                                    </p>

                                    {bankError && (
                                        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: '600' }}>
                                            ⚠️ {bankError}
                                        </div>
                                    )}

                                    {bankSuccess && (
                                        <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: '600' }}>
                                            ✅ Bank details saved successfully! The admin will review and transfer your reward.
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem', display: 'block' }}>
                                                Bank Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. OPay, Moniepoint, Kuda, GTBank, Zenith"
                                                value={bankForm.bankName}
                                                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem', display: 'block' }}>
                                                Account Number (10 digits)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 8012345678"
                                                maxLength={10}
                                                value={bankForm.accountNumber}
                                                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem', display: 'block' }}>
                                                Account Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. John Okon"
                                                value={bankForm.accountName}
                                                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)' }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingBank}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '0.8rem' }}
                                    >
                                        {savingBank ? 'Saving details...' : 'Submit Bank Details for Payout'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ── Friends You Invited List ── */}
                    <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={18} color="var(--primary)" />
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0 }}>
                                    Invited Friends ({referrals.length})
                                </h3>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                {progress.count} qualified
                            </span>
                        </div>

                        {referrals.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem 1rem',
                                color: 'var(--text-secondary)',
                                background: 'var(--surface-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px dashed var(--border)'
                            }}>
                                <Users size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                                    No friends have signed up with your promo code yet.<br />
                                    Tap <strong>Share on WhatsApp</strong> above to invite your course mates!
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {referrals.map((ref, idx) => {
                                    const isQualified = ref.status === 'qualified';
                                    const dateStr = ref.createdAt?.toDate ? ref.createdAt.toDate().toLocaleDateString('en-GB') : 'Recently';

                                    return (
                                        <div
                                            key={ref.id || idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.75rem 1rem',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: 'var(--surface-elevated)',
                                                border: '1px solid var(--border)'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--text)' }}>
                                                    Friend #{idx + 1}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                    Joined {dateStr}
                                                </div>
                                            </div>

                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                padding: '0.25rem 0.65rem',
                                                borderRadius: '999px',
                                                backgroundColor: isQualified ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                                                color: isQualified ? 'var(--success)' : '#ca8a04',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.3rem'
                                            }}>
                                                {isQualified ? 'Active & Qualified ✅' : 'Joined (Needs to view item) ⏳'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Giveaway Rules & Anti-Fraud Transparency ── */}
                    <div style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.6'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', color: 'var(--text)', marginBottom: '0.5rem' }}>
                            <ShieldCheck size={16} color="var(--primary)" />
                            Fair Play & Payout Rules
                        </div>
                        <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                            <li>Your friends must sign up using your promo code and view at least 1 product on campus.</li>
                            <li>Self-referrals, clone accounts, and duplicate devices are automatically blocked.</li>
                            <li>One ₦1,000 cash reward per student account.</li>
                            <li>Budget cap: limited to the first {config.budgetCap} verified student winners.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Giveaway;
