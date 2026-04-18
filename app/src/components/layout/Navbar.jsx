import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocation, Link, useNavigate } from '@/router';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut, Briefcase, LayoutDashboard, FileText, History, Plus, Users, Sun, Moon, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Public navbar for landing page
  if (!isAuthenticated) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="glass-card px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 glow-purple">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-foreground group-hover:text-purple-400 transition-colors">TalentFlow</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors animated-underline">Home</Link>
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors animated-underline">Features</a>
            </div>

            {/* Desktop CTA & Theme Toggle */}
            <div className="hidden md:flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-purple-500/20 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-purple-400" />
                ) : (
                  <Moon className="w-5 h-5 text-purple-600" />
                )}
              </button>

              <Link to="/login">
                <Button variant="ghost" className="text-foreground hover:text-purple-400">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="btn-primary">
                  Sign up
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-4 mt-2">
            <div className="glass-card p-6 space-y-4">
              <Link to="/" className="block text-foreground" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <a href="#features" className="block text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <hr className="border-white/10" />
              
              {/* Theme Toggle Mobile */}
              <button
                onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 w-full py-2"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-purple-400" /> : <Moon className="w-5 h-5 text-purple-600" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Log in</Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="btn-primary w-full">Sign up</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    );
  }

  // Authenticated navbar
  const isCandidate = user?.role === 'candidate';
  const navItems = isCandidate
    ? [
        { path: '/candidate/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/candidate/resume', label: 'Resume', icon: FileText },
        { path: '/candidate/jobs', label: 'Jobs', icon: Briefcase },
        { path: '/candidate/applications', label: 'Applications', icon: History },
        { path: '/candidate/ats-checker', label: 'ATS Checker', icon: Sparkles },
      ]
    : [
        { path: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/recruiter/jobs', label: 'Jobs', icon: Briefcase },
        { path: '/recruiter/applicants', label: 'Applicants', icon: Users },
        { path: '/recruiter/create-job', label: 'Post Job', icon: Plus },
      ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <div className="glass-card px-4 md:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to={isCandidate ? '/candidate/dashboard' : '/recruiter/dashboard'} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 glow-purple">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-foreground hidden sm:block group-hover:text-purple-400 transition-colors">TalentFlow</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-purple-500/20 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-purple-400" />
              ) : (
                <Moon className="w-5 h-5 text-purple-600" />
              )}
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mx-4 mt-2">
          <div className="glass-card p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <hr className="border-white/10 my-2" />
            
            {/* Theme Toggle Mobile */}
            <button
              onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-purple-400" /> : <Moon className="w-5 h-5 text-purple-600" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 w-full"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
