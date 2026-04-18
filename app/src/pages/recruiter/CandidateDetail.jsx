import { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@/router';
import { applicationApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Mail, Briefcase, CheckCircle, XCircle,
  Clock, Download, FileText, TrendingUp,
  GraduationCap, Award
} from 'lucide-react';
import { toast } from 'sonner';

export function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadApplicant = async () => {
      if (!id) return;
      try {
        const found = await applicationApi.getById(id);
        setApplicant(found);
      } catch (error) {
        console.error('Failed to load applicant:', error);
        toast.error('Failed to load candidate details');
      } finally {
        setIsLoading(false);
      }
    };
    loadApplicant();
  }, [id]);

  const handleStatusUpdate = async (status) => {
    if (!applicant) return;
    
    setIsUpdating(true);
    try {
      await applicationApi.updateStatus(applicant.application.id, status);
      toast.success(`Status updated to ${status}`);
      setApplicant(prev => prev ? {
        ...prev,
        application: { ...prev.application, status }
      } : null);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'text-[#A855F7]';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMatchBg = (score) => {
    if (score >= 80) return 'bg-[#A855F7]/20';
    if (score >= 60) return 'bg-yellow-400/20';
    return 'bg-red-400/20';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#A855F7]/20 border-t-[#A855F7] rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12">
        <div className="section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <div className="glass-card p-12 glow-border">
              <div className="w-20 h-20 bg-[#7C3AED]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="heading-md text-foreground mb-4">
                Candidate Not Found
              </h2>
              <p className="text-muted-foreground mb-8">
                The candidate you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <Button 
                className="btn-primary group"
                onClick={() => navigate('/recruiter/applicants')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Applicants
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
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 animate-fade-up">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/recruiter/applicants')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="heading-lg text-foreground">Candidate Profile</h1>
              <p className="text-muted-foreground">Review candidate details and make a decision</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="glass-card p-6 animate-fade-up glow-border">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="w-20 h-20 bg-[#A855F7]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl font-display font-bold text-[#A855F7]">
                      {applicant.candidate.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
                      {applicant.candidate.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {applicant.candidate.email}
                      </span>
                    </div>
                    
                    {/* Match Score */}
                    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl ${getMatchBg(applicant.matchScore)}`}>
                      <TrendingUp className={`w-5 h-5 ${getMatchColor(applicant.matchScore)}`} />
                      <div>
                        <span className={`text-2xl font-display font-bold ${getMatchColor(applicant.matchScore)}`}>
                          {applicant.matchScore}%
                        </span>
                        <span className={`text-sm ml-2 ${getMatchColor(applicant.matchScore)}`}>
                          Match Score
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="glass-card p-6 animate-fade-up animate-delay-100 glow-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-[#A855F7]" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    Skills
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {applicant.resume.skills.map((skill) => (
                    <span 
                      key={skill}
                      className="px-3 py-1.5 bg-[#7C3AED]/20 border border-[#A855F7]/20 rounded-lg text-sm text-foreground hover:border-[#A855F7]/50 hover:scale-105 transition-all cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience */}
              {applicant.resume.experience.length > 0 && (
                <div className="glass-card p-6 animate-fade-up animate-delay-200 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-[#A855F7]" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      Experience
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {applicant.resume.experience.map((exp, i) => (
                      <div key={i} className="p-4 bg-[#7C3AED]/10 rounded-xl hover:bg-[#7C3AED]/20 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-foreground font-medium">{exp.title}</p>
                            <p className="text-muted-foreground text-sm">{exp.company}</p>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {exp.startDate} - {exp.endDate}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {applicant.resume.education.length > 0 && (
                <div className="glass-card p-6 animate-fade-up animate-delay-300 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-[#A855F7]" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      Education
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {applicant.resume.education.map((edu, i) => (
                      <div key={i} className="p-4 bg-[#7C3AED]/10 rounded-xl hover:bg-[#7C3AED]/20 transition-colors">
                        <p className="text-foreground font-medium">{edu.institution}</p>
                        <p className="text-muted-foreground text-sm">{edu.degree} in {edu.field}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {edu.startDate} - {edu.endDate}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status Card */}
              <div className="glass-card p-6 animate-fade-up animate-delay-200 glow-border">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                  Application Status
                </h3>
                
                <div className="mb-6">
                  {applicant.application.status === 'shortlisted' && (
                    <div className="flex items-center gap-2 p-3 bg-green-400/20 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">Shortlisted</span>
                    </div>
                  )}
                  {applicant.application.status === 'rejected' && (
                    <div className="flex items-center gap-2 p-3 bg-red-400/20 rounded-xl">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">Rejected</span>
                    </div>
                  )}
                  {applicant.application.status === 'pending' && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-400/20 rounded-xl">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">Pending Review</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {applicant.application.status !== 'shortlisted' && (
                    <Button
                      className="w-full btn-primary group"
                      onClick={() => handleStatusUpdate('shortlisted')}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Shortlist Candidate
                    </Button>
                  )}
                  {applicant.application.status !== 'rejected' && (
                    <Button
                      className="w-full btn-primary group"
                      onClick={() => handleStatusUpdate('rejected')}
                      disabled={isUpdating}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Candidate
                    </Button>
                  )}
                  {applicant.application.status !== 'pending' && (
                    <Button
                      variant="outline"
                      className="w-full btn-secondary"
                      onClick={() => handleStatusUpdate('pending')}
                      disabled={isUpdating}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Mark as Pending
                    </Button>
                  )}
                </div>
              </div>

              {/* Resume Download */}
              <div className="glass-card p-6 animate-fade-up animate-delay-300 glow-border">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                  Resume
                </h3>
                <div className="flex items-center gap-3 p-4 bg-[#7C3AED]/10 rounded-xl mb-4">
                  <div className="w-10 h-10 bg-[#A855F7]/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#A855F7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">
                      {applicant.resume.fileName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Uploaded {new Date(applicant.resume.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full btn-secondary"
                  onClick={() => toast.info('Resume download coming soon!')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Resume
                </Button>
              </div>

              {/* ATS Score */}
              <div className="glass-card p-6 animate-fade-up animate-delay-400 glow-border">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                  ATS Score
                </h3>
                <div className="flex items-center justify-center">
                  <div className={`w-24 h-24 rounded-full ${getMatchBg(applicant.resume.atsScore)} flex flex-col items-center justify-center glow-gold`}>
                    <span className={`text-3xl font-display font-bold ${getMatchColor(applicant.resume.atsScore)}`}>
                      {applicant.resume.atsScore}
                    </span>
                    <span className="text-muted-foreground text-xs">/100</span>
                  </div>
                </div>
                <p className="text-center text-muted-foreground text-sm mt-4">
                  Candidate&apos;s resume is well-optimized for ATS systems
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
