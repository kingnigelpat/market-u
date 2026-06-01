import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SupportButton from './components/SupportButton.jsx';
import IOSInstallBanner from './components/IOSInstallBanner.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard.jsx'));
const AddProduct = lazy(() => import('./pages/AddProduct.jsx'));
const EditProduct = lazy(() => import('./pages/EditProduct.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

import './styles/global.css';

const AppContent = () => {
    const { loading } = useAuth();
    const navigate = useNavigate();

    // Listen for NAVIGATE messages from the service worker (notification click)
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handler = (event) => {
            if (event.data && event.data.type === 'NAVIGATE' && event.data.url) {
                navigate(event.data.url);
            }
        };
        navigator.serviceWorker.addEventListener('message', handler);
        return () => navigator.serviceWorker.removeEventListener('message', handler);
    }, [navigate]);

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <div className="loading-text">Loading Market-U...</div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content">
                <Suspense fallback={
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                }>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/market" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/product/:id" element={<ProductDetail />} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin', 'buyer']} />}>
                            <Route path="/dashboard" element={<SellerDashboard />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
                            <Route path="/add-product" element={<AddProduct />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin', 'buyer']} />}>
                            <Route path="/edit-product/:id" element={<EditProduct />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
                            <Route path="/notifications" element={<Notifications />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['seller', 'admin', 'buyer']} />}>
                            <Route path="/profile" element={<Profile />} />
                        </Route>
                    </Routes>
                </Suspense>
            </main>
            <Footer />
            <SupportButton />
            <IOSInstallBanner />
        </div>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}

export default App;
