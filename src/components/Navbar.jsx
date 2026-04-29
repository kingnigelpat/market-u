import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, User, Store, Sun, Moon } from 'lucide-react';

const Navbar = () => {
    const { isAuthenticated, isSeller, userRole } = useAuth();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out', error);
        }
    };

    return (
        <nav style={{ 
            backgroundColor: 'var(--surface-color)', 
            borderBottom: '1px solid var(--border-color)', 
            padding: '0.75rem 0',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            background: 'var(--nav-bg)'
        }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '900', fontFamily: '"Outfit", sans-serif', fontSize: '1.25rem', color: 'var(--primary-color)' }}>
                    <img src="/icon.png" alt="Market-U Icon" style={{ height: '28px', width: 'auto' }} />
                    <span className="hide-on-mobile">MARKET-U</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Link to="/market" style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-primary)', marginRight: '0.25rem' }}>Market</Link>
                    
                    <button 
                        onClick={toggleTheme} 
                        className="btn" 
                        style={{ 
                            padding: '0.375rem', 
                            color: 'var(--text-secondary)', 
                            backgroundColor: 'rgba(148, 163, 184, 0.1)', 
                            borderRadius: 'var(--radius-md)',
                            marginRight: '0.25rem'
                        }} 
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>

                    {isAuthenticated ? (
                        <>
                            {isSeller && (
                                <Link to="/dashboard" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem', borderRadius: '99px' }}>
                                    <Store size={16} /> <span className="hide-on-mobile">Sell Items</span>
                                </Link>
                            )}
                            <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--primary-color)', padding: '0.25rem 0.75rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                <User size={12} />
                                <span>{userRole}</span>
                            </div>
                            <button onClick={handleLogout} className="btn" style={{ padding: '0.375rem', color: 'var(--danger-color)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)' }} title="Logout">
                                <LogOut size={18} />
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Link to="/login" style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Log in</Link>
                            <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)' }}>Sign up</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
