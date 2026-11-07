import { ArrowRight, ShieldCheck, Zap, GraduationCap, ShoppingBag, Building2, Mail, MapPin, CheckCircle2, UserCheck, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { INSTITUTIONS } from '../data/institutions';

const About = () => {
  return (
    <div className="about-page">
      <div className="container">
        <div className="about-hero">
          <div className="about-hero-badge">
            <ShieldCheck size={14} />
            <span>CAC Registered • Rae Tech Services</span>
          </div>
          <h1 className="about-hero-title">
            About <span className="text-gradient">MarketU</span>
          </h1>
          <p className="about-hero-sub">
            The verified student marketplace &amp; campus network connecting 10+ institutions across Delta and Edo State.
          </p>
        </div>

        <div className="about-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="about-main-card">
              <span className="about-section-eyebrow">Our Story &amp; Mission</span>
              <h2>Built for safe, real-world student commerce.</h2>
              <p>
                MarketU is operated by <strong>Rae Tech Services</strong>, a registered technology company in Nigeria
                founded by <strong>Umutite Nigel</strong> to make buying, selling, and campus life safer and easier for university and polytechnic students.
              </p>
              <p>
                Unlike anonymous classified sites where anyone can post and disappear, MarketU is built around
                <strong> verified campus communities across Delta and Edo State</strong>. Every seller profile displays their institution,
                verification status, real system-counted completed sales, and student reviews.
              </p>

              <div className="about-mission">
                <div className="about-mission-item">
                  <UserCheck size={20} />
                  <div>
                    <h4>Verified Student &amp; Campus Sellers</h4>
                    <p>Sellers are verified against their campus identity before earning the Verified Seller badge.</p>
                  </div>
                </div>
                <div className="about-mission-item">
                  <CheckCircle2 size={20} />
                  <div>
                    <h4>Real Track Record &amp; Accountability</h4>
                    <p>Completed sales, star ratings, and Gist product reviews are tracked directly by the system—never faked.</p>
                  </div>
                </div>
                <div className="about-mission-item">
                  <MessageSquare size={20} />
                  <div>
                    <h4>In-App Chat &amp; Direct Reporting</h4>
                    <p>Message sellers inside the app or on WhatsApp, follow our campus safety checklist, and report any suspicious listing in one tap.</p>
                  </div>
                </div>
                <div className="about-mission-item">
                  <Zap size={20} />
                  <div>
                    <h4>100% Free for Students</h4>
                    <p>Browsing, posting items, and seller verification are completely free with 0% commission on student trades.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Institutional Trust & Legal Details Card */}
            <div className="about-trust-card">
              <span className="about-section-eyebrow">Company &amp; Verification Info</span>
              <h3>Who stands behind MarketU?</h3>
              <div className="about-trust-grid">
                <div className="about-trust-item">
                  <Building2 size={18} />
                  <div>
                    <span className="about-trust-label">Registered Business Name (CAC)</span>
                    <strong>Rae Tech Services</strong>
                  </div>
                </div>
                <div className="about-trust-item">
                  <ShieldCheck size={18} />
                  <div>
                    <span className="about-trust-label">Founder &amp; Lead</span>
                    <strong>Umutite Nigel</strong>
                  </div>
                </div>
                <div className="about-trust-item">
                  <MapPin size={18} />
                  <div>
                    <span className="about-trust-label">Active Region</span>
                    <strong>Delta &amp; Edo State, Nigeria (10+ Campuses)</strong>
                  </div>
                </div>
                <div className="about-trust-item">
                  <Mail size={18} />
                  <div>
                    <span className="about-trust-label">Official Support &amp; Partnerships</span>
                    <a href="mailto:team@raehub.live" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none' }}>
                      team@raehub.live
                    </a>
                  </div>
                </div>
              </div>

              {/* Supported Campuses Pills */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                  Active Campus Cluster (Delta &amp; Edo State)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {INSTITUTIONS.map((inst) => (
                    <Link
                      key={inst.name}
                      to={`/market?school=${encodeURIComponent(inst.name)}`}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.35rem 0.75rem',
                        borderRadius: '99px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        textDecoration: 'none'
                      }}
                    >
                      {inst.short || inst.name} • {inst.state}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="about-sidebar">
            <div className="about-brand-card">
              <div className="about-brand-icon-wrap">
                <img src="/rae-logo.png" alt="Rae Tech Services logo" />
              </div>
              <h3>Rae Tech Services</h3>
              <p>Building trusted digital commerce and campus tools for students across Delta, Edo, and Nigeria.</p>
              <div className="about-brand-stats">
                <div className="about-bs-item">
                  <span className="about-bs-num">10+</span>
                  <span className="about-bs-label">Campuses</span>
                </div>
                <div className="about-bs-item">
                  <span className="about-bs-num">2</span>
                  <span className="about-bs-label">States</span>
                </div>
                <div className="about-bs-item">
                  <span className="about-bs-num">0%</span>
                  <span className="about-bs-label">Student Fee</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
                <a href="mailto:team@raehub.live" className="about-brand-link" style={{ width: '100%', justifyContent: 'center' }}>
                  <Mail size={14} /> team@raehub.live
                </a>
                <a href="https://raehub.live/" target="_blank" rel="noopener noreferrer" className="about-brand-link" style={{ width: '100%', justifyContent: 'center' }}>
                  Visit Website <ArrowRight size={14} />
                </a>
              </div>
            </div>

            <div className="about-cta-card">
              <GraduationCap size={24} />
              <h4>Explore our 10+ campuses</h4>
              <p>Switch between your university or browse nearby schools across Delta and Edo State.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <Link to="/schools" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  View Campus Directory
                </Link>
                <Link to="/register" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Get Started <ShoppingBag size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .about-page {
          background: var(--bg);
          padding: 1.5rem 0 2.5rem;
        }

        .about-hero {
          text-align: center;
          padding: 1.25rem 0 2.25rem;
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
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
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
          font-size: 1.02rem;
          max-width: 540px;
          margin: 0 auto;
          line-height: 1.55;
        }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .about-main-card,
        .about-trust-card {
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 2rem;
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

        .about-trust-card h3 {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 1rem;
        }

        .about-trust-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.85rem;
        }

        .about-trust-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }

        .about-trust-item svg {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .about-trust-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
          margin-bottom: 0.15rem;
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
          max-width: 620px;
        }

        .about-main-card p strong {
          color: var(--text);
          font-weight: 700;
        }

        .about-mission {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-top: 1.5rem;
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
          padding: 2.25rem 1.75rem;
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

        .about-brand-icon-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .about-brand-card h3 {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .about-brand-card > p {
          font-size: 0.875rem;
          opacity: 0.88;
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
          opacity: 0.78;
          font-weight: 600;
        }

        .about-brand-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1.25rem;
          background: rgba(255,255,255,0.15);
          border-radius: var(--radius-full);
          font-size: 0.85rem;
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
          color: var(--primary);
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
            grid-template-columns: 1.35fr 0.65fr;
          }
        }

        @media (max-width: 480px) {
          .about-main-card,
          .about-trust-card {
            padding: 1.35rem;
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
