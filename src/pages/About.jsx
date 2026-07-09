import { Building2, Users, Globe, ArrowRight, Shield, Zap, Smartphone, Sparkles, GraduationCap, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="about-page">
      <div className="container">
        <div className="about-hero">
          <div className="about-hero-badge">
            <Sparkles size={14} />
            <span>MarketU</span>
          </div>
          <h1 className="about-hero-title">
            About <span className="text-gradient">MarketU</span>
          </h1>
          <p className="about-hero-sub">
            The campus marketplace built by students, for students.
          </p>
        </div>

        <div className="about-grid">
          <div className="about-main-card">
            <span className="about-section-eyebrow">Our Story</span>
            <h2>Built by students,<br />for students.</h2>
            <p>
              MarketU is a campus marketplace platform <strong>created and owned by Rae Company</strong> — 
              a digital innovation hub building tools that connect students and make campus life easier.
            </p>
            <p>
              We believe in safe, verified, and instant transactions between students. 
              Every seller is verified, every item is local, and every transaction is designed 
              to happen face-to-face on campus. No shipping, no scams, no strangers.
            </p>
            <div className="about-mission">
              <div className="about-mission-item">
                <Shield size={20} />
                <div>
                  <h4>Safety First</h4>
                  <p>Every seller is verified as a real student before they can list items.</p>
                </div>
              </div>
              <div className="about-mission-item">
                <Zap size={20} />
                <div>
                  <h4>Lightning Fast</h4>
                  <p>Get notified instantly when a buyer is interested — no more waiting.</p>
                </div>
              </div>
              <div className="about-mission-item">
                <Smartphone size={20} />
                <div>
                  <h4>Always Accessible</h4>
                  <p>Install as a PWA for a native-like experience on any device.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="about-sidebar">
            <div className="about-brand-card">
              <div className="about-brand-icon-wrap">
                <Building2 size={28} />
              </div>
              <h3>Rae Company</h3>
              <p>Building the future of digital connectivity and campus tools for African students.</p>
              <div className="about-brand-stats">
                <div className="about-bs-item">
                  <span className="about-bs-num">1+</span>
                  <span className="about-bs-label">Schools</span>
                </div>
                <div className="about-bs-item">
                  <span className="about-bs-num">500+</span>
                  <span className="about-bs-label">Students</span>
                </div>
                <div className="about-bs-item">
                  <span className="about-bs-num">1.2k+</span>
                  <span className="about-bs-label">Items</span>
                </div>
              </div>
              <a href="https://raehub.live/" target="_blank" rel="noopener noreferrer" className="about-brand-link">
                Visit Website <ArrowRight size={14} />
              </a>
            </div>

            <div className="about-cta-card">
              <GraduationCap size={24} />
              <h4>More schools joining soon</h4>
              <p>We're expanding to more campuses. Want yours?</p>
              <Link to="/register" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Get Started <ShoppingBag size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .about-page {
          min-height: 100vh;
          background: var(--bg);
          padding: 3rem 0 5rem;
        }

        .about-hero {
          text-align: center;
          padding: 2rem 0 3rem;
        }

        .about-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          background: var(--primary-light);
          border: 1px solid var(--primary-light);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1.25rem;
        }

        .about-hero-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 0.75rem;
        }

        .about-hero-sub {
          color: var(--text-secondary);
          font-size: 1.0625rem;
          max-width: 440px;
          margin: 0 auto;
        }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .about-main-card {
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
        }

        .about-main-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: var(--gradient-primary);
        }

        .about-section-eyebrow {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--primary);
          background: var(--primary-light);
          padding: 0.3rem 1rem;
          border-radius: var(--radius-full);
          margin-bottom: 1rem;
        }

        .about-main-card h2 {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
          line-height: 1.15;
          margin-bottom: 1.25rem;
        }

        .about-main-card p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          line-height: 1.7;
          margin-bottom: 1rem;
          max-width: 560px;
        }

        .about-main-card p strong {
          color: var(--primary);
          font-weight: 700;
        }

        .about-mission {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }

        .about-mission-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          transition: all 0.2s;
        }

        .about-mission-item:hover {
          border-color: var(--primary-light);
        }

        .about-mission-item svg {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .about-mission-item h4 {
          font-weight: 700;
          font-size: 0.9375rem;
          color: var(--text);
          margin-bottom: 0.125rem;
        }

        .about-mission-item p {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .about-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .about-brand-card {
          background: var(--gradient-primary);
          border-radius: var(--radius-2xl);
          padding: 2.5rem 2rem;
          color: white;
          text-align: center;
        }

        .about-brand-icon-wrap {
          width: 64px;
          height: 64px;
          background: rgba(255,255,255,0.15);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }

        .about-brand-card h3 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.625rem;
        }

        .about-brand-card > p {
          font-size: 0.875rem;
          opacity: 0.85;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          max-width: 280px;
          margin-left: auto;
          margin-right: auto;
        }

        .about-brand-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .about-bs-item {
          text-align: center;
        }

        .about-bs-num {
          display: block;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.25rem;
          line-height: 1.2;
        }

        .about-bs-label {
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.7;
          font-weight: 600;
        }

        .about-brand-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1.5rem;
          background: rgba(255,255,255,0.15);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          text-decoration: none;
          transition: background 0.2s;
        }

        .about-brand-link:hover {
          background: rgba(255,255,255,0.25);
        }

        .about-cta-card {
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          text-align: center;
        }

        .about-cta-card svg {
          color: var(--accent);
          margin-bottom: 0.75rem;
        }

        .about-cta-card h4 {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.125rem;
          color: var(--text);
          margin-bottom: 0.375rem;
        }

        .about-cta-card p {
          color: var(--text-secondary);
          font-size: 0.8125rem;
          margin-bottom: 1.25rem;
        }

        @media (min-width: 768px) {
          .about-grid {
            grid-template-columns: 1.3fr 0.7fr;
          }
        }

        @media (max-width: 480px) {
          .about-main-card {
            padding: 1.5rem;
          }
          .about-brand-stats {
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default About;
