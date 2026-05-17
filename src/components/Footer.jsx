import { Link } from 'react-router-dom';
import { Mail, Globe, ArrowRight, Smartphone, Share, Download } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer style={{ 
      backgroundColor: '#0f172a', 
      color: 'white', 
      padding: '4rem 0 2rem 0',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div className="container">
        
        {/* Premium App Install Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '1.5rem',
          padding: '2.5rem',
          marginBottom: '4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative background blur */}
          <div style={{
            position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px',
            background: 'rgba(59, 130, 246, 0.2)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0
          }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '99px', marginBottom: '1.5rem' }}>
              <Smartphone size={16} color="#60a5fa" />
              <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em', color: '#60a5fa', textTransform: 'uppercase' }}>Premium Web App</span>
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1rem', fontFamily: 'Outfit, sans-serif' }}>Install Market-U on your Device</h3>
            <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
              Experience lightning-fast speeds and a native app feel. Install Market-U directly to your home screen without taking up storage space.
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
              {/* iOS Guide */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '280px',
                textAlign: 'left'
              }}>
                <h4 style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Smartphone size={20} color="#94a3b8" /> iOS / Safari
                </h4>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#94a3b8', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li>Tap the <Share size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 0.15rem' }} /> <strong>Share</strong> button</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                </ol>
              </div>

              {/* Android Guide */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.5rem', borderRadius: '1.25rem', width: '100%', maxWidth: '280px',
                textAlign: 'left'
              }}>
                <h4 style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={20} color="#94a3b8" /> Android / Chrome
                </h4>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#94a3b8', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li>Tap the menu <strong>(⋮)</strong> icon</li>
                  <li>Tap <Download size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 0.15rem' }} /> <strong>Install App</strong></li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '3rem',
          marginBottom: '4rem'
        }}>
          {/* Brand Section */}
          <div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '800', 
              marginBottom: '1.25rem',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Market-U
            </h2>
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '0.9375rem', 
              lineHeight: '1.6',
              marginBottom: '1.5rem',
              maxWidth: '300px'
            }}>
              The ultimate campus marketplace for students to buy, sell, and connect safely within their community.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="https://wa.me/2347073544811" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }} onMouseOver={e => e.currentTarget.style.color = '#25D366'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
                <FaWhatsapp size={20} /> <span>Contact Creator</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem' }}>Quick Links</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="/market" style={{ color: '#94a3b8', fontSize: '0.9375rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>Browse Market</Link></li>
              <li><Link to="/register?role=seller" style={{ color: '#94a3b8', fontSize: '0.9375rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>Sell an Item</Link></li>
              <li><Link to="/login" style={{ color: '#94a3b8', fontSize: '0.9375rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>Seller Login</Link></li>
              <li><Link to="/" style={{ color: '#94a3b8', fontSize: '0.9375rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>About Us</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem' }}>Support</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ color: '#94a3b8', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} /> championsmail18@gmail.com</li>
              <li style={{ color: '#94a3b8', fontSize: '0.9375rem' }}>Terms of Service</li>
              <li style={{ color: '#94a3b8', fontSize: '0.9375rem' }}>Privacy Policy</li>
              <li style={{ color: '#94a3b8', fontSize: '0.9375rem' }}>Safety Guidelines</li>
            </ul>
          </div>

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem' }}>Developed By</h3>
            <a href="https://raehub.live" target="_blank" rel="noopener noreferrer" style={{ 
              display: 'block',
              padding: '1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease'
            }} className="partner-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#3b82f6', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Globe size={18} color="white" />
                </div>
                <span style={{ fontWeight: '700', fontSize: '1rem' }}>Rae Company</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>Building the future of digital connectivity and campus tools.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6', fontSize: '0.8125rem', fontWeight: '600' }}>
                Visit Website <ArrowRight size={14} />
              </div>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ 
          paddingTop: '2rem', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '1rem'
        }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            © {new Date().getFullYear()} Market-U. All rights reserved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Powered by</span>
            <a href="https://raehub.live" target="_blank" rel="noopener noreferrer" style={{ 
              fontWeight: '800', 
              fontSize: '0.875rem', 
              letterSpacing: '0.05em',
              color: 'white'
            }}>
              RAE <span style={{ color: '#3b82f6' }}>HUB</span>
            </a>
          </div>
        </div>
      </div>
      
      <style>{`
        .partner-card:hover {
          background-color: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(59, 130, 246, 0.3) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </footer>
  );
};

export default Footer;
