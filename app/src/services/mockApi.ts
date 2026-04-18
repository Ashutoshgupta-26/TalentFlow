import type { 
  Resume, Job, JobMatch, Application, 
  CandidateProfile, RecruiterDashboard, Applicant
} from '@/types';

// Mock data store
let mockResumes: Resume[] = [
  {
    id: 'resume_1',
    userId: '1',
    fileName: 'john_resume.pdf',
    fileUrl: '#',
    atsScore: 78,
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'SQL', 'AWS'],
    education: [
      {
        institution: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2018-09',
        endDate: '2022-05',
      }
    ],
    experience: [
      {
        company: 'Tech Corp',
        title: 'Software Engineer',
        description: 'Developed web applications using React and Node.js',
        startDate: '2022-06',
        endDate: 'Present',
      }
    ],
    uploadedAt: new Date().toISOString(),
  }
];

let mockJobs: Job[] = [
  {
    id: 'job_1',
    recruiterId: '2',
    title: 'Senior Frontend Developer',
    company: 'Tech Solutions Inc.',
    description: 'We are looking for an experienced Frontend Developer to join our team.',
    requiredSkills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
    experienceLevel: 'senior',
    location: 'San Francisco, CA (Remote)',
    salary: '$120k - $160k',
    createdAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'job_2',
    recruiterId: '2',
    title: 'Full Stack Engineer',
    company: 'StartupXYZ',
    description: 'Join our fast-growing startup as a Full Stack Engineer.',
    requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    experienceLevel: 'mid',
    location: 'New York, NY (Hybrid)',
    salary: '$100k - $140k',
    createdAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'job_3',
    recruiterId: '2',
    title: 'Backend Developer',
    company: 'DataSystems',
    description: 'Looking for a Backend Developer to build scalable APIs.',
    requiredSkills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Kubernetes'],
    experienceLevel: 'mid',
    location: 'Austin, TX (On-site)',
    salary: '$90k - $130k',
    createdAt: new Date().toISOString(),
    status: 'active',
  }
];

let mockApplications: Application[] = [
  {
    id: 'app_1',
    jobId: 'job_1',
    candidateId: '1',
    resumeId: 'resume_1',
    status: 'shortlisted',
    matchScore: 85,
    appliedAt: new Date().toISOString(),
  }
];

// Resume API
export const resumeApi = {
  upload: async (file: File, userId: string): Promise<Resume> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate ATS parsing
    const skills = ['React', 'TypeScript', 'Node.js', 'Python', 'SQL', 'AWS', 'Docker'];
    const atsScore = Math.floor(Math.random() * 30) + 70; // 70-100
    
    const newResume: Resume = {
      id: `resume_${Date.now()}`,
      userId,
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      atsScore,
      skills: skills.slice(0, Math.floor(Math.random() * 4) + 4),
      education: [
        {
          institution: 'University of Technology',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: '2017-09',
          endDate: '2021-05',
        }
      ],
      experience: [
        {
          company: 'Previous Company',
          title: 'Software Developer',
          description: 'Built web applications and APIs',
          startDate: '2021-06',
          endDate: 'Present',
        }
      ],
      uploadedAt: new Date().toISOString(),
    };
    
    mockResumes.push(newResume);
    return newResume;
  },

  getByUserId: async (userId: string): Promise<Resume | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockResumes.find(r => r.userId === userId) || null;
  },

  getById: async (id: string): Promise<Resume | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockResumes.find(r => r.id === id) || null;
  },
};

