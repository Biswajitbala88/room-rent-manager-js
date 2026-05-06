import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center text-sm text-steel">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
