import { RouterProvider, Routes, Route, Navigate } from '@/router';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Public Pages
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';

// Candidate Pages
import { CandidateDashboard } from '@/pages/candidate/CandidateDashboard';
import { ResumeUpload } from '@/pages/candidate/ResumeUpload';
import { JobMatch } from '@/pages/candidate/JobMatch';
import { ApplicationHistory } from '@/pages/candidate/ApplicationHistory';
import { JobATSChecker } from '@/pages/candidate/JobATSChecker';

// Recruiter Pages
import { RecruiterDashboard } from '@/pages/recruiter/RecruiterDashboard';
import { JobsList } from '@/pages/recruiter/JobsList';
import { CreateJob } from '@/pages/recruiter/CreateJob';
import { Applicants } from '@/pages/recruiter/Applicants';
import { CandidateDetail } from '@/pages/recruiter/CandidateDetail';

function RootRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'candidate' ? '/candidate/dashboard' : '/recruiter/dashboard'} replace />;
  }
  
  return <LandingPage />;
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none z-0" />
      
      {/* Animated blobs */}
      <div className="fixed top-20 right-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none z-0 blob" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none z-0 blob" style={{ animationDelay: '-4s' }} />
      <div className="fixed top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none z-0 blob" style={{ animationDelay: '-2s' }} />
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(20, 20, 35, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: '#fff',
            borderRadius: '16px',
          },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Candidate Routes */}
        <Route path="/candidate/dashboard" element={
          <ProtectedRoute allowedRole="candidate">
            <><Navbar /><CandidateDashboard /></>
          </ProtectedRoute>
        } />
        <Route path="/candidate/resume" element={
          <ProtectedRoute allowedRole="candidate">
            <><Navbar /><ResumeUpload /></>
          </ProtectedRoute>
        } />
        <Route path="/candidate/jobs" element={
          <ProtectedRoute allowedRole="candidate">
            <><Navbar /><JobMatch /></>
          </ProtectedRoute>
        } />
        <Route path="/candidate/applications" element={
          <ProtectedRoute allowedRole="candidate">
            <><Navbar /><ApplicationHistory /></>
          </ProtectedRoute>
        } />
        <Route path="/candidate/ats-checker" element={
          <ProtectedRoute allowedRole="candidate">
            <><Navbar /><JobATSChecker /></>
          </ProtectedRoute>
        } />
        
        {/* Recruiter Routes */}
        <Route path="/recruiter/dashboard" element={
          <ProtectedRoute allowedRole="recruiter">
            <><Navbar /><RecruiterDashboard /></>
          </ProtectedRoute>
        } />
        <Route path="/recruiter/jobs" element={
          <ProtectedRoute allowedRole="recruiter">
            <><Navbar /><JobsList /></>
          </ProtectedRoute>
        } />
        <Route path="/recruiter/create-job" element={
          <ProtectedRoute allowedRole="recruiter">
            <><Navbar /><CreateJob /></>
          </ProtectedRoute>
        } />
        <Route path="/recruiter/applicants" element={
          <ProtectedRoute allowedRole="recruiter">
            <><Navbar /><Applicants /></>
          </ProtectedRoute>
        } />
        <Route path="/recruiter/candidate/:id" element={
          <ProtectedRoute allowedRole="recruiter">
            <><Navbar /><CandidateDetail /></>
          </ProtectedRoute>
        } />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
