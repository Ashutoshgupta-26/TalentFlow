import { useEffect, useState } from 'react';
import { useNavigate } from '@/router';
import { dashboardApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, Users, TrendingUp, Plus, ChevronRight,
  Star, Award, ArrowUpRight
} from 'lucide-react';

export function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;
      try {
        const data = await dashboardApi.getRecruiterDashboard(user.id);
        setDashboard(data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#A855F7]/20 border-t-[#A855F7] rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Jobs Posted',
      value: dashboard?.totalJobsPosted || 0,
      icon: Briefcase,
      color: 'text-[#7C3AED]',
      bgColor: 'bg-[#7C3AED]/20',
      change: '+2',
      path: '/recruiter/jobs',
    },
    {
      label: 'Total Applicants',
      value: dashboard?.totalApplicants || 0,
      icon: Users,
      color: 'text-[#A855F7]',
      bgColor: 'bg-[#A855F7]/20',
      change: '+12',
      path: '/recruiter/applicants',
    },
    {
      label: 'Avg Match Score',
      value: dashboard?.averageMatchScore || 0,
      suffix: '%',
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
      change: '+5%',
      path: '/recruiter/applicants',
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-up">
            <div>
              <h1 className="heading-lg text-foreground mb-2">
                Welcome back, {user?.name.split(' ')[0]}
              </h1>
              <p className="text-muted-foreground">
                Here&apos;s what&apos;s happening with your hiring
              </p>
            </div>
            <Button 
              className="btn-primary group"
              onClick={() => navigate('/recruiter/create-job')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Post New Job
            </Button>
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
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-400">
                      <ArrowUpRight className="w-4 h-4" />
                      {stat.change}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                  <p className={`text-3xl font-display font-bold ${stat.color}`}>
                    {stat.value}{stat.suffix || ''}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <div className="glass-card p-6 animate-fade-up">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                  Quick Actions
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="justify-start btn-secondary h-auto py-4 group"
                    onClick={() => navigate('/recruiter/create-job')}
                  >
                    <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-[#A855F7]/20 transition-colors">
                      <Plus className="w-5 h-5 text-[#A855F7]" />
                    </div>
                    <div className="text-left">
                      <p className="text-foreground font-medium transition-colors group-hover:text-foreground">Post a Job</p>
                      <p className="text-muted-foreground text-xs transition-colors group-hover:text-foreground">Create a new job listing</p>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start btn-secondary h-auto py-4 group"
                    onClick={() => navigate('/recruiter/applicants')}
                  >
                    <div className="w-10 h-10 bg-[#7C3AED]/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-[#7C3AED]/30 transition-colors">
                      <Users className="w-5 h-5 text-[#7C3AED]" />
                    </div>
                    <div className="text-left">
                      <p className="text-foreground font-medium transition-colors group-hover:text-foreground">Review Applicants</p>
                      <p className="text-muted-foreground text-xs transition-colors group-hover:text-foreground">Screen and rate candidates</p>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card p-6 animate-fade-up animate-delay-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    Recent Activity
                  </h3>
                  <Button 
                    variant="ghost" 
                    className="text-[#A855F7] hover:text-[#C084FC]"
                    onClick={() => navigate('/recruiter/applicants')}
                  >
                    View all
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {dashboard?.topCandidates && dashboard.topCandidates.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.topCandidates.slice(0, 3).map((candidate) => (
                      <div 
                        key={candidate.user.id}
                        onClick={() => navigate(`/recruiter/candidate/${candidate.applicationId}`)}
                        className="flex items-center justify-between p-4 bg-[#7C3AED]/10 rounded-xl cursor-pointer hover:bg-[#7C3AED]/20 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center">
                            <Award className="w-5 h-5 text-[#A855F7]" />
                          </div>
                          <div>
                            <p className="text-foreground font-medium group-hover:text-[#A855F7] transition-colors">{candidate.user.name}</p>
                            <p className="text-muted-foreground text-sm">
                              {candidate.resume.skills.slice(0, 3).join(', ')}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[#A855F7] font-semibold">{candidate.matchScore}%</p>
                          <p className="text-muted-foreground text-xs">Match</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No applicants yet</p>
                    <Button 
                      className="btn-primary"
                      onClick={() => navigate('/recruiter/create-job')}
                    >
                      Post Your First Job
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Top Candidates */}
              <div className="glass-card p-6 animate-fade-up animate-delay-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-[#A855F7]" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    Top Candidates
                  </h3>
                </div>
                
                {dashboard?.topCandidates && dashboard.topCandidates.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.topCandidates.slice(0, 5).map((candidate, i) => (
                      <div 
                        key={candidate.user.id}
                        onClick={() => navigate(`/recruiter/candidate/${candidate.applicationId}`)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-8 h-8 bg-[#7C3AED]/20 rounded-full flex items-center justify-center text-sm font-medium text-foreground">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground text-sm font-medium group-hover:text-[#A855F7] transition-colors">
                            {candidate.user.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {candidate.resume.skills.slice(0, 2).join(', ')}
                          </p>
                        </div>
                        <span className="text-[#A855F7] font-semibold text-sm">
                          {candidate.matchScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No candidates yet
                  </p>
                )}
              </div>

              {/* Hiring Tips */}
              <div className="glass-card p-6 animate-fade-up animate-delay-300">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                  Hiring Tips
                </h3>
                <ul className="space-y-3">
                  {[
                    'Use specific skill requirements for better matches',
                    'Respond to applicants within 48 hours',
                    'Include salary range to attract more candidates',
                    'Use AI screening to save time',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-[#A855F7] rounded-full mt-2 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
