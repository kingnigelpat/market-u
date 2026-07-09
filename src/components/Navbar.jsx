import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { LogOut, Sun, Moon, Store, User, ChevronDown, ShieldCheck, PlusCircle, Compass, Bell, Settings, Bookmark, LayoutDashboard, Sparkles } from 'lucide-react';

const Navbar = () => {
    const { isAuthenticated, isSeller, userRole, currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [menuOpen, setMenuOpen] = useState(false);
    const [unseenCount, setUnseenCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const menuRef = useRef(null);

    const isLanding = location.pathname === '/';

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!isSeller || !currentUser) { setUnseenCount(0); return; }
        const q = query(
            collection(db, 'interests'),
            where('sellerId', '==', currentUser.uid),
            where('seen', '==', false)
        );
        const unsub = onSnapshot(q, (snap) => setUnseenCount(snap.size), () => {});
        return () => unsub();
    }, [isSeller, currentUser]);

    useEffect(() => {
        if (!isAuthenticated || !currentUser) { setSavedCount(0); return; }
        const q = query(collection(db, 'savedItems'), where('buyerId', '==', currentUser.uid));
        const unsub = onSnapshot(q, snap => setSavedCount(snap.size), () => {});
        return () => unsub();
    }, [isAuthenticated, currentUser]);

    if (isLanding) return null;

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
        setMenuOpen(false);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setMenuOpen(false);
            navigate('/');
        } catch (error) {
            console.error('Error signing out', error);
        }
    };

    return (
        <nav className="app-navbar">
            <div className="container app-navbar-inner">
                <Link to={isAuthenticated ? '/market' : '/'} className="app-navbar-logo">
                    <div className="nav-logo-mark">M</div>
                    <span className="hide-on-mobile nav-logo-text">arketU</span>
                </Link>

                <div className="app-navbar-actions">
                    {isAuthenticated && isSeller && (
                        <div className="hide-on-mobile app-navbar-seller-links">
                            <Link to="/add-product" className="nav-post-btn">
                                <PlusCircle size={14} /> Post
                            </Link>
                            <Link to="/dashboard" className="nav-link">
                                <LayoutDashboard size={16} /> Dashboard
                            </Link>
                            <Link to="/market" className="nav-link nav-link--muted">
                                <Compass size={16} /> Browse
                            </Link>
                        </div>
                    )}

                    {!isAuthenticated ? (
                        <div className="app-navbar-auth">
                            <Link to="/login" className="nav-login-link">Log in</Link>
                            <Link to="/register" className="btn btn-primary nav-signup-btn">Sign up <Sparkles size={12} /></Link>
                        </div>
                    ) : (
                        <div className="app-navbar-user">
                            {isSeller && (
                                <Link to="/notifications" className={`nav-icon-btn ${unseenCount > 0 ? 'nav-icon-btn--active' : ''}`} title="Notifications">
                                    <Bell size={18} className={unseenCount > 0 ? 'bell-ring' : ''} />
                                    {unseenCount > 0 && <span className="nav-badge nav-badge--danger">{unseenCount > 99 ? '99+' : unseenCount}</span>}
                                </Link>
                            )}

                            {isAuthenticated && !isSeller && (
                                <Link to="/saved" className={`nav-icon-btn ${savedCount > 0 ? 'nav-icon-btn--active' : ''}`} title="Saved Items">
                                    <Bookmark size={18} />
                                    {savedCount > 0 && <span className="nav-badge">{savedCount > 99 ? '99+' : savedCount}</span>}
                                </Link>
                            )}

                            <div className="nav-menu-wrap" ref={menuRef}>
                                <button onClick={() => setMenuOpen(prev => !prev)} className={`nav-menu-trigger ${menuOpen ? 'nav-menu-trigger--open' : ''}`}>
                                    <div className={`nav-avatar ${isSeller ? 'nav-avatar--seller' : ''}`}>
                                        {isSeller ? <Store size={14} /> : <User size={14} />}
                                    </div>
                                    <span className="hide-on-mobile nav-role">{userRole || 'Account'}</span>
                                    <ChevronDown size={14} className={`nav-chevron ${menuOpen ? 'nav-chevron--open' : ''}`} />
                                </button>

                                {menuOpen && (
                                    <div className="nav-dropdown">
                                        <div className="nav-dropdown-header">
                                            <div className={`nav-avatar nav-avatar--lg ${isSeller ? 'nav-avatar--seller' : ''}`}>
                                                {isSeller ? <Store size={16} /> : <User size={16} />}
                                            </div>
                                            <div>
                                                <div className="nav-dropdown-role">{userRole}</div>
                                                <div className="nav-dropdown-status">Signed in</div>
                                            </div>
                                        </div>

                                        <button onClick={toggleTheme} className="nav-dropdown-item">
                                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                                            <span className={`nav-theme-pill ${theme === 'dark' ? 'nav-theme-pill--on' : ''}`}>
                                                {theme === 'dark' ? 'ON' : 'OFF'}
                                            </span>
                                        </button>

                                        {!isSeller && (
                                            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="nav-dropdown-item nav-dropdown-item--highlight">
                                                <ShieldCheck size={16} /> Become a Seller
                                                <span className="nav-free-badge">FREE</span>
                                            </Link>
                                        )}

                                        {isSeller && (
                                            <>
                                                <Link to="/notifications" onClick={() => setMenuOpen(false)} className={`nav-dropdown-item ${unseenCount > 0 ? 'nav-dropdown-item--highlight' : ''}`}>
                                                    <Bell size={16} /> Notifications
                                                    {unseenCount > 0 && <span className="nav-badge nav-badge--danger nav-badge--inline">{unseenCount > 99 ? '99+' : unseenCount}</span>}
                                                </Link>
                                                <Link to="/add-product" onClick={() => setMenuOpen(false)} className="nav-dropdown-item nav-dropdown-item--highlight">
                                                    <PlusCircle size={16} /> Post Product
                                                </Link>
                                                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="nav-dropdown-item">
                                                    <LayoutDashboard size={16} /> My Dashboard
                                                </Link>
                                                <Link to="/market" className="mobile-only nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                                                    <Compass size={16} /> Browse Market
                                                </Link>
                                            </>
                                        )}

                                        <Link to="/profile" onClick={() => setMenuOpen(false)} className="nav-dropdown-item">
                                            <Settings size={16} /> Account Settings
                                        </Link>
                                        <Link to="/saved" onClick={() => setMenuOpen(false)} className="nav-dropdown-item">
                                            <Bookmark size={16} /> Saved Items
                                            {savedCount > 0 && <span className="nav-badge nav-badge--inline">{savedCount > 99 ? '99+' : savedCount}</span>}
                                        </Link>

                                        <div className="nav-dropdown-divider" />
                                        <button onClick={handleLogout} className="nav-dropdown-item nav-dropdown-item--danger">
                                            <LogOut size={16} /> Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .app-navbar {
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    padding: 0.625rem 0;
                    background: var(--nav-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border);
                }

                .app-navbar-inner {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .app-navbar-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-decoration: none;
                }

                .nav-logo-mark {
                    width: 32px;
                    height: 32px;
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

                .nav-logo-text {
                    font-family: var(--font-display);
                    font-weight: 800;
                    font-size: 1.125rem;
                    letter-spacing: -0.02em;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .app-navbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .app-navbar-seller-links {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-right: 0.25rem;
                }

                .nav-post-btn {
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.4rem 0.875rem;
                    background: var(--gradient-primary);
                    border-radius: var(--radius-full);
                    box-shadow: 0 2px 8px var(--primary-glow);
                    transition: all 0.2s;
                    text-decoration: none;
                }
                .nav-post-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--primary-glow); }

                .nav-link {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text);
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    transition: color 0.2s;
                    text-decoration: none;
                }
                .nav-link:hover { color: var(--primary); }
                .nav-link--muted { color: var(--text-secondary); }

                .app-navbar-auth {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                }

                .nav-login-link {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    transition: color 0.2s;
                    text-decoration: none;
                }
                .nav-login-link:hover { color: var(--text); }

                .nav-signup-btn {
                    font-size: 0.8125rem;
                    padding: 0.4rem 0.875rem;
                }

                .app-navbar-user {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .nav-icon-btn {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px; height: 36px;
                    border-radius: 10px;
                    border: 1.5px solid var(--border);
                    color: var(--text-secondary);
                    transition: all 0.2s;
                    text-decoration: none;
                    background: var(--surface-elevated);
                }
                .nav-icon-btn:hover, .nav-icon-btn--active {
                    background: var(--primary-light);
                    border-color: var(--primary-light);
                    color: var(--primary);
                }

                .nav-badge {
                    position: absolute;
                    top: -4px; right: -4px;
                    min-width: 18px; height: 18px;
                    background: var(--primary);
                    color: white;
                    border-radius: var(--radius-full);
                    font-size: 0.625rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    border: 2px solid var(--nav-bg);
                    line-height: 1;
                }
                .nav-badge--danger { background: var(--danger); }
                .nav-badge--inline {
                    position: static;
                    margin-left: auto;
                    border: none;
                    min-width: 20px; height: 20px;
                }

                .nav-menu-wrap { position: relative; }

                .nav-menu-trigger {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.3rem 0.75rem 0.3rem 0.3rem;
                    border-radius: var(--radius-full);
                    border: 1.5px solid var(--border);
                    background: var(--surface-elevated);
                    cursor: pointer;
                    color: var(--text);
                    font-weight: 600;
                    font-size: 0.8125rem;
                    transition: all 0.2s;
                }
                .nav-menu-trigger:hover {
                    border-color: var(--primary-light);
                }
                .nav-menu-trigger--open {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px var(--primary-light);
                }

                .nav-avatar {
                    width: 28px; height: 28px;
                    border-radius: 8px;
                    background: var(--surface);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                }
                .nav-avatar--lg { width: 34px; height: 34px; border-radius: 10px; }
                .nav-avatar--seller {
                    background: var(--gradient-primary);
                    color: white;
                }

                .nav-role { text-transform: capitalize; }

                .nav-chevron { transition: transform 0.2s; }
                .nav-chevron--open { transform: rotate(180deg); }

                .nav-dropdown {
                    position: absolute;
                    top: calc(100% + 0.5rem);
                    right: 0;
                    width: 230px;
                    background: var(--surface-elevated);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-xl);
                    overflow: hidden;
                    animation: dropdownSlide 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 1001;
                }

                .nav-dropdown-header {
                    padding: 0.875rem 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                }

                .nav-dropdown-role {
                    font-size: 0.8125rem;
                    font-weight: 700;
                    text-transform: capitalize;
                }
                .nav-dropdown-status {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .nav-dropdown-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background: none;
                    border: none;
                    color: var(--text);
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-align: left;
                    text-decoration: none;
                    transition: background 0.15s;
                    font-family: inherit;
                }
                .nav-dropdown-item:hover { background: var(--surface); }
                .nav-dropdown-item--highlight { color: var(--primary); font-weight: 700; }
                .nav-dropdown-item--danger { color: var(--danger); }
                .nav-dropdown-item--danger:hover { background: rgba(239, 68, 68, 0.06); }

                .nav-theme-pill {
                    margin-left: auto;
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 0.15rem 0.5rem;
                    border-radius: var(--radius-full);
                    background: var(--surface);
                    color: var(--text-secondary);
                }
                .nav-theme-pill--on {
                    background: var(--primary);
                    color: white;
                }

                .nav-free-badge {
                    margin-left: auto;
                    font-size: 0.625rem;
                    font-weight: 800;
                    padding: 0.15rem 0.5rem;
                    border-radius: var(--radius-full);
                    background: var(--primary-light);
                    color: var(--primary);
                }

                .nav-dropdown-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 0.25rem 0;
                }

                .bell-ring { animation: bellRing 2s ease-in-out infinite; }

                @keyframes dropdownSlide {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bellRing {
                    0%, 100% { transform: rotate(0deg); }
                    10% { transform: rotate(12deg); }
                    20% { transform: rotate(-10deg); }
                    30% { transform: rotate(8deg); }
                    40% { transform: rotate(-6deg); }
                    50% { transform: rotate(0deg); }
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
