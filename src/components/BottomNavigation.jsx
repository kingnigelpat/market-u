import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
    Compass, 
    Search, 
    Bookmark, 
    User, 
    LayoutDashboard, 
    PlusCircle, 
    Bell, 
    Home,
    LogIn,
    UserPlus,
    Heart
} from 'lucide-react';

// NavItem is defined outside the parent to prevent recreating on every render
const NavItem = ({ to, icon: Icon, label, badge, isCenter = false, isActive }) => (
    <Link
        to={to}
        className={`bottom-nav-item ${isActive(to) ? 'bottom-nav-item--active' : ''} ${isCenter ? 'bottom-nav-item--center' : ''}`}
    >
        <div className="bottom-nav-icon">
            <Icon size={isCenter ? 24 : 20} />
            {badge > 0 && (
                <span className="bottom-nav-badge">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </div>
        <span className="bottom-nav-label">{label}</span>
    </Link>
);

const BottomNavigation = () => {
    const { isAuthenticated, isSeller, currentUser } = useAuth();
    const location = useLocation();
    const [unseenCount, setUnseenCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        const unsub = onSnapshot(q, (snap) => setUnseenCount(snap.size), () => {});
        return () => unsub();
    }, [isSeller, currentUser]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        if (!isAuthenticated || !currentUser) { 
            setSavedCount(0); 
            return; 
        }
        const q = query(collection(db, 'savedItems'), where('buyerId', '==', currentUser.uid));
        const unsub = onSnapshot(q, snap => setSavedCount(snap.size), () => {});
        return () => unsub();
    }, [isAuthenticated, currentUser]);

    const isActive = (path) => {
        if (path === '/market' && (location.pathname === '/' || location.pathname === '/market')) {
            return true;
        }
        return location.pathname === path;
    };

    let navigation;
    if (!isAuthenticated) {
        navigation = (
            <div className="bottom-nav-container">
                <NavItem to="/market" icon={Home} label="Home" isActive={isActive} />
                <NavItem to="/search" icon={Search} label="Search" isActive={isActive} />
                <NavItem to="/about" icon={Compass} label="About" isActive={isActive} />
                <NavItem to="/login" icon={LogIn} label="Login" isActive={isActive} />
                <NavItem to="/register" icon={UserPlus} label="Sign Up" isActive={isActive} />
            </div>
        );
    } else if (isSeller) {
        navigation = (
            <div className="bottom-nav-container bottom-nav-container--seller">
                <NavItem to="/market" icon={Compass} label="Market" isActive={isActive} />
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" isActive={isActive} />
                <NavItem to="/add-product" icon={PlusCircle} label="Post" isCenter={true} isActive={isActive} />
                <NavItem to="/notifications" icon={Bell} label="Alerts" badge={unseenCount} isActive={isActive} />
                <NavItem to="/profile" icon={User} label="Profile" isActive={isActive} />
            </div>
        );
    } else {
        navigation = (
            <div className="bottom-nav-container">
                <NavItem to="/market" icon={Compass} label="Market" isActive={isActive} />
                <NavItem to="/search" icon={Search} label="Search" isActive={isActive} />
                <NavItem to="/notifications" icon={Heart} label="Activity" isActive={isActive} />
                <NavItem to="/saved" icon={Bookmark} label="Saved" badge={savedCount} isActive={isActive} />
                <NavItem to="/profile" icon={User} label="Profile" isActive={isActive} />
            </div>
        );
    }

    return (
        <>
            <nav className="bottom-navigation">
                {navigation}
            </nav>
            <style>{`
                .bottom-navigation {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    background: var(--nav-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-top: 1px solid var(--border);
                    padding-bottom: max(0.25rem, env(safe-area-inset-bottom));
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    display: block;
                }

                .bottom-nav-container {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    padding: 0.75rem 1rem 1rem 1rem;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .bottom-nav-container--seller {
                    padding: 0.5rem 1rem 1rem 1rem;
                    position: relative;
                }

                .bottom-nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                    text-decoration: none;
                    color: var(--text-secondary);
                    transition: all 0.2s ease;
                    padding: 0.5rem 0.75rem;
                    border-radius: var(--radius-lg);
                    min-width: 60px;
                    flex: 1;
                    max-width: 80px;
                }

                .bottom-nav-item--center {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: -0.75rem;
                    background: var(--gradient-primary);
                    color: white;
                    border-radius: 50%;
                    width: 56px;
                    height: 56px;
                    padding: 0;
                    box-shadow: 0 4px 16px var(--primary-glow);
                    flex: none;
                    max-width: none;
                    min-width: auto;
                }

                .bottom-nav-item--center:active {
                    transform: translateX(-50%) scale(0.95);
                }

                .bottom-nav-item--center .bottom-nav-label {
                    position: absolute;
                    bottom: -1.5rem;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    white-space: nowrap;
                }

                .bottom-nav-item:active {
                    transform: scale(0.95);
                }

                .bottom-nav-item--active {
                    color: var(--primary);
                }

                .bottom-nav-item--active .bottom-nav-icon {
                    position: relative;
                }

                .bottom-nav-item--active .bottom-nav-icon::after {
                    content: '';
                    position: absolute;
                    bottom: -0.5rem;
                    width: 4px;
                    height: 4px;
                    background: var(--primary);
                    border-radius: 50%;
                }

                .bottom-nav-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .bottom-nav-label {
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-align: center;
                    line-height: 1;
                }

                .bottom-nav-badge {
                    position: absolute;
                    top: -4px;
                    right: -6px;
                    min-width: 16px;
                    height: 16px;
                    background: var(--danger);
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

                @media (min-width: 768px) {
                    .bottom-navigation {
                        display: none;
                    }
                }

                .bottom-nav-container--seller .bottom-nav-item:first-child,
                .bottom-nav-container--seller .bottom-nav-item:nth-child(2) {
                    margin-right: 28px;
                }

                .bottom-nav-container--seller .bottom-nav-item:nth-child(4),
                .bottom-nav-container--seller .bottom-nav-item:last-child {
                    margin-left: 28px;
                }
            `}</style>
        </>
    );
};

export default BottomNavigation;