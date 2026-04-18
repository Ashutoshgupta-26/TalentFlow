import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from '@/router';
import { resumeApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, FileText, X, Loader2, CheckCircle, 
  TrendingUp, GraduationCap, Briefcase, Award,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export function ResumeUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadResume = async () => {
      if (!user) return;
      try {
        const existingResume = await resumeApi.getByUserId(user.id);
        if (existingResume) {
          setResume(existingResume);
        }
      } catch (error) {
        console.error('Failed to load resume:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadResume();
  }, [user]);

  const handleFile = async (file) => {
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      setIsAnalyzing(true);
      const uploadedResume = await resumeApi.upload(file, user.id);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setResume(uploadedResume);
        setIsUploading(false);
        setIsAnalyzing(false);
        toast.success('Resume uploaded and analyzed successfully!');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setIsAnalyzing(false);
      toast.error('Failed to upload resume');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [user]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-400/20';
    if (score >= 60) return 'bg-yellow-400/20';
    return 'bg-red-400/20';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="heading-lg text-foreground mb-2">
              {resume ? 'Your Resume' : 'Upload Your Resume'}
            </h1>
            <p className="text-muted-foreground">
              {resume 
                ? 'View your ATS score and extracted information' 
                : 'Upload your resume to get an ATS score and personalized job matches'}
            </p>
          </div>

          {/* Upload Area */}
          {!resume && (
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-card p-8 mb-8 cursor-pointer transition-all animate-fade-up glow-border ${
                isDragActive 
                  ? 'border-2 border-purple-500 bg-purple-500/5' 
                  : 'border-2 border-dashed border-white/20 hover:border-purple-500/50'
              } ${isUploading ? 'pointer-events-none' : ''}`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf" 
                onChange={handleFileInput}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                    {isAnalyzing ? 'Analyzing your resume...' : 'Uploading...'}
                  </h3>
                  <div className="max-w-xs mx-auto">
                    <Progress value={uploadProgress} className="h-2 bg-purple-500/20" />
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">{uploadProgress}%</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                    {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    or click to browse files (PDF only)
                  </p>
                  <Button className="btn-primary group">
                    Select File
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Resume Analysis Results */}
          {resume && (
            <div className="space-y-6 animate-fade-up">
              {/* ATS Score Card */}
              <div className="glass-card p-8 glow-border">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className={`w-32 h-32 rounded-full ${getScoreBg(resume.atsScore)} flex flex-col items-center justify-center glow-purple`}>
                    <TrendingUp className={`w-8 h-8 ${getScoreColor(resume.atsScore)} mb-1`} />
                    <span className={`text-4xl font-display font-bold ${getScoreColor(resume.atsScore)}`}>
                      {resume.atsScore}
                    </span>
                    <span className="text-muted-foreground text-xs">/100</span>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-display font-semibold text-foreground mb-2">
                      ATS Score: {resume.atsScore >= 80 ? 'Excellent' : resume.atsScore >= 60 ? 'Good' : 'Needs Improvement'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {resume.atsScore >= 80 
                        ? 'Your resume is well-optimized for ATS systems. Great job!'
                        : resume.atsScore >= 60
                        ? 'Your resume is decent but could use some improvements.'
                        : 'Your resume needs significant improvements to pass ATS filters.'}
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <Button 
                        className="btn-primary group"
                        onClick={() => navigate('/candidate/jobs')}
                      >
                        View Job Matches
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                      <Button 
                        variant="outline"
                        className="btn-secondary"
                        onClick={() => setResume(null)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Upload New
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Skills */}
                <div className="glass-card p-6 animate-fade-up animate-delay-100 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      Extracted Skills
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill) => (
                      <span 
                        key={skill}
                        className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm text-foreground hover:border-purple-400/50 hover:scale-105 transition-all cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* File Info */}
                <div className="glass-card p-6 animate-fade-up animate-delay-200 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      File Details
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filename</span>
                      <span className="text-foreground">{resume.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uploaded</span>
                      <span className="text-foreground">
                        {new Date(resume.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <CheckCircle className="w-4 h-4" />
                        Processed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Education */}
              {resume.education.length > 0 && (
                <div className="glass-card p-6 animate-fade-up animate-delay-300 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      Education
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {resume.education.map((edu, i) => (
                      <div key={i} className="p-4 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors">
                        <p className="text-foreground font-medium">{edu.institution}</p>
                        <p className="text-muted-foreground text-sm">{edu.degree} in {edu.field}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {(edu.startDate || edu.start_date)} - {(edu.endDate || edu.end_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {resume.experience.length > 0 && (
                <div className="glass-card p-6 animate-fade-up animate-delay-400 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      Experience
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {resume.experience.map((exp, i) => (
                      <div key={i} className="p-4 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors">
                        <p className="text-foreground font-medium">{exp.title}</p>
                        <p className="text-muted-foreground text-sm">{exp.company}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {(exp.startDate || exp.start_date)} - {(exp.endDate || exp.end_date)}
                        </p>
                        <p className="text-muted-foreground text-sm mt-2">{exp.description || exp.description_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvement Tips */}
              {resume.atsScore < 80 && (
                <div className="glass-card p-6 border border-yellow-400/20 animate-fade-up glow-border">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                        Improvement Tips
                      </h3>
                      <ul className="space-y-2 text-muted-foreground text-sm">
                        <li>• Add more relevant keywords from job descriptions</li>
                        <li>• Use standard section headings (Experience, Education, Skills)</li>
                        <li>• Quantify your achievements with numbers</li>
                        <li>• Remove graphics and tables that ATS can&apos;t read</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
