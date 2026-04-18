import { Navigate } from '@/router';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ children, allowedRole }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D4A853]/20 border-t-[#D4A853] rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== allowedRole) {
    const redirectPath = user?.role === 'candidate' ? '/candidate/dashboard' : '/recruiter/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
