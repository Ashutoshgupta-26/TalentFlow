import { useState } from 'react';
import { useNavigate } from '@/router';
import { jobApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Briefcase, Plus, X, Loader2, ChevronLeft,
  Building2, MapPin, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const SKILL_SUGGESTIONS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Java', 'Go',
  'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis',
  'GraphQL', 'REST API', 'Git', 'CI/CD', 'Terraform', 'Linux'
];

export function CreateJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    requiredSkills: [],
    experienceLevel: 'mid',
    location: '',
    salary: '',
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.requiredSkills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(s => s !== skillToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (formData.requiredSkills.length === 0) {
      toast.error('Please add at least one required skill');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await jobApi.create({
        recruiterId: user.id,
        title: formData.title,
        company: formData.company,
        description: formData.description,
        requiredSkills: formData.requiredSkills,
        experienceLevel: formData.experienceLevel,
        location: formData.location,
        salary: formData.salary,
        status: 'active',
      });
      
      toast.success('Job posted successfully!');
      navigate('/recruiter/jobs');
    } catch (error) {
      toast.error('Failed to post job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="section-padding">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 animate-fade-up">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/recruiter/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="heading-lg text-foreground">Post a New Job</h1>
              <p className="text-muted-foreground">Create a job listing to find the perfect candidate</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="glass-card p-6 animate-fade-up glow-border">
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground">
                    Job Title <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Senior Frontend Developer"
                      className="input-field pl-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-foreground">
                    Company Name <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="e.g., Tech Solutions Inc."
                      className="input-field pl-12"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-foreground">
                      Location <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., San Francisco, CA"
                        className="input-field pl-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary" className="text-foreground">
                      Salary Range
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="salary"
                        value={formData.salary}
                        onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                        placeholder="e.g., $100k - $140k"
                        className="input-field pl-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-foreground">
                    Experience Level <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['entry', 'mid', 'senior'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level }))}
                        className={`px-4 py-3 rounded-xl border text-sm font-medium capitalize transition-all ${
                          formData.experienceLevel === level
                            ? 'border-[#A855F7] bg-[#7C3AED]/20 text-[#A855F7]'
                            : 'border-white/10 bg-background text-muted-foreground hover:border-[#A855F7]/30'
                        }`}
                      >
                        {level} Level
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="glass-card p-6 animate-fade-up animate-delay-100 glow-border">
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                Job Description
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">
                  Description <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  className="textarea-field min-h-[150px]"
                  required
                />
              </div>
            </div>

            {/* Required Skills */}
            <div className="glass-card p-6 animate-fade-up animate-delay-200 glow-border">
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">
                Required Skills <span className="text-red-400">*</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    placeholder="Add a skill (e.g., React)"
                    className="input-field"
                  />
                  <Button 
                    type="button"
                    onClick={handleAddSkill}
                    className="btn-primary"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Skill Suggestions */}
                {formData.requiredSkills.length === 0 && (
                  <div className="mb-4">
                    <p className="text-muted-foreground text-sm mb-2">Popular skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_SUGGESTIONS.slice(0, 8).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            if (!formData.requiredSkills.includes(skill)) {
                              setFormData(prev => ({
                                ...prev,
                                requiredSkills: [...prev.requiredSkills, skill]
                              }));
                            }
                          }}
                          className="px-3 py-1.5 bg-[#7C3AED]/10 border border-[#A855F7]/20 rounded-lg text-sm text-muted-foreground hover:border-[#A855F7]/50 hover:text-foreground transition-colors"
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Skills */}
                {formData.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.requiredSkills.map((skill) => (
                      <span 
                        key={skill}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#A855F7]/20 text-[#A855F7] rounded-lg text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-up animate-delay-300">
              <Button
                type="submit"
                className="btn-primary flex-1 group"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting Job...
                  </>
                ) : (
                  'Post Job'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="btn-secondary"
                onClick={() => navigate('/recruiter/dashboard')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
