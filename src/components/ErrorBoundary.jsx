import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        // If it's a dynamic import / chunk failure, auto-reload once
        if (
            error?.message?.includes('dynamically imported module') ||
            error?.message?.includes('Loading chunk') ||
            error?.name === 'ChunkLoadError'
        ) {
            const lastReload = sessionStorage.getItem('chunk_reload_ts');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('chunk_reload_ts', now.toString());
                window.location.reload();
            }
        }
    }

    handleReload = () => {
        sessionStorage.removeItem('chunk_reload_ts');
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text)',
                    backgroundColor: 'var(--bg)',
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger, #ef4444)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.75rem',
                        marginBottom: '1rem',
                    }}>
                        ⚠️
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '380px', marginBottom: '1.5rem' }}>
                        An unexpected issue occurred. Tap below to reload the app with the latest updates.
                    </p>
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '0.75rem 1.75rem',
                            borderRadius: '99px',
                            background: 'var(--gradient-primary)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px var(--primary-glow)',
                        }}
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
