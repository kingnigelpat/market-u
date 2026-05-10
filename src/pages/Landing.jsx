import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import '../styles/landing.css';
import { Search, ShoppingBag, MessageCircle, Tag, CheckCircle2, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from '../components/AuthPromptModal';

const Landing = () => {
    const { currentUser, loading } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (loading) return null; // Avoid flashing landing page while checking auth state 

    if (currentUser) {
        return <Navigate to="/market" replace />;
    }

    return (
        <div className="landing-wrapper">
            {/* Minimal Premium Navbar */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="landing-nav-content">
                    <img src="/logo.png" alt="Market-U" className="landing-logo" />
                    <div className="landing-nav-actions">
                        <button onClick={() => setShowAuthModal(true)} className="btn-nav-login">Log In</button>
                        <button onClick={() => setShowAuthModal(true)} className="btn-nav-signup hide-mobile">Sign Up</button>
                    </div>
                </div>
            </nav>

            <main className="landing-main">
                {/* HERO SECTION */}
                <section className="hero-section">
                    <div className="hero-background-glow"></div>
                    
                    <div className="hero-content">
                        <div className="hero-badge animate-fade-in-up">
                            <span className="live-dot"></span> The #1 Campus Marketplace
                        </div>
                        
                        <h1 className="hero-title animate-fade-in-up delay-100">
                            Find anything on campus in <span className="text-gradient">seconds.</span>
                        </h1>
                        
                        <p className="hero-subtitle animate-fade-in-up delay-200">
                            Stop scrolling WhatsApp groups. Search, connect, and buy from verified sellers around you.
                        </p>
                        
                        <div className="hero-actions animate-fade-in-up delay-300">
                            <button onClick={() => setShowAuthModal(true)} className="btn-hero-primary">
                                <ShoppingBag size={20} /> Start Buying
                            </button>
                            <Link to="/register?role=seller" className="btn-hero-secondary">
                                <Tag size={20} /> Start Selling
                            </Link>
                        </div>
                    </div>

                    {/* HERO VISUAL - Phone Mockup & Floating Cards */}
                    <div className="hero-visual-container animate-fade-in-up delay-400">
                        {/* Floating Card 1 - Left */}
                        <div className="floating-card float-left">
                            <div className="fc-image bg-blue-100">📱</div>
                            <div className="fc-info">
                                <div className="fc-title">iPhone 13 Pro</div>
                                <div className="fc-price">₦850,000</div>
                            </div>
                        </div>

                        {/* Floating Card 2 - Right */}
                        <div className="floating-card float-right">
                            <div className="fc-image bg-orange-100">👟</div>
                            <div className="fc-info">
                                <div className="fc-title">Nike Dunks</div>
                                <div className="fc-price">₦80,000</div>
                            </div>
                        </div>
                        
                        {/* Floating Card 3 - Bottom Left */}
                        <div className="floating-card float-bottom-left">
                            <div className="fc-header">
                                <CheckCircle2 size={16} className="text-success" />
                                <span>Verified Seller</span>
                            </div>
                            <div className="fc-user">
                                <div className="fc-avatar">JD</div>
                                <span>John Doe</span>
                            </div>
                        </div>

                        {/* Center Phone Mockup */}
                        <div className="phone-mockup">
                            <div className="phone-notch"></div>
                            <div className="phone-screen">
                                {/* App UI Mockup */}
                                <div className="mockup-header">
                                    <div className="mockup-greeting">Hey, Alex 👋</div>
                                    <div className="mockup-search">
                                        <Search size={14} color="#94A3B8" />
                                        <span>Search laptops, books...</span>
                                    </div>
                                </div>
                                <div className="mockup-categories">
                                    <div className="m-cat active">All</div>
                                    <div className="m-cat">Tech</div>
                                    <div className="m-cat">Books</div>
                                    <div className="m-cat">Dorm</div>
                                </div>
                                <div className="mockup-feed">
                                    <div className="m-card">
                                        <div className="m-card-img" style={{background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)'}}>💻</div>
                                        <div className="m-card-details">
                                            <div className="m-card-title">MacBook Air M1</div>
                                            <div className="m-card-price">₦900,000</div>
                                        </div>
                                    </div>
                                    <div className="m-card">
                                        <div className="m-card-img" style={{background: 'linear-gradient(135deg, #fef3c7, #fde68a)'}}>📚</div>
                                        <div className="m-card-details">
                                            <div className="m-card-title">Intro to Psych</div>
                                            <div className="m-card-price">₦5,000</div>
                                        </div>
                                    </div>
                                    <div className="m-card">
                                        <div className="m-card-img" style={{background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)'}}>🎧</div>
                                        <div className="m-card-details">
                                            <div className="m-card-title">AirPods Pro</div>
                                            <div className="m-card-price">₦120,000</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mockup-nav">
                                    <div className="m-nav-item active"><Search size={20} /></div>
                                    <div className="m-nav-item"><MessageCircle size={20} /></div>
                                    <div className="m-nav-item"><ShoppingBag size={20} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section - Clean & Minimal */}
                <section className="features-section">
                    <h2 className="section-title">Built for campus life.</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon bg-blue-50 text-blue-600">
                                <Search size={24} />
                            </div>
                            <h3>Search, Don't Scroll</h3>
                            <p>Instantly find what you need without digging through hundreds of chat messages.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon bg-green-50 text-green-600">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3>Verified Students</h3>
                            <p>No scams or fake profiles. Everyone is verified so you can buy with confidence.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon bg-purple-50 text-purple-600">
                                <MessageCircle size={24} />
                            </div>
                            <h3>Instant Connection</h3>
                            <p>Chat directly with sellers and arrange meetups safely on campus.</p>
                        </div>
                    </div>
                </section>

                {/* Install App Section */}
                <section className="install-section">
                    <div className="install-card">
                        <div className="install-content">
                            <h2>Get the Market-U App</h2>
                            <p>Install the web app on your phone for a native experience.</p>
                            <div className="install-steps">
                                <div className="install-step">
                                    <div className="step-number">1</div>
                                    <div className="step-text">Open marketu.store in Safari or Chrome</div>
                                </div>
                                <div className="install-step">
                                    <div className="step-number">2</div>
                                    <div className="step-text">Tap Share (iOS) or Menu (Android)</div>
                                </div>
                                <div className="install-step">
                                    <div className="step-number">3</div>
                                    <div className="step-text">Select "Add to Home Screen"</div>
                                </div>
                            </div>
                        </div>
                        <div className="install-visual">
                            <Smartphone size={120} strokeWidth={1} color="rgba(255,255,255,0.2)" className="absolute-icon" />
                            <div className="app-icon-mockup">
                                <span>MU</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <AuthPromptModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
                message="Join Market-U to start exploring the campus marketplace!"
            />
        </div>
    );
};

export default Landing;
