import { useEffect, useState } from 'react';
import { applicationApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Briefcase, Building2, Clock, CheckCircle, 
  XCircle, Calendar, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ApplicationHistory() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadApplications = async () => {
      if (!user) return;
      try {
        const data = await applicationApi.getByCandidateId(user.id);
        setApplications(data);
      } catch (error) {
        console.error('Failed to load applications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadApplications();
  }, [user]);

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'shortlisted':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/20',
          label: 'Shortlisted',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          label: 'Rejected',
        };
      case 'hired':
        return {
          icon: CheckCircle,
          color: 'text-purple-400',
          bgColor: 'bg-purple-400/20',
          label: 'Hired',
        };
      default:
        return {
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          label: 'Pending',
        };
    }
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    hired: applications.filter(a => a.status === 'hired').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="heading-lg text-foreground mb-2">
              Application History
            </h1>
            <p className="text-muted-foreground">
              Track the status of your job applications
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total', value: stats.total, color: 'text-foreground' },
              { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
              { label: 'Shortlisted', value: stats.shortlisted, color: 'text-green-400' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
              { label: 'Hired', value: stats.hired, color: 'text-purple-400' },
            ].map((stat, i) => (
              <div 
                key={stat.label}
                className="glass-card p-4 text-center animate-fade-up hover-lift cursor-default"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <p className={`text-2xl font-display font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-6 animate-fade-up">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            >
              All
            </Button>
            {['pending', 'shortlisted', 'rejected', 'hired'].map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
                className={filter === status ? 'btn-primary' : 'btn-secondary'}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          {/* Applications List */}
          {filteredApplications.length > 0 ? (
            <div className="space-y-4">
              {filteredApplications.map((app, i) => {
                const statusConfig = getStatusConfig(app.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div 
                    key={app.id}
                    className="glass-card p-6 animate-fade-up hover:border-purple-500/30 transition-all glow-border group"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Company Icon */}
                      <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-purple-500/30 transition-all">
                        <Briefcase className="w-7 h-7 text-purple-400" />
                      </div>

                      {/* Job Details */}
                      <div className="flex-1">
                        <h3 className="text-lg font-display font-semibold text-foreground mb-1 group-hover:text-purple-400 transition-colors">
                          {app.job?.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {app.job?.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Match Score */}
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        <span className="text-foreground font-semibold">{app.matchScore}%</span>
                        <span className="text-muted-foreground text-sm">match</span>
                      </div>

                      {/* Status */}
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${statusConfig.bgColor}`}>
                        <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                        <span className={`font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-12 text-center animate-fade-up glow-border">
              <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                No applications yet
              </h3>
              <p className="text-muted-foreground mb-6">
                {filter === 'all' 
                  ? "You haven't applied to any jobs yet. Start browsing to find your perfect match!"
                  : `No ${filter} applications found.`}
              </p>
              {filter === 'all' && (
                <Button 
                  className="btn-primary"
                  onClick={() => window.location.href = '/candidate/jobs'}
                >
                  Browse Jobs
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
