import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Compass,
    ShieldCheck,
    MessageCircle,
    Store,
    ArrowRight,
    ArrowLeft,
    X,
    Bell,
    Bookmark,
    CheckCircle2,
    GraduationCap,
    LayoutDashboard,
    ShoppingBag
} from 'lucide-react';

const TOUR_STEPS = [
    {
        icon: Compass,
        color: '#2563EB',
        bg: 'rgba(37, 99, 235, 0.12)',
        title: 'Browse Your Campus & Nearby Schools',
        desc: 'Filter deals by your exact university, or switch to the Delta State & Edo State clusters to find gadgets, textbooks, clothes, and hostel essentials from students near you.',
        tip: 'Use the campus chips at the top of the home feed to switch anytime.',
    },
    {
        icon: ShieldCheck,
        color: '#059669',
        bg: 'rgba(16, 185, 129, 0.14)',
        title: 'Chat Sellers & Inspect Before Paying',
        desc: 'Message any seller right inside Market-U, confirm availability, and meet in a public spot on campus to inspect your item before you pay.',
        tip: 'Look for the Blue Verified Badge and ✓ Completed Sales count on seller profiles.',
    },
    {
        icon: MessageCircle,
        color: '#7C3AED',
        bg: 'rgba(124, 58, 237, 0.12)',
        title: 'Check Campus Gist & Student Reviews',
        desc: 'Tap Gist to read honest student product reviews, vote in campus polls, and stay plugged into what is trending across Delta & Edo universities.',
        tip: 'Always check student reviews on a product before you buy.',
    },
    {
        icon: Store,
        color: '#D97706',
        bg: 'rgba(245, 158, 11, 0.14)',
        title: 'Sell Your Stuff Free & Get Verified',
        desc: 'Got extra textbooks, clothes, electronics, or a side-hustle? Post listings for free, manage inquiries in your Messages inbox, and verify your student ID in Profile.',
        tip: 'Turn on Push Notifications in Profile so you never miss a buyer message.',
    },
];

