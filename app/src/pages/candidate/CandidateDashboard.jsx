import { useEffect, useState } from 'react';
import { useNavigate } from '@/router';
import { dashboardApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Briefcase, TrendingUp, Upload, 
  ChevronRight, Clock, CheckCircle, Sparkles
} from 'lucide-react';

export function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const data = await dashboardApi.getCandidateProfile(user.id);
        setProfile(data);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'ATS Score',
      value: profile?.resume?.atsScore || 0,
      suffix: '/100',
      icon: TrendingUp,
      color: profile?.resume?.atsScore && profile.resume.atsScore >= 80 ? 'text-green-400' : 'text-yellow-400',
      path: '/candidate/resume',
    },
    {
      label: 'Profile Completion',
      value: profile?.profileCompletion || 0,
      suffix: '%',
      icon: FileText,
      color: 'text-purple-400',
      path: '/candidate/resume',
    },
    {
      label: 'Applications',
      value: profile?.applications.length || 0,
      suffix: '',
      icon: Briefcase,
      color: 'text-pink-400',
      path: '/candidate/applications',
    },
  ];

  const recentApplications = profile?.applications.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="heading-lg text-foreground mb-2">
              Welcome back, {user?.name.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s what&apos;s happening with your job search
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.label}
                  onClick={() => navigate(stat.path)}
                  className="glass-card p-6 cursor-pointer hover-lift glow-border animate-fade-up group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                  <p className={`text-3xl font-display font-bold ${stat.color}`}>
                    {stat.value}{stat.suffix}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Resume Upload CTA */}
              {!profile?.resume && (
                <div className="glass-card p-6 border-2 border-dashed border-purple-500/30 animate-fade-up glow-border">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Upload className="w-7 h-7 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-display font-semibold text-foreground mb-1">
                        Upload your resume
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Get your ATS score and personalized job recommendations
                      </p>
                    </div>
                    <Button 
                      className="btn-primary group"
                      onClick={() => navigate('/candidate/resume')}
                    >
                      Upload
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Job ATS Checker CTA */}
              <div 
                className="glass-card p-6 border border-purple-500/30 animate-fade-up glow-border group cursor-pointer" 
                onClick={() => navigate('/candidate/ats-checker')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform glow-purple">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-display font-semibold text-foreground mb-1 group-hover:text-purple-400 transition-colors">
                      Job-Specific ATS Checker
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Paste a job description and your resume to get a targeted ATS score
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>

              {/* Recent Applications */}
              <div className="glass-card p-6 animate-fade-up animate-delay-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    Recent Applications
                  </h3>
                  <Button 
                    variant="ghost" 
                    className="text-purple-400 hover:text-purple-300"
                    onClick={() => navigate('/candidate/applications')}
                  >
                    View all
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {recentApplications.length > 0 ? (
                  <div className="space-y-4">
                    {recentApplications.map((app) => (
                      <div 
                        key={app.id}
                        className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-foreground font-medium">{app.job?.title}</p>
                            <p className="text-muted-foreground text-sm">{app.job?.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              app.status === 'shortlisted' ? 'bg-green-500/20 text-green-400' :
                              app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {app.status === 'shortlisted' && <CheckCircle className="w-3 h-3" />}
                              {app.status === 'rejected' && <Clock className="w-3 h-3" />}
                              {app.status === 'pending' && <Clock className="w-3 h-3" />}
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-purple-400 font-semibold">{app.matchScore}%</p>
                            <p className="text-muted-foreground text-xs">Match</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No applications yet</p>
                    <Button 
                      className="btn-primary"
                      onClick={() => navigate('/candidate/jobs')}
                    >
                      Browse Jobs
                    </Button>
                  </div>
                )}
              </div>

              {/* Skills Preview */}
              {profile?.resume && (
                <div className="glass-card p-6 animate-fade-up animate-delay-300">
                  <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                    Your Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.resume.skills.map((skill) => (
                      <span 
                        key={skill}
                        className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm text-foreground hover:border-purple-400/50 hover:scale-105 transition-all cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Completion */}
              <div className="glass-card p-6 animate-fade-up animate-delay-200">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                  Profile Completion
                </h3>
                <div className="mb-4">
                  <Progress 
                    value={profile?.profileCompletion || 0} 
                    className="h-2 bg-purple-500/20"
                  />
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Upload resume', done: !!profile?.resume },
                    { label: 'Add experience', done: !!profile?.resume?.experience.length },
                    { label: 'Add education', done: !!profile?.resume?.education.length },
                    { label: 'Apply to a job', done: profile?.applications.length ? true : false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 group">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                        item.done ? 'bg-purple-500' : 'bg-purple-500/20 border border-purple-500/30'
                      }`}>
                        {item.done && <CheckCircle className="w-3 h-3 text-background" />}
                      </div>
                      <span className={`text-sm transition-colors ${item.done ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card p-6 animate-fade-up animate-delay-300">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start btn-secondary group"
                    onClick={() => navigate('/candidate/jobs')}
                  >
                    <Briefcase className="w-4 h-4 mr-2 group-hover:text-purple-400 transition-colors" />
                    Browse Jobs
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start btn-secondary group"
                    onClick={() => navigate('/candidate/resume')}
                  >
                    <FileText className="w-4 h-4 mr-2 group-hover:text-purple-400 transition-colors" />
                    {profile?.resume ? 'Update Resume' : 'Upload Resume'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start btn-secondary group"
                    onClick={() => navigate('/candidate/ats-checker')}
                  >
                    <Sparkles className="w-4 h-4 mr-2 group-hover:text-purple-400 transition-colors" />
                    ATS Checker
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
