import { useState } from 'react';
import { useNavigate, Link } from '@/router';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, selectedRole } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill based on selected role
  if (selectedRole === 'candidate' && !email) {
    setEmail('candidate@demo.com');
  } else if (selectedRole === 'recruiter' && !email) {
    setEmail('recruiter@demo.com');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      toast.success('Welcome back!');
      
      // Redirect based on role
      const user = JSON.parse(localStorage.getItem('ats_user') || '{}');
      navigate(user.role === 'candidate' ? '/candidate/dashboard' : '/recruiter/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#A855F7]/5 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-foreground group-hover:text-[#A855F7] transition-colors">TalentFlow</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 glow-border">
          <div className="text-center mb-8">
            <h1 className="heading-md text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input-field"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-[#A855F7]/30 bg-background text-[#A855F7] focus:ring-[#A855F7]" />
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-[#A855F7] hover:text-[#C084FC] animated-underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="btn-primary w-full group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-[#A855F7] hover:text-[#C084FC] animated-underline font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-muted-foreground text-xs mb-3">Demo credentials</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setEmail('candidate@demo.com'); setPassword('password123'); }}
                className="p-2 bg-[#7C3AED]/10 border border-[#A855F7]/20 rounded-lg text-xs text-muted-foreground hover:border-[#A855F7]/50 hover:bg-[#7C3AED]/20 transition-all text-left group"
              >
                <span className="text-foreground font-medium block group-hover:text-[#A855F7] transition-colors">Candidate</span>
                candidate@demo.com
              </button>
              <button
                type="button"
                onClick={() => { setEmail('recruiter@demo.com'); setPassword('password123'); }}
                className="p-2 bg-[#7C3AED]/10 border border-[#A855F7]/20 rounded-lg text-xs text-muted-foreground hover:border-[#A855F7]/50 hover:bg-[#7C3AED]/20 transition-all text-left group"
              >
                <span className="text-foreground font-medium block group-hover:text-[#A855F7] transition-colors">Recruiter</span>
                recruiter@demo.com
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
