import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import '../styles/landing.css';
import { Search, ShoppingBag, Tag, CheckCircle2, Smartphone, Zap, Shield, ArrowRight, Star, Users, Package, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from '../components/AuthPromptModal';

const MARQUEE_ITEMS = [
  'MacBook Air M1 — ₦900k',
  'Nike Dunks — ₦80k',
  'Intro to Psych — ₦5k',
  'AirPods Pro — ₦120k',
  'iPhone 13 Pro — ₦850k',
  'Graphic Design — ₦15k',
  'Dorm Mini Fridge — ₦45k',
  'Calculus Textbook — ₦8k',
];

const FloatingShape = ({ delay, size, pos, color }) => (
  <div
    className="floating-shape"
    style={{
      width: size,
      height: size,
      top: pos.top,
      left: pos.left,
      background: color,
      animationDelay: `${delay}s`,
    }}
  />
);

const Landing = () => {
  const { currentUser, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const statsRef = useRef(null);
  const [counts, setCounts] = useState({ students: 0, items: 0, verified: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const target = { students: 500, items: 1200, verified: 100 };
    const duration = 2000;
    const steps = 30;
    const stepTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      setCounts({
        students: Math.min(Math.floor((target.students / steps) * current), target.students),
        items: Math.min(Math.floor((target.items / steps) * current), target.items),
        verified: Math.min(Math.floor((target.verified / steps) * current), target.verified),
      });
      if (current >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  if (loading) return null;
  if (currentUser) return <Navigate to="/market" replace />;

  return (
    <div className="landing-wrapper">
      <div className="landing-bg-grid" />
      <FloatingShape delay={0} size="320px" pos={{ top: '-5%', left: '-8%' }} color="rgba(124,58,237,0.08)" />
      <FloatingShape delay={2} size="260px" pos={{ top: '30%', right: '-5%', left: 'auto' }} color="rgba(245,158,11,0.06)" />
      <FloatingShape delay={4} size="200px" pos={{ top: '60%', left: '10%' }} color="rgba(16,185,129,0.06)" />

      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-content">
          <div className="landing-logo-text">
            <span className="landing-logo-mark">M</span>
            <span className="landing-logo-name">arketU</span>
          </div>
          <div className="landing-nav-actions">
            <button onClick={() => setShowAuthModal(true)} className="btn-nav-login">Log In</button>
            <button onClick={() => setShowAuthModal(true)} className="btn-nav-signup hide-mobile">Get Started <ArrowRight size={14} /></button>
          </div>
        </div>
      </nav>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge animate-fade-in-up">
              <span className="live-dot" />
              <span className="hero-badge-text">Live on campus right now</span>
              <span className="hero-badge-arrow">→</span>
            </div>

            <h1 className="hero-title animate-fade-in-up delay-100">
              Your campus.<br />
              <span className="text-gradient">Your marketplace.</span>
            </h1>

            <p className="hero-subtitle animate-fade-in-up delay-200">
              Buy, sell, and connect with verified students — no more digging through endless WhatsApp groups.
            </p>

            <div className="hero-actions animate-fade-in-up delay-300">
              <button onClick={() => setShowAuthModal(true)} className="btn-hero-primary">
                <ShoppingBag size={20} /> Start Buying
              </button>
              <Link to="/register?role=seller" className="btn-hero-secondary">
                <Tag size={20} /> Start Selling
              </Link>
            </div>

            <div className="hero-stats animate-fade-in-up delay-400">
              <div className="stat-item">
                <Users size={18} className="stat-icon" />
                <div>
                  <div className="stat-number">{counts.students.toLocaleString()}+</div>
                  <div className="stat-label">Active Students</div>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <Package size={18} className="stat-icon" />
                <div>
                  <div className="stat-number">{counts.items.toLocaleString()}+</div>
                  <div className="stat-label">Items Listed</div>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <Shield size={18} className="stat-icon" />
                <div>
                  <div className="stat-number">{counts.verified}%</div>
                  <div className="stat-label">Verified Sellers</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-visual animate-fade-in-up delay-500">
            <div className="hero-bento">
              <div className="bento-card bento-card--large">
                <div className="bento-card-glow" />
                <span className="bento-emoji">💻</span>
                <div className="bento-info">
                  <h4>MacBook Air M1</h4>
                  <div className="bento-price">₦900,000</div>
                  <span className="bento-tag bento-tag--new">Just listed</span>
                </div>
              </div>
              <div className="bento-card">
                <span className="bento-emoji">👟</span>
                <div className="bento-info">
                  <h4>Nike Dunks</h4>
                  <div className="bento-price">₦80,000</div>
                </div>
              </div>
              <div className="bento-card">
                <span className="bento-emoji">📚</span>
                <div className="bento-info">
                  <h4>Intro to Psych</h4>
                  <div className="bento-price">₦5,000</div>
                </div>
              </div>
              <div className="bento-card bento-card--accent">
                <div className="bento-card-glow" />
                <Star size={20} className="bento-accent-icon" />
                <h4>Verified Sellers Only</h4>
                <p>Every student is checked. Buy with confidence.</p>
              </div>
            </div>

            <div className="hero-floating-card hero-floating-card--1">
              <CheckCircle2 size={14} color="#10B981" />
              <span>Safe & Secure</span>
            </div>
            <div className="hero-floating-card hero-floating-card--2">
              <Zap size={14} color="#7C3AED" />
              <span>Instant Chat</span>
            </div>
          </div>
        </section>

        <div className="marquee-section">
          <div className="marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} className="marquee-item">
                <span className="marquee-dot" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <section className="features-section">
          <div className="features-header">
            <span className="features-eyebrow">Why MarketU</span>
            <h2 className="features-title">Built different.<br />Built for you.</h2>
            <p className="features-description">
              We reimagined campus commerce from the ground up — making it safer, faster, and more social.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card-bg" />
              <div className="feature-icon-wrap feature-icon-wrap--purple">
                <Search size={24} />
              </div>
              <h3>Smart Search</h3>
              <p>Find exactly what you need in seconds — laptops, textbooks, fashion, services. No more scrolling endless group chats.</p>
              <div className="feature-card-arrow">
                <ArrowRight size={16} />
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-card-bg" />
              <div className="feature-icon-wrap feature-icon-wrap--green">
                <Shield size={24} />
              </div>
              <h3>Verified Only</h3>
              <p>Every seller is a real student. No scams, no fake profiles — just your campus community, trusted and verified.</p>
              <div className="feature-card-arrow">
                <ArrowRight size={16} />
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-card-bg" />
              <div className="feature-icon-wrap feature-icon-wrap--amber">
                <Zap size={24} />
              </div>
              <h3>Instant Connection</h3>
              <p>Chat directly with sellers and arrange safe meetups right on campus. Fast, simple, and local.</p>
              <div className="feature-card-arrow">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </section>

        <section className="install-section">
          <div className="install-card">
            <div className="install-card-glow" />
            <div className="install-content">
              <span className="install-badge">
                <Sparkles size={14} /> PWA Ready
              </span>
              <h2>Get MarketU on your phone</h2>
              <p>Install as a web app for a native experience — faster browsing, instant notifications, and zero storage wasted.</p>
              <div className="install-steps">
                <div className="install-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <span className="step-title">Open in browser</span>
                    <span className="step-desc">Visit marketu.store in Safari or Chrome</span>
                  </div>
                </div>
                <div className="install-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <span className="step-title">Tap share</span>
                    <span className="step-desc">Share icon on iOS, menu on Android</span>
                  </div>
                </div>
                <div className="install-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <span className="step-title">Add to home screen</span>
                    <span className="step-desc">Done — you&apos;re all set!</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="install-visual">
              <div className="install-phone-mockup">
                <div className="install-phone-notch" />
                <div className="install-phone-screen">
                  <div className="install-phone-header">
                    <span className="install-phone-dot" />
                    <span className="install-phone-dot" />
                    <span className="install-phone-dot" />
                  </div>
                  <div className="install-phone-icon">MU</div>
                  <div className="install-phone-text">MarketU</div>
                  <div className="install-phone-btn">Install</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Join MarketU to start exploring the campus marketplace!"
      />
    </div>
  );
};

export default Landing;
