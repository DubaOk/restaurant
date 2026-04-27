import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps routes that require authentication and optionally a specific role.
 *
 * @param {React.ReactNode} children - Protected page component
 * @param {string[]} roles - Allowed roles; if omitted, any authenticated user is allowed
 */
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/restaurants" replace />;
  }

  return children;
};

export default ProtectedRoute;
