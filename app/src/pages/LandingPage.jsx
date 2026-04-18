import { useEffect } from 'react';
import { useNavigate } from '@/router';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { User, Building2, Check, ChevronRight, Star, Quote, Briefcase, TrendingUp, Award, FileText, Sparkles } from 'lucide-react';

export function LandingPage() {
  const { setSelectedRole, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'candidate' ? '/candidate/dashboard' : '/recruiter/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12">
        {/* Floating decorative elements - Purple */}
        <div className="absolute top-40 left-10 w-4 h-4 bg-purple-400 rounded-full animate-pulse opacity-60" />
        <div className="absolute top-60 right-20 w-3 h-3 bg-pink-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.5s' }} />
        
        <div className="section-padding w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card hover:scale-105 transition-transform cursor-default">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="micro-label">AI-POWERED ATS</span>
              </div>
              
              <h1 className="heading-xl text-foreground">
                Hire at the speed of{' '}
                <span className="gradient-text">now.</span>
              </h1>
              
              <p className="body-text max-w-lg text-lg">
                TalentFlow turns resumes into insights—so your team can focus on the right candidates, faster.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  className="btn-primary group"
                  onClick={() => navigate('/signup')}
                >
                  Sign up
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  className="btn-secondary"
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-4">
                {[
                  { value: '80%', label: 'Faster hiring' },
                  { value: '100+', label: 'Companies' },
                  { value: '1k+', label: 'Resumes parsed' },
                ].map((stat, i) => (
                  <div key={i} className="text-center group cursor-default">
                    <p className="text-3xl font-display font-bold gradient-text group-hover:scale-110 transition-transform">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - 3D Character with floating effect */}
            <div className="relative flex justify-center lg:justify-end animate-fade-up animate-delay-200">
              {/* Glow effect behind character - Purple */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-500/20 rounded-full blur-[80px]" />
                <div className="absolute inset-10 bg-gradient-to-tr from-pink-500/20 to-purple-600/20 rounded-full blur-[60px] animate-pulse" />
              </div>
              
              {/* 3D Character Image - Floating */}
              <div className="relative float">
                <img 
                  src="/hero-3d-candidate.png" 
                  alt="3D Professional with laptop"
                  className="relative z-10 w-full max-w-[420px] h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700"
                />
                
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 glass-card px-4 py-3 flex items-center gap-3 animate-scale-in animate-delay-500 hover:scale-110 transition-transform cursor-default">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center glow-purple">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">85% Match</p>
                    <p className="text-xs text-muted-foreground">ATS Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Section */}
      <section className="py-24 relative">
        <div className="section-padding relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 animate-fade-up">
              <h2 className="heading-lg text-foreground mb-4">
                Choose Your Path
              </h2>
              <p className="body-text max-w-2xl mx-auto">
                Whether you&apos;re looking for your dream job or building your dream team, we&apos;ve got you covered.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left - 3D Team Image */}
              <div className="relative flex justify-center animate-fade-up">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-[80px]" />
                </div>
                <div className="relative float-slow">
                  <img 
                    src="/team-3d.png" 
                    alt="3D Team collaboration"
                    className="relative z-10 w-full max-w-[500px] h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              {/* Right - Role Cards */}
              <div className="grid gap-4 animate-fade-up animate-delay-200">
                {/* Candidate Card */}
                <div 
                  onClick={() => handleRoleSelect('candidate')}
                  className="group glass-card p-8 cursor-pointer hover-lift glow-border"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center flex-shrink-0 glow-purple group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-display font-semibold text-foreground mb-2 group-hover:text-purple-400 transition-colors">
                        I&apos;m a Candidate
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Upload your resume, get AI-powered feedback, and find your dream job.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['ATS Score Analysis', 'Smart Job Matching', 'Track Applications'].map((feature) => (
                          <span key={feature} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:bg-purple-500/30 transition-colors">
                            <Check className="w-3 h-3" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-2 transition-all duration-300" />
                  </div>
                </div>

                {/* Recruiter Card */}
                <div 
                  onClick={() => handleRoleSelect('recruiter')}
                  className="group glass-card p-8 cursor-pointer hover-lift glow-border"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0 glow-pink group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-display font-semibold text-foreground mb-2 group-hover:text-pink-400 transition-colors">
                        I&apos;m a Recruiter
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Post jobs, screen candidates with AI, and build your dream team.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['AI Resume Screening', 'Team Collaboration', 'Analytics Dashboard'].map((feature) => (
                          <span key={feature} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-pink-500/20 text-pink-400 border border-pink-500/30 group-hover:bg-pink-500/30 transition-colors">
                            <Check className="w-3 h-3" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-pink-400 group-hover:translate-x-2 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="section-padding relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left - Features Grid */}
              <div className="animate-fade-up">
                <h2 className="heading-lg text-foreground mb-4">
                  Everything you need to hire.
                </h2>
                <p className="body-text mb-10">
                  From first resume to final offer—one system, zero chaos.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: FileText, title: 'AI Parsing', desc: 'Extract skills, experience, and education automatically.', color: 'from-purple-600 to-purple-800' },
                    { icon: TrendingUp, title: 'Smart Search', desc: 'Find candidates by skills, experience, or keywords.', color: 'from-pink-500 to-purple-500' },
                    { icon: Briefcase, title: 'Scheduling', desc: 'Integrated calendar for seamless interview scheduling.', color: 'from-purple-500 to-pink-500' },
                    { icon: Award, title: 'Careers Page', desc: 'Customizable job board for your company.', color: 'from-cyan-500 to-purple-500' },
                  ].map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                      <div 
                        key={feature.title}
                        className="glass-card p-6 hover-lift group glow-border cursor-default"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-display font-semibold text-foreground mb-2 group-hover:text-purple-400 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right - 3D Recruiter Image */}
              <div className="relative flex justify-center animate-fade-up animate-delay-200">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/25 to-purple-600/15 rounded-full blur-[80px]" />
                </div>
                <div className="relative float">
                  <img 
                    src="/hero-3d-recruiter.png" 
                    alt="3D Recruiter with laptop"
                    className="relative z-10 w-full max-w-[380px] h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Floating stats card */}
                  <div className="absolute -top-4 -right-4 glass-card px-4 py-3 animate-scale-in animate-delay-500 hover:scale-110 transition-transform cursor-default">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">AI Match</p>
                        <p className="text-sm font-semibold text-foreground">92% Accurate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="py-24 relative">
        <div className="section-padding relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 animate-fade-up">
              <h2 className="heading-lg text-foreground mb-4">
                Loved by hiring teams
              </h2>
              <p className="body-text max-w-xl mx-auto">
                See what industry leaders are saying about TalentFlow
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  text: "TalentFlow is the best hiring investment we've made—our time-to-offer dropped by 40%.", 
                  author: "Jordan Reyes", 
                  role: "VP People at Northcraft",
                  rating: 5 
                },
                { 
                  text: "The AI screening actually understands context. It's like having an extra team member.", 
                  author: "Sam L.", 
                  role: "Tech Lead at StartupX",
                  rating: 5 
                },
                { 
                  text: "Setup took an afternoon, not a quarter. Our hiring managers love it.", 
                  author: "Daniel T.", 
                  role: "CEO at DataFlow",
                  rating: 5 
                },
              ].map((testimonial, i) => (
                <div 
                  key={i}
                  className="glass-card p-8 animate-fade-up hover-lift glow-border group cursor-default"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-purple-400 text-purple-400 group-hover:scale-110 transition-transform" style={{ animationDelay: `${j * 50}ms` }} />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-purple-500/40 mb-4 group-hover:text-purple-400/40 transition-colors" />
                  <p className="text-foreground mb-6 leading-relaxed">&quot;{testimonial.text}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-semibold group-hover:scale-110 transition-transform">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                      <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/10 to-pink-500/10 rounded-full blur-[100px]" />
        </div>
        
        <div className="section-padding relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <h2 className="heading-lg text-foreground mb-4">
              Ready to hire smarter?
            </h2>
            <p className="body-text mb-8">
              Join thousands of companies already using TalentFlow.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                className="btn-primary group"
                onClick={() => navigate('/signup')}
              >
                Sign up
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                className="btn-secondary"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-4 group cursor-default">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-xl text-foreground group-hover:text-purple-400 transition-colors">TalentFlow</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  AI-powered applicant tracking system for modern teams.
                </p>
              </div>
              
              {[
                { title: 'Product', links: ['Features', 'Integrations'] },
                { title: 'Company', links: ['About', 'Blog', 'Careers'] },
                { title: 'Resources', links: ['Documentation', 'Support', 'API'] },
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="font-semibold text-foreground mb-4">{col.title}</h4>
                  <ul className="space-y-2">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-muted-foreground text-sm animated-underline hover:text-purple-400 transition-colors">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                © 2026 TalentFlow. All rights reserved.
              </p>
              <div className="flex gap-6">
                <a href="#" className="text-muted-foreground text-sm animated-underline hover:text-purple-400 transition-colors">Privacy</a>
                <a href="#" className="text-muted-foreground text-sm animated-underline hover:text-purple-400 transition-colors">Terms</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
