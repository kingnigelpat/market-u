import { ShieldCheck, Heart, AlertTriangle, X, Check } from 'lucide-react';

export default function CommunityGuidelinesModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="gist-modal-overlay" onClick={onClose}>
            <div className="gist-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>Gist Community Rules</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Keeping campus vibes fun, safe, and respectful
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="gist-icon-btn" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
                    <div style={{
                        padding: '0.875rem',
                        background: 'rgba(34, 197, 94, 0.08)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                    }}>
                        <Heart size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '0.2rem' }}>
                                Have Fun & Share Relatable Stories
                            </strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                                Debates, hostel chronicles, campus humor, product recommendations, and relatable student moments are what we love!
                            </span>
                        </div>
                    </div>

                    <div style={{
                        padding: '0.875rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                    }}>
                        <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong style={{ display: 'block', color: 'var(--danger)', marginBottom: '0.2rem' }}>
                                Strictly Zero Tolerance for Harassment
                            </strong>
                            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                                <li>No naming or doxxing individual students or phone numbers.</li>
                                <li>No cyberbullying, hate speech, threats, or extortion.</li>
                                <li>No defamatory accusations or sharing non-consensual images.</li>
                            </ul>
                        </div>
                    </div>

                    <div style={{
                        padding: '0.875rem',
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '0.25rem' }}>
                            🎭 Anonymous Posts Notice:
                        </strong>
                        Anonymous posts keep your public identity private from other students, but author IDs are retained privately for moderation. Violations result in instant post removal and account suspension.
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
                    >
                        <Check size={16} /> I Agree & Understand
                    </button>
                </div>
            </div>
        </div>
    );
}
