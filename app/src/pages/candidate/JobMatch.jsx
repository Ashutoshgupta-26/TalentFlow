import { useEffect, useState } from 'react';
import { useNavigate } from '@/router';
import { jobApi, applicationApi, resumeApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, MapPin, DollarSign, TrendingUp, 
  CheckCircle, XCircle, Loader2, Search,
  Building2, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export function JobMatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobMatches, setJobMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [hasResume, setHasResume] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        // Check if user has resume
        const resume = await resumeApi.getByUserId(user.id);
        setHasResume(!!resume);
        
        // Load job matches
        const matches = await jobApi.getMatches(user.id);
        setJobMatches(matches);
      } catch (error) {
        console.error('Failed to load job matches:', error);
        toast.error('Failed to load job matches');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleApply = async (jobId) => {
    if (!user) return;
    
    setApplyingId(jobId);
    try {
      const resume = await resumeApi.getByUserId(user.id);
      if (!resume) {
        toast.error('Please upload your resume first');
        navigate('/candidate/resume');
        return;
      }
      
      await applicationApi.apply(jobId, user.id, resume.id);
      toast.success('Application submitted successfully!');
      
      // Update local state to show applied
      setJobMatches(prev => prev.map(match => 
        match.job.id === jobId 
          ? { ...match, applied: true } 
          : match
      ));
    } catch (error) {
      toast.error('Failed to submit application');
    } finally {
      setApplyingId(null);
    }
  };

  const filteredMatches = jobMatches.filter(match => {
    const matchesSearch = 
      match.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.job.requiredSkills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLevel = filterLevel === 'all' || match.job.experienceLevel === filterLevel;
    
    return matchesSearch && matchesLevel;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  if (!hasResume) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12">
        <div className="section-padding">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-card p-12 glow-border">
              <div className="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="heading-md text-foreground mb-4">
                Upload Your Resume First
              </h2>
              <p className="text-muted-foreground mb-8">
                To get personalized job matches, please upload your resume so we can analyze your skills and experience.
              </p>
              <Button 
                className="btn-primary group"
                onClick={() => navigate('/candidate/resume')}
              >
                Upload Resume
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
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
              Job Matches
            </h1>
            <p className="text-muted-foreground">
              Jobs matched to your skills and experience
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-up">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jobs, companies, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-foreground focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">All Levels</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
              </select>
            </div>
          </div>

          {/* Results */}
          {filteredMatches.length > 0 ? (
            <div className="space-y-4">
              {filteredMatches.map((match, i) => {
                const isHighMatch = match.matchPercentage >= 80;
                const isMediumMatch = match.matchPercentage >= 60;
                
                return (
                  <div 
                    key={match.job.id}
                    className="glass-card p-6 animate-fade-up hover:border-purple-500/30 transition-all glow-border group"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Job Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-display font-semibold text-foreground mb-1 group-hover:text-purple-400 transition-colors">
                              {match.job.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {match.job.company}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {match.job.location}
                              </span>
                              {match.job.salary && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {match.job.salary}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Match Score */}
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                            isHighMatch ? 'bg-green-400/20' : 
                            isMediumMatch ? 'bg-yellow-400/20' : 'bg-red-400/20'
                          }`}>
                            <TrendingUp className={`w-5 h-5 ${
                              isHighMatch ? 'text-green-400' : 
                              isMediumMatch ? 'text-yellow-400' : 'text-red-400'
                            }`} />
                            <span className={`text-2xl font-display font-bold ${
                              isHighMatch ? 'text-green-400' : 
                              isMediumMatch ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {match.matchPercentage}%
                            </span>
                          </div>
                        </div>

                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {match.job.description}
                        </p>

                        {/* Skills */}
                        <div className="space-y-3">
                          {/* Matching Skills */}
                          {match.matchingSkills.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-muted-foreground">Matching:</span>
                              {match.matchingSkills.map((skill) => (
                                <span 
                                  key={skill}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-400/20 text-green-400 rounded-lg text-xs"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Missing Skills */}
                          {match.missingSkills.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-muted-foreground">Missing:</span>
                              {match.missingSkills.slice(0, 3).map((skill) => (
                                <span 
                                  key={skill}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-400/20 text-red-400 rounded-lg text-xs"
                                >
                                  <XCircle className="w-3 h-3" />
                                  {skill}
                                </span>
                              ))}
                              {match.missingSkills.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{match.missingSkills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Apply Button */}
                      <div className="flex flex-col items-end gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          match.job.experienceLevel === 'senior' ? 'bg-purple-500/20 text-purple-400' :
                          match.job.experienceLevel === 'mid' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {match.job.experienceLevel}
                        </span>
                        
                        {match.applied ? (
                          <Button 
                            disabled
                            className="bg-green-400/20 text-green-400 cursor-default"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Applied
                          </Button>
                        ) : (
                          <Button 
                            className="btn-primary group"
                            onClick={() => handleApply(match.job.id)}
                            disabled={applyingId === match.job.id}
                          >
                            {applyingId === match.job.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              'Apply Now'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-12 text-center animate-fade-up glow-border">
              <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                No matches found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find more jobs
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
