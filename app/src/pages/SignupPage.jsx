import { useState } from 'react';
import { useNavigate, Link } from '@/router';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase, Eye, EyeOff, Loader2, User, Building2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, selectedRole } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(selectedRole || 'candidate');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      await signup({ name, email, password, role });
      toast.success('Account created successfully!');
      navigate(role === 'candidate' ? '/candidate/dashboard' : '/recruiter/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      toast.error('Failed to create account');
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

        {/* Signup Card */}
        <div className="glass-card p-8 glow-border">
          <div className="text-center mb-8">
            <h1 className="heading-md text-foreground mb-2">Create your account</h1>
            <p className="text-muted-foreground text-sm">
              Join TalentFlow today
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole('candidate')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-500 group ${
                role === 'candidate'
                  ? 'border-[#A855F7] bg-[#7C3AED]/20'
                  : 'border-white/10 bg-background hover:border-[#A855F7]/30'
              }`}
            >
              <User className={`w-6 h-6 transition-colors ${role === 'candidate' ? 'text-[#A855F7]' : 'text-muted-foreground group-hover:text-[#A855F7]'}`} />
              <span className={`text-sm font-medium transition-colors ${role === 'candidate' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                Candidate
              </span>
              {role === 'candidate' && <Check className="w-4 h-4 text-[#A855F7]" />}
            </button>
            <button
              type="button"
              onClick={() => setRole('recruiter')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-500 group ${
                role === 'recruiter'
                  ? 'border-[#A855F7] bg-[#7C3AED]/20'
                  : 'border-white/10 bg-background hover:border-[#A855F7]/30'
              }`}
            >
              <Building2 className={`w-6 h-6 transition-colors ${role === 'recruiter' ? 'text-[#A855F7]' : 'text-muted-foreground group-hover:text-[#A855F7]'}`} />
              <span className={`text-sm font-medium transition-colors ${role === 'recruiter' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                Recruiter
              </span>
              {role === 'recruiter' && <Check className="w-4 h-4 text-[#A855F7]" />}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground text-sm">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="input-field"
                required
              />
            </div>

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
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-[#A855F7]/30 bg-background text-[#A855F7] focus:ring-[#A855F7]"
              />
              <span className="text-muted-foreground text-sm group-hover:text-foreground transition-colors">
                I agree to the{' '}
                <a href="#" className="text-[#A855F7] hover:text-[#C084FC] animated-underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-[#A855F7] hover:text-[#C084FC] animated-underline">Privacy Policy</a>
              </span>
            </label>

            <Button
              type="submit"
              className="btn-primary w-full group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#A855F7] hover:text-[#C084FC] animated-underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
