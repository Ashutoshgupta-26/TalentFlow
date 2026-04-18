import { useState } from 'react';
import { useNavigate } from '@/router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { atsApi } from '@/services/api';
import { 
  FileText, TrendingUp, CheckCircle, XCircle, 
  Sparkles, ArrowLeft, Loader2, Briefcase, Award, RotateCcw, History
} from 'lucide-react';
import { toast } from 'sonner';

export function JobATSChecker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState({});

  const analyzeATS = async () => {
    if (!resumeFile) {
      setError('Please upload a resume PDF first.');
      toast.error('Please upload a resume PDF first');
      return;
    }

    if (resumeFile.type !== 'application/pdf' && !resumeFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      toast.error('Only PDF files are supported');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter the job description.');
      toast.error('Please enter the job description');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    
    try {
      const data = await atsApi.analyze(resumeFile, jobDescription, user?.id, true);
      setResult({
        score: data.score ?? 0,
        summary: data.summary || 'Needs Improvement',
        matchedKeywords: data.matched_keywords || [],
        missingKeywords: data.missing_keywords || [],
        suggestions: data.suggestions || [],
        message: data.message || '',
      });
      
      toast.success('ATS analysis complete!');
    } catch (error) {
      const message = error?.message || 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score > 70) return 'text-green-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score > 70) return 'bg-green-400/20';
    if (score >= 40) return 'bg-orange-400/20';
    return 'bg-red-400/20';
  };

  const resetAnalysis = () => {
    setResult(null);
    setError('');
    setJobDescription('');
    setResumeFile(null);
  };

  const loadHistory = async () => {
    if (!user?.id) {
      toast.error('Login is required to view history');
      return;
    }

    setIsLoadingHistory(true);
    try {
      const rows = await atsApi.getHistory(user.id, 30);
      setHistoryItems(Array.isArray(rows) ? rows : []);
      setIsHistoryOpen(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to load ATS history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistoryDescription = (id) => {
    setExpandedHistoryIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 animate-fade-up">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/candidate/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="heading-lg text-foreground">Job ATS Checker</h1>
              <p className="text-muted-foreground">Check how well your resume matches a specific job</p>
            </div>
            <div className="ml-auto">
              <Button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="btn-secondary"
              >
                {isLoadingHistory ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4 mr-2" />
                    History
                  </>
                )}
              </Button>
            </div>
          </div>

          {isHistoryOpen && (
            <div className="glass-card p-6 glow-border mb-6 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-semibold text-foreground">ATS History</h3>
                <Button variant="ghost" onClick={() => setIsHistoryOpen(false)}>Close</Button>
              </div>

              {historyItems.length === 0 ? (
                <p className="text-muted-foreground">No history available yet.</p>
              ) : (
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  {historyItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border/50 bg-background/30 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleString() : 'No date'}</p>
                        <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${getScoreBg(item.score)} ${getScoreColor(item.score)}`}>
                          Score: {item.score}/100
                        </div>
                      </div>

                      <p className="text-sm text-foreground mb-2">
                        <span className="font-semibold">Resume:</span> {item.resume_file_name || 'Unknown file (older record)'}
                      </p>
                      <p className="text-sm text-foreground mb-2">
                        <span className="font-semibold">Summary:</span> {item.summary}
                      </p>
                      {item.message && (
                        <p className="text-sm text-muted-foreground mb-2">
                          <span className="font-semibold text-foreground">Message:</span> {item.message}
                        </p>
                      )}

                      <div className="mb-3">
                        <p className="text-sm font-semibold text-foreground mb-1">Job Description</p>
                        <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${expandedHistoryIds[item.id] ? '' : 'line-clamp-4'}`}>
                          {item.job_description || 'No job description saved.'}
                        </p>
                        {item.job_description && item.job_description.length > 260 && (
                          <Button
                            variant="ghost"
                            className="mt-2 h-7 px-2 text-xs"
                            onClick={() => toggleHistoryDescription(item.id)}
                          >
                            {expandedHistoryIds[item.id] ? 'Show less' : 'Show full description'}
                          </Button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-green-400 mb-1">Matching Keywords</p>
                          {(item.matched_keywords || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {(item.matched_keywords || []).map((kw, idx) => (
                                <span key={`${item.id}-mk-${idx}`} className="px-2 py-1 bg-green-500/10 text-green-400 rounded-md text-xs border border-green-500/20">{kw}</span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No matching keywords saved.</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-400 mb-1">Missing Keywords</p>
                          {(item.missing_keywords || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {(item.missing_keywords || []).map((kw, idx) => (
                                <span key={`${item.id}-msk-${idx}`} className="px-2 py-1 bg-red-500/10 text-red-400 rounded-md text-xs border border-red-500/20">{kw}</span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No missing keywords saved.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">Suggestions</p>
                        {(item.suggestions || []).length > 0 ? (
                          <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                            {(item.suggestions || []).map((s, idx) => (
                              <li key={`${item.id}-suggestion-${idx}`}>{s}</li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-xs text-muted-foreground">No suggestions saved for this record.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!result ? (
            <div className="space-y-6 animate-fade-up">
              {/* Job Description Input */}
              <div className="glass-card p-6 glow-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center glow-purple">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    Job Description
                  </h3>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="textarea-field w-full"
                  rows={6}
                />
              </div>

              {/* Resume Input */}
              <div className="glass-card p-6 glow-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center glow-pink">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    Your Resume
                  </h3>
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-border/50 bg-background/30 px-4 py-3 text-sm text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Upload PDF only. We will extract text and run ATS analysis.
                </p>
                {resumeFile && (
                  <p className="text-sm text-foreground mt-2">Selected: {resumeFile.name}</p>
                )}
              </div>

              {error && (
                <div className="glass-card p-4 border border-red-500/30 text-red-300">
                  {error}
                </div>
              )}

              {/* Analyze Button - 3D */}
              <Button
                onClick={analyzeATS}
                disabled={isAnalyzing}
                className="btn-primary w-full py-6 text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing your resume...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Check ATS Score
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-scale-in">
              {/* Score Card */}
              <div className="glass-card p-8 text-center glow-border">
                <div className={`w-40 h-40 mx-auto rounded-full ${getScoreBg(result.score)} flex flex-col items-center justify-center mb-6 glow-purple`}>
                  <TrendingUp className={`w-8 h-8 ${getScoreColor(result.score)} mb-1`} />
                  <span className={`text-5xl font-display font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </span>
                  <span className="text-muted-foreground text-sm">/100</span>
                </div>
                
                <h3 className="text-2xl font-display font-semibold text-foreground mb-2">
                  {result.summary}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {result.message || 'ATS analysis generated based on your uploaded resume and job description.'}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Matching Keywords */}
                <div className="glass-card p-6 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      Matching Keywords ({result.matchedKeywords.length})
                    </h3>
                  </div>
                  {result.matchedKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.matchedKeywords.map((kw) => (
                        <span 
                          key={kw}
                          className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No matching keywords found. Consider adding more relevant skills.</p>
                  )}
                </div>

                {/* Missing Keywords */}
                <div className="glass-card p-6 glow-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      Missing Keywords ({result.missingKeywords.length})
                    </h3>
                  </div>
                  {result.missingKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map((kw) => (
                        <span 
                          key={kw}
                          className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Great! No important keywords missing.</p>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="glass-card p-6 glow-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center glow-purple">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    Improvement Suggestions
                  </h3>
                </div>
                <ul className="space-y-3">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-purple-400 font-semibold">{i + 1}</span>
                      </div>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons - 3D */}
              <div className="flex gap-4">
                <Button
                  onClick={resetAnalysis}
                  className="btn-secondary flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Check Another Job
                </Button>
                <Button
                  onClick={() => navigate('/candidate/jobs')}
                  className="btn-primary flex-1"
                >
                  Browse Jobs
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
