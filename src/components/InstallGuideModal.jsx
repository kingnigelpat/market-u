import { useState } from 'react';
import { X, Share, MoreVertical, PlusSquare, Smartphone } from 'lucide-react';

const InstallGuideModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('ios'); // 'ios' or 'android'

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'var(--bg)',
                padding: '2rem 1.5rem',
                borderRadius: 'var(--radius-xl)',
                maxWidth: '450px',
                width: '100%',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        color: 'var(--text-secondary)',
                        padding: '0.5rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        backgroundColor: 'rgba(37, 99, 235, 0.1)', 
                        color: 'var(--primary)', 
                        borderRadius: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: '0 auto 1rem auto' 
                    }}>
                        <Smartphone size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                        Install Market-U App
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Get the best experience. Follow the steps below to add Market-U to your home screen.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--surface)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
                    <button 
                        onClick={() => setActiveTab('ios')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: activeTab === 'ios' ? 'var(--bg)' : 'transparent',
                            color: activeTab === 'ios' ? 'var(--text)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'ios' ? '700' : '500',
                            boxShadow: activeTab === 'ios' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        iPhone / iPad
                    </button>
                    <button 
                        onClick={() => setActiveTab('android')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: activeTab === 'android' ? 'var(--bg)' : 'transparent',
                            color: activeTab === 'android' ? 'var(--text)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'android' ? '700' : '500',
                            boxShadow: activeTab === 'android' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Android
                    </button>
                </div>

                {activeTab === 'ios' ? (
                    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--text)', flexShrink: 0 }}>1</div>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text)', fontWeight: '600' }}>Tap the Share button</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>It's located at the bottom of Safari.</p>
                                <div style={{ marginTop: '0.5rem', color: 'var(--primary)' }}><Share size={24} /></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--text)', flexShrink: 0 }}>2</div>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text)', fontWeight: '600' }}>Tap "Add to Home Screen"</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>You may need to scroll down a bit.</p>
                                <div style={{ marginTop: '0.5rem', color: 'var(--primary)' }}><PlusSquare size={24} /></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--text)', flexShrink: 0 }}>1</div>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text)', fontWeight: '600' }}>Tap the Menu button</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>The three dots at the top right of Chrome.</p>
                                <div style={{ marginTop: '0.5rem', color: 'var(--primary)' }}><MoreVertical size={24} /></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--text)', flexShrink: 0 }}>2</div>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text)', fontWeight: '600' }}>Tap "Add to Home screen"</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Follow the on-screen prompt.</p>
                            </div>
                        </div>
                    </div>
                )}

                <button 
                    onClick={onClose}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem', marginTop: '2rem', borderRadius: 'var(--radius-lg)' }}
                >
                    Got it!
                </button>
            </div>
            <style>
                {`
                    @keyframes modalSlideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};

export default InstallGuideModal;
