import { useEffect, useState } from 'react';
import { useNavigate } from '@/router';
import { jobApi, applicationApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Search, TrendingUp, Briefcase, CheckCircle, XCircle,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';

export function Applicants() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score');

  useEffect(() => {
    const loadJobs = async () => {
      if (!user) return;
      try {
        const data = await jobApi.getByRecruiterId(user.id);
        setJobs(data);
      } catch (error) {
        console.error('Failed to load jobs:', error);
      }
    };
    loadJobs();
  }, [user]);

  useEffect(() => {
    const loadApplicants = async () => {
      setIsLoading(true);
      try {
        let allApplicants = [];
        
        if (selectedJobId === 'all') {
          for (const job of jobs) {
            const jobApplicants = await applicationApi.getByJobId(job.id);
            allApplicants = [...allApplicants, ...jobApplicants];
          }
        } else {
          allApplicants = await applicationApi.getByJobId(selectedJobId);
        }
        
        setApplicants(allApplicants);
      } catch (error) {
        console.error('Failed to load applicants:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (jobs.length > 0) {
      loadApplicants();
    } else {
      setIsLoading(false);
    }
  }, [jobs, selectedJobId]);

  const handleStatusUpdate = async (applicationId, status) => {
    try {
      await applicationApi.updateStatus(applicationId, status);
      toast.success(`Applicant ${status === 'shortlisted' ? 'shortlisted' : 'rejected'}`);
      
      setApplicants(prev => prev.map(app => 
        app.application.id === applicationId 
          ? { ...app, application: { ...app.application, status } }
          : app
      ));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredApplicants = applicants
    .filter(app => {
      const matchesSearch = 
        app.candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.resume.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return b.matchScore - a.matchScore;
      }
      return a.candidate.name.localeCompare(b.candidate.name);
    });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'shortlisted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Shortlisted
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-400/20 text-red-400 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-full text-xs font-medium">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-up">
            <div>
              <h1 className="heading-lg text-foreground mb-2">
                Applicants
              </h1>
              <p className="text-muted-foreground">
                Review and manage job applicants
              </p>
            </div>
            <div className="flex items-center gap-2 text-[#A855F7]">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{applicants.length} total</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6 animate-fade-up">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12"
              />
            </div>
            
            <div className="flex gap-3">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="px-4 py-3 bg-[#7C3AED]/10 border border-[#A855F7]/20 rounded-xl text-foreground focus:outline-none focus:border-[#A855F7]/50"
              >
                <option value="all">All Jobs</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
              
              <Button
                variant="outline"
                className="btn-secondary"
                onClick={() => setSortBy(sortBy === 'score' ? 'name' : 'score')}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort by {sortBy === 'score' ? 'Name' : 'Score'}
              </Button>
            </div>
          </div>

          {/* Applicants Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[#A855F7]/20 border-t-[#A855F7] rounded-full animate-spin" />
            </div>
          ) : filteredApplicants.length > 0 ? (
            <div className="glass-card overflow-hidden animate-fade-up glow-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-muted-foreground font-medium text-sm">Candidate</th>
                      <th className="text-left p-4 text-muted-foreground font-medium text-sm">Skills</th>
                      <th className="text-left p-4 text-muted-foreground font-medium text-sm">Match Score</th>
                      <th className="text-left p-4 text-muted-foreground font-medium text-sm">Status</th>
                      <th className="text-left p-4 text-muted-foreground font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.map((applicant) => (
                      <tr 
                        key={applicant.application.id}
                        className="border-b border-white/5 hover:bg-[#7C3AED]/10 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center">
                              <span className="text-[#A855F7] font-semibold">
                                {applicant.candidate.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-foreground font-medium">{applicant.candidate.name}</p>
                              <p className="text-muted-foreground text-xs">{applicant.candidate.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {applicant.resume.skills.slice(0, 3).map(skill => (
                              <span 
                                key={skill}
                                className="px-2 py-0.5 bg-[#7C3AED]/20 rounded text-xs text-muted-foreground"
                              >
                                {skill}
                              </span>
                            ))}
                            {applicant.resume.skills.length > 3 && (
                              <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                +{applicant.resume.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              applicant.matchScore >= 80 ? 'bg-[#A855F7]/20' :
                              applicant.matchScore >= 60 ? 'bg-yellow-400/20' : 'bg-red-400/20'
                            }`}>
                              <TrendingUp className={`w-4 h-4 ${
                                applicant.matchScore >= 80 ? 'text-[#A855F7]' :
                                applicant.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                              }`} />
                            </div>
                            <span className={`text-lg font-semibold ${
                              applicant.matchScore >= 80 ? 'text-[#A855F7]' :
                              applicant.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {applicant.matchScore}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(applicant.application.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs btn-secondary"
                              onClick={() => navigate(`/recruiter/candidate/${applicant.application.id}`)}
                            >
                              View
                            </Button>
                            {applicant.application.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="text-xs btn-primary group"
                                  onClick={() => handleStatusUpdate(applicant.application.id, 'shortlisted')}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Shortlist
                                </Button>
                                <Button
                                  size="sm"
                                  className="text-xs btn-primary group"
                                  onClick={() => handleStatusUpdate(applicant.application.id, 'rejected')}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center animate-fade-up glow-border">
              <div className="w-16 h-16 bg-[#7C3AED]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                No applicants yet
              </h3>
              <p className="text-muted-foreground mb-6">
                {selectedJobId === 'all' 
                  ? "You don't have any applicants yet. Post more jobs to attract candidates!"
                  : "No applicants for this job yet."}
              </p>
              <Button 
                className="btn-primary"
                onClick={() => navigate('/recruiter/create-job')}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Post a Job
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
