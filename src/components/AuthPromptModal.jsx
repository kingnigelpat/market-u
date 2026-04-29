import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

const AuthPromptModal = ({ isOpen, onClose, message }) => {
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
                backgroundColor: 'white',
                padding: '2.5rem 2rem',
                borderRadius: 'var(--radius-xl)',
                maxWidth: '400px',
                width: '100%',
                position: 'relative',
                textAlign: 'center',
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
                        padding: '0.5rem'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    backgroundColor: 'rgba(37, 99, 235, 0.1)', 
                    color: 'var(--primary-color)', 
                    borderRadius: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 1.5rem auto' 
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <polyline points="16 11 18 13 22 9" />
                    </svg>
                </div>

                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                    Authentication Required
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                    {message || "Sign up to connect with sellers and start using Market-U"}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Link 
                        to="/register" 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '1rem', fontWeight: '700', borderRadius: 'var(--radius-lg)' }}
                        onClick={onClose}
                    >
                        Sign Up
                    </Link>
                    <Link 
                        to="/login" 
                        className="btn btn-secondary" 
                        style={{ width: '100%', padding: '1rem', fontWeight: '700', borderRadius: 'var(--radius-lg)' }}
                        onClick={onClose}
                    >
                        Log In
                    </Link>
                </div>
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

export default AuthPromptModal;
