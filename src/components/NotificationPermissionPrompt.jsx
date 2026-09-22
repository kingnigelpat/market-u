import { useState, useEffect } from 'react';
import { Bell, BellRing, X, Sparkles } from 'lucide-react';

/**
 * NotificationPermissionPrompt
 *
 * A "Trojan Horse" modal shown after a buyer saves a product.
 * The value prop (price drops) makes users *want* to allow notifications.
 *
 * Props:
 *  - onAllow: async function — calls requestNotificationPermission
 *  - onDismiss: function — closes the modal
 */
const NotificationPermissionPrompt = ({ onAllow, onDismiss }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | success | denied

    const handleAllow = async () => {
        setStatus('loading');
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await onAllow();
                setStatus('success');
                setTimeout(() => onDismiss(), 1800);
            } else {
                setStatus('denied');
                setTimeout(() => onDismiss(), 2000);
            }
        } catch {
            setStatus('denied');
            setTimeout(() => onDismiss(), 2000);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onDismiss}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(92vw, 420px)',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)',
                borderRadius: '1.25rem',
                padding: '1.75rem',
                zIndex: 9999,
                boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
                animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                color: '#fff',
            }}>
                {/* Close */}
                <button
                    onClick={onDismiss}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'rgba(255,255,255,0.1)', border: 'none',
                        borderRadius: '50%', width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff',
                    }}
                >
                    <X size={16} />
                </button>

                {/* Icon */}
                <div style={{
                    width: '56px', height: '56px',
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem',
                    boxShadow: '0 0 20px rgba(245,158,11,0.5)',
                    animation: 'pulse 2s infinite',
                }}>
                    <BellRing size={28} color="#fff" />
                </div>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>You're all set!</p>
                        <p style={{ opacity: 0.8, fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            We'll ping you when prices drop.
                        </p>
                    </div>
                ) : status === 'denied' ? (
                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>😕</div>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Permission blocked</p>
                        <p style={{ opacity: 0.8, fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            You can enable it anytime in your browser settings.
                        </p>
                    </div>
                ) : (
                    <>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                            🔔 Never miss a deal again!
                        </h3>
                        <p style={{ opacity: 0.85, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                            You just saved this item. Want us to notify you when the
                            <strong style={{ color: '#fbbf24' }}> price drops</strong> or when
                            <strong style={{ color: '#34d399' }}> similar deals</strong> drop on campus?
                        </p>

                        <div style={{
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '0.75rem',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.25rem',
                            display: 'flex', flexDirection: 'column', gap: '0.4rem',
                        }}>
                            {['💰 Price drop alerts', '🔥 Hot new listings on campus', '📦 Back-in-stock alerts'].map(t => (
                                <div key={t} style={{ fontSize: '0.85rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Sparkles size={13} color="#fbbf24" style={{ flexShrink: 0 }} />
                                    {t}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={onDismiss}
                                style={{
                                    flex: 1, padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '0.75rem', color: '#fff',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                                }}
                            >
                                Not now
                            </button>
                            <button
                                onClick={handleAllow}
                                disabled={status === 'loading'}
                                style={{
                                    flex: 2, padding: '0.75rem',
                                    background: status === 'loading'
                                        ? 'rgba(251,191,36,0.5)'
                                        : 'linear-gradient(135deg, #f59e0b, #f97316)',
                                    border: 'none',
                                    borderRadius: '0.75rem', color: '#fff',
                                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                                    fontWeight: 700, fontSize: '0.9rem',
                                    boxShadow: '0 4px 15px rgba(245,158,11,0.4)',
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '0.4rem',
                                }}
                            >
                                <Bell size={16} />
                                {status === 'loading' ? 'Enabling...' : 'Yes, notify me!'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                    to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; } to { opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.5); }
                    50%       { box-shadow: 0 0 35px rgba(245,158,11,0.8); }
                }
            `}</style>
        </>
    );
};

export default NotificationPermissionPrompt;
