import { useState, useEffect } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'notif_banner_dismissed_at';
const REDISPLAY_DAYS = 7; // re-show the banner after 7 days if still not granted

/**
 * EnableNotificationsBanner
 *
 * A slim, dismissible banner shown on the Home page to ALL logged-in buyers.
 * Uses a "public allow" framing — "Stay in the loop" — without being pushy.
 *
 * Props:
 *  - onAllow: async function — calls requestNotificationPermission
 */
const EnableNotificationsBanner = ({ onAllow }) => {
    const [visible, setVisible] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | loading | success

    useEffect(() => {
        // Don't show if already granted or not supported
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') return;
        if (Notification.permission === 'denied') return; // can't re-ask if denied

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem(STORAGE_KEY);
        if (dismissedAt) {
            const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / 86400000;
            if (diffDays < REDISPLAY_DAYS) return;
        }

        // Delay appearance so page loads first
        const t = setTimeout(() => setVisible(true), 3000);
        return () => clearTimeout(t);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    };

    const handleAllow = async () => {
        setStatus('loading');
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await onAllow();
                setStatus('success');
                setTimeout(() => setVisible(false), 2000);
            } else {
                handleDismiss();
            }
        } catch {
            handleDismiss();
        }
    };

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '70px', // below navbar
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(96vw, 520px)',
            zIndex: 900,
            animation: 'bannerSlideDown 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                border: '1px solid rgba(99,179,237,0.25)',
                borderRadius: '1rem',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                color: '#fff',
            }}>
                {/* Icon */}
                <div style={{
                    flexShrink: 0,
                    width: '38px', height: '38px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(59,130,246,0.5)',
                }}>
                    <Bell size={18} color="#fff" />
                </div>

                {/* Text */}
                {status === 'success' ? (
                    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>
                        🎉 Notifications enabled! You're all set.
                    </span>
                ) : (
                    <span style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.4 }}>
                        <strong>Stay in the loop!</strong>
                        <span style={{ opacity: 0.8 }}> Get alerts for hot new campus deals.</span>
                    </span>
                )}

                {/* CTA Button */}
                {status !== 'success' && (
                    <button
                        onClick={handleAllow}
                        disabled={status === 'loading'}
                        style={{
                            flexShrink: 0,
                            padding: '0.45rem 0.85rem',
                            background: status === 'loading'
                                ? 'rgba(59,130,246,0.4)'
                                : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            border: 'none',
                            borderRadius: '0.6rem',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 10px rgba(59,130,246,0.4)',
                        }}
                    >
                        {status === 'loading' ? 'Enabling…' : <>Enable <ChevronRight size={14} /></>}
                    </button>
                )}

                {/* Dismiss X */}
                {status !== 'success' && (
                    <button
                        onClick={handleDismiss}
                        style={{
                            flexShrink: 0,
                            background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', padding: '0.2rem',
                            display: 'flex', alignItems: 'center',
                        }}
                        aria-label="Dismiss notification banner"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <style>{`
                @keyframes bannerSlideDown {
                    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                    to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default EnableNotificationsBanner;
