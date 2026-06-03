import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/KPQDDICcHGaJ2zpTju3Vx4?mode=gi_t';

const WhatsAppGroupModal = ({ onDismiss }) => {
    const { currentUser } = useAuth();
    const [saving, setSaving] = useState(false);

    const markJoined = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                joinedGroupChat: true,
            });
        } catch (e) {
            console.warn('Could not save joinedGroupChat flag:', e);
        } finally {
            setSaving(false);
            if (onDismiss) onDismiss();
        }
    };

    const handleJoin = () => {
        window.open(WHATSAPP_GROUP_LINK, '_blank');
        markJoined();
    };

    const handleAlreadyJoined = () => {
        markJoined();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
            }}
        >
            <div
                className="animate-fade-in-up"
                style={{
                    background: 'var(--surface-color)',
                    borderRadius: '24px',
                    padding: '2.5rem 2rem',
                    maxWidth: '420px',
                    width: '100%',
                    boxShadow: '0 32px 64px -12px rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-color)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Green top stripe */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #25D366, #128C7E)',
                    borderRadius: '24px 24px 0 0',
                }} />

                {/* WhatsApp Icon */}
                <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto',
                    boxShadow: '0 12px 28px -6px rgba(37, 211, 102, 0.45)',
                }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                </div>

                {/* Headline */}
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '900',
                    letterSpacing: '-0.03em',
                    marginBottom: '0.75rem',
                    color: 'var(--text-primary)',
                }}>
                    Join the Seller Group Chat 📣
                </h2>

                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9375rem',
                    lineHeight: '1.65',
                    marginBottom: '0.75rem',
                }}>
                    All Market-U sellers <strong style={{ color: 'var(--text-primary)' }}>must</strong> join our official WhatsApp group to receive important updates, order alerts, and announcements.
                </p>

                <div style={{
                    backgroundColor: 'rgba(37, 211, 102, 0.08)',
                    border: '1px solid rgba(37, 211, 102, 0.2)',
                    borderRadius: '12px',
                    padding: '0.875rem 1rem',
                    marginBottom: '1.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textAlign: 'left',
                }}>
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🔒</span>
                    <span>This group is <strong style={{ color: 'var(--text-primary)' }}>sellers only</strong>. Buyers cannot join.</span>
                </div>

                {/* Join button */}
                <button
                    onClick={handleJoin}
                    disabled={saving}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '14px',
                        fontSize: '1.0625rem',
                        fontWeight: '700',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        border: 'none',
                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.625rem',
                        marginBottom: '0.875rem',
                        boxShadow: '0 10px 24px -6px rgba(37, 211, 102, 0.45)',
                        transition: 'all 0.2s',
                        opacity: saving ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {saving ? 'Saving...' : 'Join Seller Group Chat'}
                </button>

                {/* Already joined */}
                <button
                    onClick={handleAlreadyJoined}
                    disabled={saving}
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        borderRadius: '14px',
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-color)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                >
                    ✅ I'm already in the group
                </button>
            </div>
        </div>
    );
};

export default WhatsAppGroupModal;