// Job API
export const jobApi = {
  create: async (job: Omit<Job, 'id' | 'createdAt'>): Promise<Job> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newJob: Job = {
      ...job,
      id: `job_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    mockJobs.push(newJob);
    return newJob;
  },

  getAll: async (): Promise<Job[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockJobs.filter(j => j.status === 'active');
  },

  getByRecruiterId: async (recruiterId: string): Promise<Job[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockJobs.filter(j => j.recruiterId === recruiterId);
  },

  getById: async (id: string): Promise<Job | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockJobs.find(j => j.id === id) || null;
  },

  getMatches: async (userId: string): Promise<JobMatch[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const resume = await resumeApi.getByUserId(userId);
    if (!resume) return [];
    
    const userSkills = resume.skills.map(s => s.toLowerCase());
    
    return mockJobs
      .filter(j => j.status === 'active')
      .map(job => {
        const requiredSkills = job.requiredSkills.map(s => s.toLowerCase());
        const matchingSkills = requiredSkills.filter(s => userSkills.includes(s));
        const missingSkills = requiredSkills.filter(s => !userSkills.includes(s));
        
        const matchPercentage = Math.round(
          (matchingSkills.length / requiredSkills.length) * 100
        );
        
        return {
          job,
          matchPercentage,
          missingSkills: missingSkills.map(s => job.requiredSkills.find(rs => rs.toLowerCase() === s)!),
          matchingSkills: matchingSkills.map(s => job.requiredSkills.find(rs => rs.toLowerCase() === s)!),
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  },
};

// Application API
export const applicationApi = {
  apply: async (jobId: string, candidateId: string, resumeId: string): Promise<Application> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const resume = await resumeApi.getById(resumeId);
    const job = await jobApi.getById(jobId);
    
    if (!resume || !job) throw new Error('Resume or job not found');
    
    const userSkills = resume.skills.map(s => s.toLowerCase());
    const requiredSkills = job.requiredSkills.map(s => s.toLowerCase());
    const matchingSkills = requiredSkills.filter(s => userSkills.includes(s));
    const matchScore = Math.round((matchingSkills.length / requiredSkills.length) * 100);
    
    const newApplication: Application = {
      id: `app_${Date.now()}`,
      jobId,
      candidateId,
      resumeId,
      status: 'pending',
      matchScore,
      appliedAt: new Date().toISOString(),
    };
    
    mockApplications.push(newApplication);
    return newApplication;
  },

  getByCandidateId: async (candidateId: string): Promise<Application[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockApplications
      .filter(a => a.candidateId === candidateId)
      .map(a => ({
        ...a,
        job: mockJobs.find(j => j.id === a.jobId),
      }));
  },

  getByJobId: async (jobId: string): Promise<Applicant[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const applications = mockApplications.filter(a => a.jobId === jobId);
    
    return applications.map(app => {
      const resume = mockResumes.find(r => r.id === app.resumeId);
      return {
        application: app,
        candidate: {
          id: app.candidateId,
          name: 'Candidate Name',
          email: 'candidate@email.com',
          role: 'candidate',
          createdAt: new Date().toISOString(),
        },
        resume: resume!,
        matchScore: app.matchScore,
      };
    });
  },

  updateStatus: async (applicationId: string, status: Application['status']): Promise<Application> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const app = mockApplications.find(a => a.id === applicationId);
    if (!app) throw new Error('Application not found');
    
    app.status = status;
    return app;
  },
};

// Dashboard API
export const dashboardApi = {
  getCandidateProfile: async (userId: string): Promise<CandidateProfile> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const resume = await resumeApi.getByUserId(userId);
    const applications = await applicationApi.getByCandidateId(userId);
    
    // Calculate profile completion
    let profileCompletion = 0;
    if (resume) {
      profileCompletion = 100;
    } else {
      profileCompletion = 30; // Basic info only
    }
    
    return {
      userId,
      resume,
      applications,
      profileCompletion,
    };
  },

  getRecruiterDashboard: async (recruiterId: string): Promise<RecruiterDashboard> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const jobs = await jobApi.getByRecruiterId(recruiterId);
    
    let totalApplicants = 0;
    let totalMatchScore = 0;
    const allApplicants: Applicant[] = [];
    
    for (const job of jobs) {
      const applicants = await applicationApi.getByJobId(job.id);
      totalApplicants += applicants.length;
      applicants.forEach(a => {
        totalMatchScore += a.matchScore;
        allApplicants.push(a);
      });
    }
    
    const averageMatchScore = totalApplicants > 0 ? Math.round(totalMatchScore / totalApplicants) : 0;
    
    // Get top candidates (highest match scores)
    const topCandidates = allApplicants
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)
      .map(a => ({
        user: a.candidate,
        resume: a.resume,
        matchScore: a.matchScore,
        applicationId: a.application.id,
      }));
    
    return {
      totalJobsPosted: jobs.length,
      totalApplicants,
      averageMatchScore,
      topCandidates,
    };
  },
};
