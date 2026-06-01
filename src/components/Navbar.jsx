import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { LogOut, Sun, Moon, Store, User, ChevronDown, ShieldCheck, PlusCircle, Compass, Bell, Settings } from 'lucide-react';

const Navbar = () => {
    const { isAuthenticated, isSeller, userRole, currentUser } = useAuth();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [menuOpen, setMenuOpen] = useState(false);
    const [unseenCount, setUnseenCount] = useState(0);
    const menuRef = useRef(null);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Real-time unseen interest count for sellers
    useEffect(() => {
        if (!isSeller || !currentUser) {
            setUnseenCount(0);
            return;
        }

        const q = query(
            collection(db, 'interests'),
            where('sellerId', '==', currentUser.uid),
            where('seen', '==', false)
        );

        const unsub = onSnapshot(q, (snap) => {
            setUnseenCount(snap.size);
        }, (err) => {
            console.warn('Notification count error:', err);
        });

        return () => unsub();
    }, [isSeller, currentUser]);

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
                {/* Logo */}
                <Link to={isAuthenticated ? '/market' : '/'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '900', fontFamily: '"Outfit", sans-serif', fontSize: '1.25rem', color: 'var(--primary-color)' }}>
                    <img src="/icon.png" alt="Market-U Icon" style={{ height: '28px', width: 'auto' }} />
                    <span className="hide-on-mobile">MARKET-U</span>
                </Link>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Role-Specific Primary Navigation */}
                    {isAuthenticated && isSeller && (
                        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginRight: '0.5rem' }}>
                            <Link to="/add-product" style={{ fontSize: '0.8125rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', backgroundColor: 'var(--primary-color)', borderRadius: '99px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>
                                <PlusCircle size={14} color="white" /> Post Product
                            </Link>
                            <Link to="/dashboard" style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Store size={16} /> Dashboard
                            </Link>
                            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)' }}></div>
                            <Link to="/market" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Compass size={16} /> Browse Market
                            </Link>
                        </div>
                    )}

                    {!isAuthenticated ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Link to="/login" style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Log in</Link>
                            <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)' }}>Sign up</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                            {/* 🔔 Notification Bell — Sellers Only */}
                            {isSeller && (
                                <Link
                                    to="/notifications"
                                    id="notification-bell"
                                    title="Notifications"
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '50%',
                                        backgroundColor: unseenCount > 0 ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                        border: `1.5px solid ${unseenCount > 0 ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-color)'}`,
                                        color: unseenCount > 0 ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        transition: 'all 0.2s ease',
                                        textDecoration: 'none',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
                                        e.currentTarget.style.color = 'var(--primary-color)';
                                    }}
                                    onMouseLeave={e => {
                                        if (unseenCount === 0) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }
                                    }}
                                >
                                    <Bell size={18} style={{
                                        animation: unseenCount > 0 ? 'bellRing 2s ease-in-out infinite' : 'none',
                                    }} />
                                    {unseenCount > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-4px',
                                            right: '-4px',
                                            minWidth: '18px',
                                            height: '18px',
                                            backgroundColor: '#EF4444',
                                            color: 'white',
                                            borderRadius: '99px',
                                            fontSize: '0.65rem',
                                            fontWeight: '800',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 4px',
                                            border: '2px solid var(--nav-bg)',
                                            lineHeight: 1,
                                            animation: 'badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        }}>
                                            {unseenCount > 99 ? '99+' : unseenCount}
                                        </span>
                                    )}
                                </Link>
                            )}

                            <div style={{ position: 'relative' }} ref={menuRef}>
                                {/* Avatar / Menu trigger */}
                            <button
                                onClick={() => setMenuOpen(prev => !prev)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '99px',
                                    border: '1.5px solid var(--border-color)',
                                    backgroundColor: 'var(--surface-color)',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    fontWeight: '700',
                                    fontSize: '0.8125rem',
                                    transition: 'all 0.2s ease',
                                    boxShadow: menuOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                                    borderColor: menuOpen ? 'var(--primary-color)' : 'var(--border-color)',
                                }}
                                title="Account menu"
                            >
                                <div style={{
                                    width: '26px', height: '26px',
                                    borderRadius: '50%',
                                    backgroundColor: isSeller ? 'var(--primary-color)' : 'rgba(148,163,184,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: isSeller ? 'white' : 'var(--text-secondary)',
                                }}>
                                    {isSeller ? <Store size={14} /> : <User size={14} />}
                                </div>
                                <span className="hide-on-mobile" style={{ textTransform: 'capitalize' }}>{userRole || 'Account'}</span>
                                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                            </button>

                            {/* Dropdown */}
                            {menuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 0.6rem)',
                                    right: 0,
                                    width: '220px',
                                    backgroundColor: 'var(--surface-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-xl)',
                                    boxShadow: '0 20px 40px -8px rgba(0,0,0,0.18)',
                                    overflow: 'hidden',
                                    animation: 'dropdownSlide 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                                    zIndex: 1001,
                                }}>
                                    {/* Role badge */}
                                    <div style={{
                                        padding: '0.875rem 1rem 0.75rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            backgroundColor: isSeller ? 'rgba(37,99,235,0.12)' : 'rgba(148,163,184,0.12)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isSeller ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        }}>
                                            {isSeller ? <Store size={16} /> : <User size={16} />}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{userRole}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Signed in</div>
                                        </div>
                                    </div>

                                    {/* Theme toggle */}
                                    <button
                                        onClick={toggleTheme}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.8rem 1rem', background: 'none', border: 'none',
                                            color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.875rem',
                                            fontWeight: '600', textAlign: 'left',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                                        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                                        <span style={{
                                            marginLeft: 'auto', fontSize: '0.7rem', fontWeight: '700',
                                            padding: '0.15rem 0.5rem', borderRadius: '99px',
                                            backgroundColor: theme === 'dark' ? 'var(--primary-color)' : 'rgba(148,163,184,0.2)',
                                            color: theme === 'dark' ? 'white' : 'var(--text-secondary)',
                                        }}>
                                            {theme === 'dark' ? 'ON' : 'OFF'}
                                        </span>
                                    </button>

                                    {/* Become a Seller (only for buyers) */}
                                    {!isSeller && (
                                        <Link
                                            to="/dashboard"
                                            onClick={() => setMenuOpen(false)}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.8rem 1rem', background: 'none', border: 'none',
                                                color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.875rem',
                                                fontWeight: '700', textDecoration: 'none',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <ShieldCheck size={16} />
                                            Become a Seller
                                            <span style={{
                                                marginLeft: 'auto', fontSize: '0.65rem', fontWeight: '800',
                                                padding: '0.15rem 0.5rem', borderRadius: '99px',
                                                backgroundColor: 'rgba(37,99,235,0.12)', color: 'var(--primary-color)',
                                            }}>
                                                FREE
                                            </span>
                                        </Link>
                                    )}

                                    {/* Mobile Only: Seller navigation */}
                                    {isSeller && (
                                        <>
                                            {/* Notifications link in dropdown */}
                                            <Link
                                                to="/notifications"
                                                onClick={() => setMenuOpen(false)}
                                                style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.8rem 1rem', background: 'none', border: 'none',
                                                    color: unseenCount > 0 ? 'var(--primary-color)' : 'var(--text-primary)',
                                                    cursor: 'pointer', fontSize: '0.875rem',
                                                    fontWeight: unseenCount > 0 ? '700' : '600', textDecoration: 'none',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.06)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Bell size={16} />
                                                Notifications
                                                {unseenCount > 0 && (
                                                    <span style={{
                                                        marginLeft: 'auto', minWidth: '20px', height: '20px',
                                                        backgroundColor: '#EF4444', color: 'white',
                                                        borderRadius: '99px', fontSize: '0.65rem', fontWeight: '800',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                                                    }}>
                                                        {unseenCount > 99 ? '99+' : unseenCount}
                                                    </span>
                                                )}
                                            </Link>
                                            <Link
                                                to="/add-product"
                                                onClick={() => setMenuOpen(false)}
                                                style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.8rem 1rem', background: 'none', border: 'none',
                                                    color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.875rem',
                                                    fontWeight: '700', textDecoration: 'none',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.06)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <PlusCircle size={16} />
                                                Post Product
                                            </Link>
                                            <Link
                                                to="/dashboard"
                                                onClick={() => setMenuOpen(false)}
                                                style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.8rem 1rem', background: 'none', border: 'none',
                                                    color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.875rem',
                                                    fontWeight: '600', textDecoration: 'none',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Store size={16} />
                                                My Dashboard
                                            </Link>
                                            <Link
                                                to="/market"
                                                className="mobile-only"
                                                onClick={() => setMenuOpen(false)}
                                                style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.8rem 1rem', background: 'none', border: 'none',
                                                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
                                                    fontWeight: '600', textDecoration: 'none',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Compass size={16} />
                                                Browse Market
                                            </Link>
                                        </>
                                    )}

                                    {/* Account Settings — all users */}
                                    <Link
                                        to="/profile"
                                        onClick={() => setMenuOpen(false)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.8rem 1rem', background: 'none', border: 'none',
                                            color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.875rem',
                                            fontWeight: '600', textDecoration: 'none',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Settings size={16} />
                                        Account Settings
                                    </Link>

                                    {/* Divider */}
                                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />

                                    {/* Log Out */}
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.8rem 1rem', background: 'none', border: 'none',
                                            color: 'var(--danger-color)', cursor: 'pointer', fontSize: '0.875rem',
                                            fontWeight: '600', textAlign: 'left',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <LogOut size={16} />
                                        Log Out
                                    </button>
                                </div>
                            )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes dropdownSlide {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                @keyframes bellRing {
                    0%, 100% { transform: rotate(0deg); }
                    10%      { transform: rotate(12deg); }
                    20%      { transform: rotate(-10deg); }
                    30%      { transform: rotate(8deg); }
                    40%      { transform: rotate(-6deg); }
                    50%      { transform: rotate(0deg); }
                }
                @keyframes badgePop {
                    from { transform: scale(0); }
                    to   { transform: scale(1); }
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
