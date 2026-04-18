import { useEffect, useState } from 'react';
import { useNavigate } from '@/router';
import { jobApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, Plus, MapPin, DollarSign, Users,
  Clock, MoreHorizontal, Edit, Trash2, Eye
} from 'lucide-react';
import { toast } from 'sonner';

export function JobsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      if (!user) return;
      try {
        const data = await jobApi.getByRecruiterId(user.id);
        setJobs(data);
      } catch (error) {
        console.error('Failed to load jobs:', error);
        toast.error('Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    };
    loadJobs();
  }, [user]);

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success('Job deleted successfully');
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-xs font-medium">
        <Clock className="w-3 h-3" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-muted-foreground/20 text-muted-foreground rounded-full text-xs font-medium">
        <Eye className="w-3 h-3" />
        Closed
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#A855F7]/20 border-t-[#A855F7] rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-up">
            <div>
              <h1 className="heading-lg text-foreground mb-2">
                Your Jobs
              </h1>
              <p className="text-muted-foreground">
                Manage your job postings
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

          {/* Jobs List */}
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job, i) => (
                <div 
                  key={job.id}
                  className="glass-card p-6 animate-fade-up hover:border-[#A855F7]/30 transition-all glow-border group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-display font-semibold text-foreground mb-1 group-hover:text-[#A855F7] transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-muted-foreground text-sm">{job.company}</p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {job.salary}
                          </span>
                        )}
                        <span className="capitalize px-2 py-0.5 bg-[#7C3AED]/20 rounded text-xs">
                          {job.experienceLevel} Level
                        </span>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-2">
                        {job.requiredSkills.slice(0, 4).map((skill) => (
                          <span 
                            key={skill}
                            className="px-2 py-1 bg-[#7C3AED]/20 rounded-lg text-xs text-muted-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 4 && (
                          <span className="px-2 py-1 text-xs text-muted-foreground">
                            +{job.requiredSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="btn-secondary"
                        onClick={() => navigate('/recruiter/applicants')}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        View Applicants
                      </Button>
                      <div className="relative group/menu">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                        <div className="absolute right-0 top-full mt-2 w-40 bg-background border border-[#A855F7]/20 rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                          <button
                            onClick={() => toast.info('Edit feature coming soon!')}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-[#7C3AED]/10 first:rounded-t-xl transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 last:rounded-b-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center animate-fade-up glow-border">
              <div className="w-16 h-16 bg-[#7C3AED]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                No jobs posted yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first job posting to start receiving applications
              </p>
              <Button 
                className="btn-primary"
                onClick={() => navigate('/recruiter/create-job')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Post Your First Job
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
