import { Link, Navigate } from 'react-router-dom';
import '../styles/landing.css';
import { Camera, Search, UserCheck, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
    const { currentUser, loading } = useAuth();

    if (loading) return null; // Avoid flashing landing page while checking auth state 

    if (currentUser) {
        return <Navigate to="/market" replace />;
    }

    return (
        <div className="landing-wrapper">
            <div className="landing-content" style={{ padding: '0 1rem 3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Hero Logo */}
                <div className="animate-fade-in-up" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                    <img src="/logo.png" alt="Market-U Logo" style={{ width: '100%', maxWidth: '180px', objectFit: 'contain' }} />
                </div>

                {/* Main Headline */}
                <div className="animate-fade-in-up delay-100" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: 'clamp(1.75rem, 10vw, 3rem)', fontWeight: '900', lineHeight: '1.05', marginBottom: '1rem', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
                        Find anything on<br />
                        <span style={{ color: 'var(--primary-color)' }}>campus in seconds.</span>
                    </h1>
                    <p style={{ fontSize: 'clamp(1rem, 4vw, 1.125rem)', color: 'var(--text-secondary)', lineHeight: '1.5', maxWidth: '400px', margin: '0 auto' }}>
                        Stop wasting time in group chats. Search and get what you need instantly.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="animate-fade-in-up delay-300" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '320px', marginTop: '0.5rem' }}>
                    <Link to="/market" className="btn-premium" style={{ fontSize: '1rem', padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: '700', textAlign: 'center', boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.3)' }}>
                        Start Searching
                    </Link>
                    <Link to="/register" className="btn-premium-alt" style={{ fontSize: '0.9375rem', padding: '0.875rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--text-primary)', color: 'var(--text-primary)', fontWeight: '700', textAlign: 'center' }}>
                        I Want to Sell
                    </Link>
                </div>

                {/* Pain Points Section */}
                <div className="animate-fade-in-up delay-400" style={{ marginTop: '5rem', width: '100%', maxWidth: '500px', backgroundColor: 'var(--surface-color)', padding: '2.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Tired of group chat chaos?</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>✕</span> Posts get buried in seconds
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>✕</span> Too many untrusted sellers
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>✕</span> Hard to find what you need
                        </li>
                    </ul>
                    <div style={{ padding: '1.25rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--primary-color)', boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', lineHeight: '1.5', margin: 0 }}>
                            Market-U connects you to instant search + verified listings.
                        </p>
                    </div>
                </div>

                {/* Features Section */}
                <div style={{ marginTop: '5rem', width: '100%', maxWidth: '500px' }}>
                    <h2 className="animate-fade-in-up delay-500" style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '2.5rem', textAlign: 'center', letterSpacing: '-0.03em' }}>⚡ WHY MARKET-U?</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass-card animate-fade-in-up delay-500" style={{ padding: '1.75rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                            <div className="icon-box" style={{ width: '48px', height: '48px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                                <Search size={24} color="var(--primary-color)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: '800' }}>Search, Don't Scroll</h3>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Just type what you want. We connect you to what's available nearby instantly.
                            </p>
                        </div>

                        <div className="glass-card animate-fade-in-up delay-500" style={{ padding: '1.75rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                            <div className="icon-box" style={{ width: '48px', height: '48px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                                <UserCheck size={24} color="var(--success-color)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: '800' }}>Verified Sellers</h3>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Only trusted students and sellers. No scams. No guesswork. Just real campus people.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Landing;
