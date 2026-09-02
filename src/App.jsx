import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import BottomNavigation from './components/BottomNavigation.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import AIAssistant from './components/AIAssistant.jsx';
import IOSInstallBanner from './components/IOSInstallBanner.jsx';

// Resilient lazy-loader that auto-reloads if a new build invalidated old bundle hashes
const lazyRetry = (componentImport) =>
    lazy(async () => {
        try {
            return await componentImport();
        } catch (error) {
            console.warn('Chunk load error, attempting page reload for updated version:', error);
            const lastReload = sessionStorage.getItem('chunk_reload_ts');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('chunk_reload_ts', now.toString());
                window.location.reload();
            }
            throw error;
        }
    });

const Landing = lazyRetry(() => import('./pages/Landing.jsx'));
const About = lazyRetry(() => import('./pages/About.jsx'));
const Home = lazyRetry(() => import('./pages/Home.jsx'));
const Login = lazyRetry(() => import('./pages/Login.jsx'));
const Register = lazyRetry(() => import('./pages/Register.jsx'));
const Waitlist = lazyRetry(() => import('./pages/Waitlist.jsx'));
const ProductDetail = lazyRetry(() => import('./pages/ProductDetail.jsx'));
const SellerDashboard = lazyRetry(() => import('./pages/SellerDashboard.jsx'));
const AddProduct = lazyRetry(() => import('./pages/AddProduct.jsx'));
const EditProduct = lazyRetry(() => import('./pages/EditProduct.jsx'));
const Notifications = lazyRetry(() => import('./pages/Notifications.jsx'));
const Profile = lazyRetry(() => import('./pages/Profile.jsx'));
const SavedItems = lazyRetry(() => import('./pages/SavedItems.jsx'));

import './styles/global.css';

// ── Scroll to top on every route change ──────────────────────────────────────
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);
    return null;
}

const AppContent = () => {
    const { loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isLanding = location.pathname === '/search';


    // Listen for NAVIGATE messages from the service worker (notification click)
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handler = (event) => {
            // Only accept messages from our own origin
            if (event.origin && event.origin !== window.location.origin) return;
            if (event.data && event.data.type === 'NAVIGATE' && event.data.url) {
                const url = event.data.url;
                // Only allow internal paths starting with '/'; block absolute URLs and protocol-relative URLs
                if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
                    navigate(url);
                }
            }
        };
        navigator.serviceWorker.addEventListener('message', handler);
        return () => navigator.serviceWorker.removeEventListener('message', handler);
    }, [navigate]);

    if (loading) {
        return (
            <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="top-progress-bar" />
                <div className="page-spinner" />
            </div>
        );
    }

    return (
        <div className="app-container">
            <ScrollToTop />
            <Navbar />
            <BottomNavigation />
            <main className={`main-content ${!isLanding ? 'main-content--with-padding' : ''}`}>
                <Suspense fallback={
                    <>
                        <div className="top-progress-bar" />
                        <div className="page-loader">
                            <div className="page-spinner" />
                        </div>
                    </>
                }>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/search" element={<Landing />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/market" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/waitlist" element={<Waitlist />} />
                        <Route path="/product/:id" element={<ProductDetail />} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin', 'buyer']} />}>
                            <Route path="/dashboard" element={<SellerDashboard />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
                            <Route path="/add-product" element={<AddProduct />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
                            <Route path="/edit-product/:id" element={<EditProduct />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin', 'buyer']} />}>
                            <Route path="/notifications" element={<Notifications />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin', 'buyer']} />}>
                            <Route path="/profile" element={<Profile />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin', 'buyer']} />}>
                            <Route path="/saved" element={<SavedItems />} />
                        </Route>
                    </Routes>
                </Suspense>
            </main>
            <Footer />
            <AIAssistant />

            <IOSInstallBanner />
        </div>
    );
};

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
