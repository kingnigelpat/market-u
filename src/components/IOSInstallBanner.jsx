import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Share, PlusSquare, Bell } from 'lucide-react';

/**
 * Detects if the user is on iOS Safari (not installed as PWA).
 * iOS push notifications ONLY work when the app is added to the home screen.
 * Shows a sticky banner guiding sellers to install the PWA.
 */

function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
    return (
        window.navigator.standalone === true || // iOS Safari standalone
        window.matchMedia('(display-mode: standalone)').matches // Android / desktop
    );
}

const IOSInstallBanner = () => {
    const { isSeller, isAuthenticated } = useAuth();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Only show for sellers on iOS Safari who haven't installed the PWA
        if (!isAuthenticated || !isSeller) return;
        if (!isIOS()) return;
        if (isInStandaloneMode()) return; // already installed — don't show
        if (sessionStorage.getItem('ios-banner-dismissed')) return;

        // Small delay so it doesn't pop up instantly on page load
        const t = setTimeout(() => setVisible(true), 2500);
        return () => clearTimeout(t);
    }, [isAuthenticated, isSeller]);

    const dismiss = () => {
        setVisible(false);
        sessionStorage.setItem('ios-banner-dismissed', '1');
    };

    if (!visible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={dismiss}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9990,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(3px)',
                    animation: 'fadeInBanner 0.3s ease',
                }}
            />

            {/* Bottom sheet */}
            <div style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                zIndex: 9991,
                backgroundColor: 'var(--bg)',
                borderRadius: '20px 20px 0 0',
                padding: '1.5rem 1.5rem 2.5rem',
                boxShadow: '0 -12px 40px rgba(0,0,0,0.2)',
                border: '1px solid var(--border)',
                animation: 'slideUpBanner 0.35s cubic-bezier(0.16,1,0.3,1)',
                maxWidth: '500px',
                margin: '0 auto',
            }}>
                {/* Handle */}
                <div style={{
                    width: '40px', height: '4px', borderRadius: '99px',
                    backgroundColor: 'var(--border)',
                    margin: '0 auto 1.25rem',
                }} />

                {/* Close */}
                <button
                    onClick={dismiss}
                    style={{
                        position: 'absolute', top: '1.25rem', right: '1.25rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex', padding: '4px',
                    }}
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <img src="/icon.png" alt="Market-U" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
                    <div>
                        <div style={{ fontWeight: '900', fontSize: '1rem', letterSpacing: '-0.02em' }}>
                            Enable Notifications on iPhone
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            iOS requires installing the app first
                        </div>
                    </div>
                </div>

                {/* Explanation */}
                <div style={{
                    backgroundColor: 'rgba(37,99,235,0.06)',
                    border: '1px solid rgba(37,99,235,0.15)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.875rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                }}>
                    <Bell size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>
                        Apple only allows push notifications for <strong>installed apps</strong>.
                        Add Market-U to your Home Screen so you get instant buyer alerts — even when your phone is locked.
                    </p>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[
                        {
                            num: '1',
                            icon: <Share size={18} style={{ color: 'var(--primary)' }} />,
                            text: <>Tap the <strong>Share</strong> button <span style={{ fontSize: '1.1em' }}>⎙</span> at the bottom of Safari</>,
                        },
                        {
                            num: '2',
                            icon: <PlusSquare size={18} style={{ color: 'var(--primary)' }} />,
                            text: <>Scroll down and tap <strong>"Add to Home Screen"</strong></>,
                        },
                        {
                            num: '3',
                            icon: <Bell size={18} style={{ color: 'var(--primary)' }} />,
                            text: <>Open Market-U from your home screen and <strong>allow notifications</strong></>,
                        },
                    ].map(step => (
                        <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                backgroundColor: 'rgba(37,99,235,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {step.icon}
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                                {step.text}
                            </p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <button
                    onClick={dismiss}
                    style={{
                        width: '100%', padding: '0.875rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white', border: 'none', borderRadius: 'var(--radius-lg)',
                        fontWeight: '700', fontSize: '0.9375rem', cursor: 'pointer',
                        letterSpacing: '-0.01em',
                    }}
                >
                    Got it, I'll install it now
                </button>
            </div>

            <style>{`
                @keyframes fadeInBanner {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes slideUpBanner {
                    from { transform: translateY(100%); }
                    to   { transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

export default IOSInstallBanner;