const WelcomeOverlay = () => {
    const { isAuthenticated, userName, userSchoolName, isSeller } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState(null); // 'signup' | 'login' | null
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) return;
        // Wait until user leaves /login or /register
        if (location.pathname === '/login' || location.pathname === '/register') return;
        const stored = sessionStorage.getItem('marketu_welcome_mode');
        if (stored === 'signup' || stored === 'login') {
            sessionStorage.removeItem('marketu_welcome_mode');
            setMode(stored);
            setStep(0);
        }
    }, [isAuthenticated, location.pathname]);

    if (!mode) return null;

    const firstName = (userName || 'Student').trim().split(' ')[0];
    const close = () => setMode(null);
    const go = (path) => {
        setMode(null);
        navigate(path);
    };

    // ── RETURNING USER: WELCOME BACK ──────────────────────────────────────────
    if (mode === 'login') {
        return (
            <div
                onClick={close}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 3000,
                    background: 'rgba(15, 23, 42, 0.72)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="animate-fade-in-up"
                    style={{
                        width: '100%',
                        maxWidth: '430px',
                        borderRadius: '24px',
                        background: 'var(--surface-elevated)',
                        border: '1.5px solid var(--border)',
                        boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.45)',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {/* Top Gradient Header */}
                    <div style={{
                        padding: '1.75rem 1.5rem 1.35rem',
                        background: 'var(--gradient-primary)',
                        color: '#ffffff',
                        position: 'relative',
                        textAlign: 'center',
                    }}>
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Close"
                            style={{
                                position: 'absolute',
                                top: '0.9rem',
                                right: '0.9rem',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(255,255,255,0.18)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={17} />
                        </button>

                        <div style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.2)',
                            border: '1.5px solid rgba(255,255,255,0.35)',
                            margin: '0 auto 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '1.45rem',
                        }}>
                            M
                        </div>
                        <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>
                            Welcome back, {firstName}!
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.86rem', color: 'rgba(255,255,255,0.88)' }}>
                            Good to see you again on Market-U{userSchoolName ? ` • ${userSchoolName}` : ''}.
                        </p>
                    </div>

                    {/* Quick Jump Grid */}
                    <div style={{ padding: '1.25rem 1.35rem 1.45rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                            Jump right back in
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.15rem' }}>
                            <button
                                type="button"
                                onClick={() => go('/market')}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <ShoppingBag size={16} color="var(--primary)" /> Browse Deals
                            </button>
                            <button
                                type="button"
                                onClick={() => go('/messages')}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <MessageCircle size={16} color="#059669" /> Messages
                            </button>
                            <button
                                type="button"
                                onClick={() => go('/gist')}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <Compass size={16} color="#7C3AED" /> Campus Gist
                            </button>
                            <button
                                type="button"
                                onClick={() => go(isSeller ? '/dashboard' : '/saved')}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {isSeller ? (
                                    <><LayoutDashboard size={16} color="#D97706" /> Dashboard</>
                                ) : (
                                    <><Bookmark size={16} color="#D97706" /> Saved Items</>
                                )}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={close}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem', borderRadius: '14px' }}
                        >
                            Continue to Market-U <ArrowRight size={17} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── NEW USER SIGN-UP: BIG WELCOME TO MARKET-U + INTERACTIVE WALKTHROUGH ───
    const current = TOUR_STEPS[step];
    const StepIcon = current.icon;
    const isLast = step === TOUR_STEPS.length - 1;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 3000,
                background: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                className="animate-fade-in-up"
                style={{
                    width: '100%',
                    maxWidth: '490px',
                    borderRadius: '26px',
                    background: 'var(--surface-elevated)',
                    border: '1.5px solid var(--border)',
                    boxShadow: '0 30px 70px -15px rgba(15, 23, 42, 0.55)',
                    overflow: 'hidden',
                }}
            >
                {/* Big Celebratory Hero Header */}
                <div style={{
                    padding: '2rem 1.5rem 1.5rem',
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #0EA5E9 100%)',
                    color: '#ffffff',
                    textAlign: 'center',
                    position: 'relative',
                }}>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Skip tour"
                        style={{
                            position: 'absolute',
                            top: '0.9rem',
                            right: '0.9rem',
                            padding: '0.3rem 0.7rem',
                            borderRadius: '999px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            background: 'rgba(255,255,255,0.14)',
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                        }}
                    >
                        Skip
                    </button>

                    <div style={{
                        width: '62px',
                        height: '62px',
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.2)',
                        border: '2px solid rgba(255,255,255,0.4)',
                        margin: '0 auto 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.75rem',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                    }}>
                        M
                    </div>
                    <h1 style={{ margin: '0 0 0.35rem', fontSize: 'clamp(1.45rem, 5vw, 1.85rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
                        Welcome to Market-U, {firstName}!
                    </h1>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.18)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                    }}>
                        <GraduationCap size={14} /> {userSchoolName || 'Campus Marketplace'} • Quick App Tour ({step + 1}/{TOUR_STEPS.length})
                    </div>
                </div>

                {/* Interactive Walkthrough Body */}
                <div style={{ padding: '1.5rem' }}>
                    <div style={{
                        padding: '1.25rem',
                        borderRadius: '18px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        marginBottom: '1.15rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '13px',
                                background: current.bg,
                                color: current.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <StepIcon size={22} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: current.color }}>
                                    Step {step + 1} of {TOUR_STEPS.length}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--text)' }}>
                                    {current.title}
                                </h3>
                            </div>
                        </div>

                        <p style={{ margin: '0 0 0.85rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                            {current.desc}
                        </p>

                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.45rem',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '10px',
                            background: current.bg,
                            color: current.color,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                        }}>
                            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{current.tip}</span>
                        </div>
                    </div>

                    {/* Progress Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.45rem', marginBottom: '1.15rem' }}>
                        {TOUR_STEPS.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setStep(idx)}
                                aria-label={`Go to step ${idx + 1}`}
                                style={{
                                    width: idx === step ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '999px',
                                    border: 'none',
                                    background: idx === step ? 'var(--primary)' : 'var(--border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    padding: 0,
                                }}
                            />
                        ))}
                    </div>

                    {/* Navigation Controls */}
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={() => setStep((s) => s - 1)}
                                className="btn btn-secondary"
                                style={{ padding: '0.8rem 1rem', borderRadius: '14px', fontWeight: 700 }}
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                        )}
                        {!isLast ? (
                            <button
                                type="button"
                                onClick={() => setStep((s) => s + 1)}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '0.85rem', justifyContent: 'center', borderRadius: '14px', fontWeight: 900, fontSize: '0.95rem' }}
                            >
                                Next Tip <ArrowRight size={17} />
                            </button>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                <button
                                    type="button"
                                    onClick={close}
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '0.88rem', justifyContent: 'center', borderRadius: '14px', fontWeight: 900, fontSize: '0.95rem' }}
                                >
                                    Start Exploring Market-U <ArrowRight size={17} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => go('/profile?welcome=true#notifications')}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', padding: '0.7rem', justifyContent: 'center', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem' }}
                                >
                                    <Bell size={15} /> Turn on Push Alerts in Settings
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeOverlay;
