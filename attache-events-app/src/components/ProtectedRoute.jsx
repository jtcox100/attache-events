import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role, loginPath }) {
  const { user, loading } = useAuth();
  const redirect = loginPath || '/manage';
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9ca3af' }}>Loading...</p></div>;
  if (!user) return <Navigate to={redirect} replace />;
  if (role && user.role !== role) return <Navigate to={redirect} replace />;
  return children;
}
