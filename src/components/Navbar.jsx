import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Store, LogOut, User } from 'lucide-react';

const Navbar = () => {
    const { isAuthenticated, isSeller, userRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out', error);
        }
    };

    return (
        <nav style={{ backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontFamily: '"Outfit", sans-serif', fontSize: '1.5rem', color: 'var(--primary-color)' }}>
                    <img src="/icon.png" alt="Market-U Icon" style={{ height: '32px', width: 'auto' }} />
                    <span className="hide-on-mobile">Market-U</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                    {isAuthenticated ? (
                        <>
                            <Link to="/market" style={{ fontSize: '0.875rem', fontWeight: '600', marginRight: '0.25rem' }}>Market</Link>
                            {isSeller && (
                                <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>
                                    Dashboard
                                </Link>
                            )}
                            <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                <User size={16} />
                                <span style={{ textTransform: 'capitalize' }}>{userRole}</span>
                            </div>
                            <button onClick={handleLogout} className="btn" style={{ padding: '0.375rem', color: 'var(--text-secondary)' }} title="Logout">
                                <LogOut size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/market" style={{ fontSize: '0.875rem', fontWeight: '600', marginRight: '0.25rem' }}>Market</Link>
                            <Link to="/login" style={{ fontSize: '0.875rem', fontWeight: '500' }}>Log in</Link>
                            <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>Sign up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
