import { Link, useLocation } from 'react-router-dom';
import { Mail, Globe, ArrowRight, Smartphone, Share, Download, Sparkles, Shield, Zap } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  const location = useLocation();
  if (location.pathname === '/') return null;

  return (
    <footer className="app-footer">
      <div className="container">
        <div className="footer-install">
          <div className="footer-install-badge">
            <Sparkles size={14} />
            <span>PWA Ready</span>
          </div>
          <h3>Install MarketU on your device</h3>
          <p>Native app experience without taking up storage. Lightning-fast and always up to date.</p>

          <div className="footer-install-guides">
            <div className="footer-guide-card">
              <div className="footer-guide-icon"><Smartphone size={18} /></div>
              <h4>iOS / Safari</h4>
              <ol>
                <li>Tap the <Share size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Share</strong> button</li>
                <li>Scroll and tap <strong>Add to Home Screen</strong></li>
              </ol>
            </div>
            <div className="footer-guide-card">
              <div className="footer-guide-icon"><Globe size={18} /></div>
              <h4>Android / Chrome</h4>
              <ol>
                <li>Tap the menu <strong>(⋮)</strong> icon</li>
                <li>Tap <Download size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Install App</strong></li>
              </ol>
            </div>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-brand-section">
            <div className="footer-logo">
              <div className="footer-logo-mark">M</div>
              <span>arketU</span>
            </div>
            <p className="footer-tagline">The campus marketplace where students buy, sell, and connect safely.</p>
            <div className="footer-features-mini">
              <div className="footer-feat"><Shield size={14} /> Verified Students</div>
              <div className="footer-feat"><Zap size={14} /> Instant Chat</div>
              <div className="footer-feat"><Smartphone size={14} /> PWA Ready</div>
            </div>
            <a href="https://wa.me/2347073544811" target="_blank" rel="noopener noreferrer" className="footer-whatsapp">
              <FaWhatsapp size={16} /> Contact Creator
            </a>
          </div>

          <div>
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/market">Browse Market</Link></li>
              <li><Link to="/register?role=seller">Sell an Item</Link></li>
              <li><Link to="/login">Seller Login</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="footer-heading">Support</h3>
            <ul className="footer-links">
              <li><Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> championsmail18@gmail.com</li>
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Safety Guidelines</li>
            </ul>
          </div>

          <div>
            <h3 className="footer-heading">Developed By</h3>
            <a href="https://raehub.live/" target="_blank" rel="noopener noreferrer" className="footer-partner">
              <div className="footer-partner-top">
                <div className="footer-partner-icon"><Globe size={16} /></div>
                <span>Rae Company</span>
              </div>
              <p>Building the future of digital connectivity and campus tools.</p>
              <div className="footer-partner-link">Visit Website <ArrowRight size={13} /></div>
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} MarketU. All rights reserved.</p>
          <div className="footer-powered">
            <span>Powered by</span>
            <a href="https://raehub.live/" target="_blank" rel="noopener noreferrer">
              RAE <span>HUB</span>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .app-footer {
          background: var(--text);
          color: #F1F5F9;
          padding: 4rem 0 2rem;
        }

        [data-theme="dark"] .app-footer {
          background: #0A0C12;
          border-top: 1px solid var(--border);
        }

        .footer-install {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-2xl);
          padding: 2.5rem;
          margin-bottom: 3.5rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .footer-install::before {
          content: '';
          position: absolute;
          top: -60%; right: -15%;
          width: 300px; height: 300px;
          background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
          pointer-events: none;
        }

        .footer-install-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid rgba(124, 58, 237, 0.25);
          border-radius: var(--radius-full);
          margin-bottom: 1.25rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #A78BFA;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .footer-install h3 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
        }

        .footer-install > p {
          color: #94A3B8;
          font-size: 0.9375rem;
          max-width: 480px;
          margin: 0 auto 2rem;
          line-height: 1.6;
        }

        .footer-install-guides {
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem;
          justify-content: center;
        }

        .footer-guide-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 1.25rem;
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 260px;
          text-align: left;
          transition: all 0.3s ease;
        }

        .footer-guide-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }

        .footer-guide-icon {
          width: 32px; height: 32px;
          background: rgba(124, 58, 237, 0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #A78BFA;
          margin-bottom: 0.75rem;
        }

        .footer-guide-card h4 {
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 0.75rem;
        }

        .footer-guide-card ol {
          margin: 0;
          padding-left: 1.25rem;
          color: #94A3B8;
          font-size: 0.8125rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 2.5rem;
          margin-bottom: 3rem;
        }

        .footer-brand-section {
          display: flex;
          flex-direction: column;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-bottom: 0.75rem;
        }

        .footer-logo-mark {
          width: 32px; height: 32px;
          background: var(--gradient-primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1rem;
          color: white;
        }

        .footer-logo span {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff, #94A3B8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .footer-tagline {
          color: #94A3B8;
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 1.25rem;
          max-width: 280px;
        }

        .footer-features-mini {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .footer-feat {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: #64748B;
          background: rgba(255, 255, 255, 0.04);
          padding: 0.3rem 0.75rem;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .footer-whatsapp {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #94A3B8;
          font-size: 0.875rem;
          font-weight: 600;
          transition: color 0.2s;
        }
        .footer-whatsapp:hover { color: #25D366; }

        .footer-heading {
          font-size: 0.9375rem;
          font-weight: 700;
          margin-bottom: 1.25rem;
          color: #F1F5F9;
        }

        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .footer-links li, .footer-links a {
          color: #94A3B8;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .footer-links a:hover { color: white; }

        .footer-partner {
          display: block;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-xl);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s;
        }
        .footer-partner:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(124, 58, 237, 0.3);
          transform: translateY(-2px);
        }

        .footer-partner-top {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.5rem;
          font-weight: 700;
          font-size: 0.9375rem;
        }

        .footer-partner-icon {
          width: 30px; height: 30px;
          background: var(--gradient-primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .footer-partner p {
          color: #64748B;
          font-size: 0.8125rem;
          margin-bottom: 0.625rem;
        }

        .footer-partner-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #A78BFA;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .footer-bottom {
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .footer-bottom p {
          color: #64748B;
          font-size: 0.8125rem;
        }

        .footer-powered {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .footer-powered span {
          color: #64748B;
          font-size: 0.8125rem;
        }

        .footer-powered a {
          font-weight: 800;
          font-size: 0.8125rem;
          letter-spacing: 0.04em;
          color: white;
        }
        .footer-powered a span { color: #A78BFA; }
      `}</style>
    </footer>
  );
};

export default Footer;
