// ============================================
// ATS (Applicant Tracking System) MongoDB Schema + Seed
// Run with: mongosh < app/schema.sql
// ============================================

use ats_db;

// Reset collections
db.users.drop();
db.candidate_profiles.drop();
db.recruiter_profiles.drop();
db.resumes.drop();
db.education.drop();
db.experience.drop();
db.jobs.drop();
db.applications.drop();
db.counters.drop();

// ============================================
// Indexes
// ============================================

// Core account index
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, created_at: -1 });

// Candidate profile indexes
db.candidate_profiles.createIndex({ user_id: 1 }, { unique: true });
db.candidate_profiles.createIndex({ availability_status: 1 });
db.candidate_profiles.createIndex({ preferred_location_type: 1 });
db.candidate_profiles.createIndex({ skills: 1 });

// Recruiter profile indexes
db.recruiter_profiles.createIndex({ user_id: 1 }, { unique: true });
db.recruiter_profiles.createIndex({ company_name: 1 });
db.recruiter_profiles.createIndex({ hiring_regions: 1 });
db.recruiter_profiles.createIndex({ hiring_focus_skills: 1 });

// Resume and related indexes
db.resumes.createIndex({ user_id: 1 }, { unique: true });
db.resumes.createIndex({ uploaded_at: -1 });
db.education.createIndex({ resume_id: 1 });
db.experience.createIndex({ resume_id: 1 });

// Job and application indexes
db.jobs.createIndex({ recruiter_id: 1 });
db.jobs.createIndex({ status: 1, created_at: -1 });
db.jobs.createIndex({ required_skills: 1 });
db.jobs.createIndex({ recruiter_id: 1, status: 1, created_at: -1 });

db.applications.createIndex({ job_id: 1 });
db.applications.createIndex({ candidate_id: 1, applied_at: -1 });
db.applications.createIndex({ status: 1 });
db.applications.createIndex({ match_score: -1 });
db.applications.createIndex({ job_id: 1, candidate_id: 1 }, { unique: true });

// ============================================
// Seed Data (backward-compatible with existing backend routes)
// ============================================

db.users.insertMany([
    {
        id: 1,
        name: "John Candidate",
        email: "candidate@demo.com",
        password_hash: "$2b$12$7L8bvqi8Ylpo/.10CeQAj.vC1.PdzKnCM.56FS9Vue3z0.aYRHmOy",
        role: "candidate",
        created_at: new Date(),
    },
    {
        id: 2,
        name: "Jane Recruiter",
        email: "recruiter@demo.com",
        password_hash: "$2b$12$7L8bvqi8Ylpo/.10CeQAj.vC1.PdzKnCM.56FS9Vue3z0.aYRHmOy",
        role: "recruiter",
        created_at: new Date(),
    },
]);

// Better structured candidate-side data
db.candidate_profiles.insertOne({
    user_id: 1,
    headline: "Frontend Engineer focused on React and modern web performance",
    summary: "3+ years building production web apps and internal dashboards.",
    phone: "+1-555-0101",
    location: {
        city: "San Francisco",
        state: "CA",
        country: "USA",
    },
    preferred_location_type: "remote",
    availability_status: "open_to_work",
    years_experience: 3,
    skills: ["React", "TypeScript", "Node.js", "Python", "SQL", "AWS"],
    preferred_roles: ["Frontend Developer", "Full Stack Engineer"],
    expected_salary: {
        currency: "USD",
        min: 110000,
        max: 145000,
    },
    notice_period_days: 30,
    links: {
        github: "https://github.com/john-candidate",
        linkedin: "https://linkedin.com/in/john-candidate",
        portfolio: "https://john-candidate.dev",
    },
    profile_completion: 92,
    updated_at: new Date(),
});

// Better structured recruiter-side data
db.recruiter_profiles.insertOne({
    user_id: 2,
    company_name: "Tech Solutions Inc.",
    company_website: "https://techsolutions.example",
    industry: "Software",
    company_size: "201-500",
    company_location: {
        city: "San Francisco",
        state: "CA",
        country: "USA",
    },
    hiring_regions: ["USA", "Canada"],
    hiring_focus_skills: ["React", "TypeScript", "Node.js", "Python", "AWS"],
    active_job_limit: 25,
    contact: {
        name: "Jane Recruiter",
        email: "recruiter@demo.com",
        phone: "+1-555-0202",
    },
    team: {
        department: "Talent Acquisition",
        seats: 5,
    },
    updated_at: new Date(),
});

db.resumes.insertOne({
    id: 1,
    user_id: 1,
    file_name: "john_resume.pdf",
    file_url: "#",
    ats_score: 78,
    skills: ["React", "TypeScript", "Node.js", "Python", "SQL", "AWS"],
    uploaded_at: new Date(),
});

db.education.insertOne({
    id: 1,
    resume_id: 1,
    institution: "Stanford University",
    degree: "Bachelor of Science",
    field: "Computer Science",
    start_date: "2018-09",
    end_date: "2022-05",
});

db.experience.insertOne({
    id: 1,
    resume_id: 1,
    company: "Tech Corp",
    title: "Software Engineer",
    description: "Developed web applications using React and Node.js",
    start_date: "2022-06",
    end_date: "Present",
});

db.jobs.insertMany([
    {
        id: 1,
        recruiter_id: 2,
        title: "Senior Frontend Developer",
        company: "Tech Solutions Inc.",
        description: "We are looking for an experienced Frontend Developer to join our team.",
        required_skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
        experience_level: "senior",
        location: "San Francisco, CA (Remote)",
        salary: "$120k - $160k",
        status: "active",
        created_at: new Date(),
    },
    {
        id: 2,
        recruiter_id: 2,
        title: "Full Stack Engineer",
        company: "StartupXYZ",
        description: "Join our fast-growing startup as a Full Stack Engineer.",
        required_skills: ["React", "Node.js", "MongoDB", "AWS", "Docker"],
        experience_level: "mid",
        location: "New York, NY (Hybrid)",
        salary: "$100k - $140k",
        status: "active",
        created_at: new Date(),
    },
    {
        id: 3,
        recruiter_id: 2,
        title: "Backend Developer",
        company: "DataSystems",
        description: "Looking for a Backend Developer to build scalable APIs.",
        required_skills: ["Python", "Django", "MongoDB", "Redis", "Kubernetes"],
        experience_level: "mid",
        location: "Austin, TX (On-site)",
        salary: "$90k - $130k",
        status: "active",
        created_at: new Date(),
    },
]);

db.applications.insertOne({
    id: 1,
    job_id: 1,
    candidate_id: 1,
    resume_id: 1,
    status: "shortlisted",
    match_score: 85,
    applied_at: new Date(),
});

// Counter state for auto-increment style IDs used by backend routes
db.counters.insertMany([
    { _id: "users", sequence_value: 2 },
    { _id: "resumes", sequence_value: 1 },
    { _id: "education", sequence_value: 1 },
    { _id: "experience", sequence_value: 1 },
    { _id: "jobs", sequence_value: 3 },
    { _id: "applications", sequence_value: 1 },
]);
