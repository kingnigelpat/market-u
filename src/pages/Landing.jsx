import React from 'react';
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
                <div className="animate-fade-in-up" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <img src="/logo.png" alt="Market-U Hero Logo" style={{ width: '100%', maxWidth: '280px', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }} />
                </div>

                {/* Main Headline */}
                <h1 className="hero-title animate-fade-in-up delay-100" style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1.1', marginBottom: '1.25rem', textAlign: 'center', letterSpacing: '-0.02em', maxWidth: '500px' }}>
                    The Local Marketplace<br />
                    <span className="hero-highlight">Stop scrolling. Just search.</span>
                </h1>

                {/* Subheadline */}
                <p className="animate-fade-in-up delay-200" style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.6', maxWidth: '450px', textAlign: 'center' }}>
                    Find exactly what you need in seconds. Buy fast, sell smarter. Built exactly for your campus experience.
                </p>

                {/* CTA Buttons */}
                <div className="animate-fade-in-up delay-300" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '340px' }}>
                    <Link to="/market" className="btn-premium">
                        Start Browsing Now
                    </Link>
                    <Link to="/register" className="btn-premium-alt">
                        I Want to Sell
                    </Link>
                </div>

                {/* Pain Points Section */}
                <div className="animate-fade-in-up delay-400" style={{ marginTop: '5rem', width: '100%', maxWidth: '500px', backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <h2 style={{ fontSize: '1.375rem', fontWeight: '800', marginBottom: '1.25rem', color: '#111827' }}>Tired of group chat chaos?</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9375rem', color: '#4B5563' }}>
                            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>✕</span> Posts get buried in seconds
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9375rem', color: '#4B5563' }}>
                            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>✕</span> Too many fake or untrusted sellers
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9375rem', color: '#4B5563' }}>
                            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>✕</span> Hard to find what you actually need
                        </li>
                    </ul>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(79, 70, 229, 0.05)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary-color)' }}>
                        <p style={{ fontSize: '0.9375rem', color: '#111827', fontWeight: '600', lineHeight: '1.5', margin: 0 }}>
                            Market-U fixes that by turning everything into instant search + trusted listings.
                        </p>
                    </div>
                </div>

                {/* Features Section */}
                <div style={{ marginTop: '5rem', width: '100%', maxWidth: '500px' }}>
                    <h2 className="animate-fade-in-up delay-500" style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '2rem', textAlign: 'center', letterSpacing: '-0.02em' }}>⚡ FEATURES</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>

                        <div className="glass-card animate-fade-in-up delay-500" style={{ padding: '1.5rem' }}>
                            <div className="icon-box">
                                <Camera size={24} color="#4F46E5" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '700', color: '#111827' }}>📸 Snap & Sell in Seconds</h3>
                            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Take a photo, add price, and go live in under a minute. No friction, no stress.
                            </p>
                        </div>

                        <div className="glass-card animate-fade-in-up delay-500" style={{ padding: '1.5rem' }}>
                            <div className="icon-box" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)' }}>
                                <Search size={24} color="#F59E0B" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '700', color: '#111827' }}>🔍 Search, Don't Scroll</h3>
                            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Just type what you want. Market-U instantly connects you to what's available nearby.
                            </p>
                        </div>

                        <div className="glass-card animate-fade-in-up delay-500" style={{ padding: '1.5rem' }}>
                            <div className="icon-box" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%)' }}>
                                <UserCheck size={24} color="#10B981" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '700', color: '#111827' }}>🤝 Verified Campus Sellers</h3>
                            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Only trusted students and sellers. No scams. No guesswork. Just real people.
                            </p>
                        </div>

                    </div>
                </div>

                {/* Installation Widget */}
                <div className="install-widget animate-fade-in-up delay-500" style={{ marginTop: '5rem', width: '100%', maxWidth: '500px', padding: '2rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <Smartphone size={28} color="#60A5FA" />
                        <h2 style={{ fontSize: '1.375rem', fontWeight: '700', margin: 0 }}>📲 INSTALL</h2>
                    </div>
                    <p style={{ fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: '1.6', color: '#94A3B8' }}>
                        Install Market-U on your phone. Get faster access anytime—no app store needed.
                    </p>
                    <div style={{ textAlign: 'left', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: '#E2E8F0' }}>🍏 iPhone (Safari):</span>
                            <span style={{ color: '#94A3B8' }}>Tap <span style={{ padding: '0.125rem 0.375rem', backgroundColor: '#334155', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>Share</span> → "Add to Home Screen"</span>
                        </div>
                        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: '#E2E8F0' }}>🤖 Android (Chrome):</span>
                            <span style={{ color: '#94A3B8' }}>Tap <span style={{ padding: '0.125rem 0.375rem', backgroundColor: '#334155', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>menu</span> → "Add to Home Screen"</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="animate-fade-in-up delay-500" style={{ marginTop: '4rem', width: '100%', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '2rem 0 1rem 0' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <a href="https://wa.me/2347073544811" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            Contact Support & Verification
                        </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <img src="/icon.png" alt="Market-U" style={{ height: '24px', filter: 'grayscale(100%) opacity(50%)' }} />
                        <span style={{ fontWeight: '600', letterSpacing: '0.02em', color: '#9CA3AF' }}>MARKET-U</span>
                    </div>
                    <p>© {new Date().getFullYear()} Market-U. All rights reserved.</p>
                </footer>

            </div>
        </div>
    );
};

export default Landing;
