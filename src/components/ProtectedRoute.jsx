import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { isAuthenticated, userRole, loading } = useAuth();

    if (loading) {
        return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const normalizedRole = (userRole || '').trim().toLowerCase();
    const normalizedAllowed = allowedRoles?.map(r => r.trim().toLowerCase());

    if (normalizedAllowed && !normalizedAllowed.includes(normalizedRole)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
