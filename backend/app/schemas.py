"""Pydantic schemas for request/response validation."""

from __future__ import annotations
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ───── Auth ─────

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # 'candidate' | 'recruiter'

class LoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: UserOut


# ───── Resume ─────

class EducationOut(BaseModel):
    id: int
    institution: str
    degree: str
    field: str
    start_date: str
    end_date: Optional[str] = None

    class Config:
        alias_generator = lambda s: s  # keep snake_case from DB

class ExperienceOut(BaseModel):
    id: int
    company: str
    title: str
    description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None

class ResumeOut(BaseModel):
    id: int
    userId: int
    fileName: str
    fileUrl: str
    atsScore: Optional[int] = None
    skills: list[str] = []
    education: list[EducationOut] = []
    experience: list[ExperienceOut] = []
    uploadedAt: datetime


# ───── Job ─────

class JobCreateRequest(BaseModel):
    recruiterId: int
    title: str
    company: str
    description: str
    requiredSkills: list[str] = []
    experienceLevel: str  # 'entry' | 'mid' | 'senior'
    location: Optional[str] = None
    salary: Optional[str] = None
    status: str = "active"

class JobOut(BaseModel):
    id: int
    recruiterId: int
    title: str
    company: str
    description: str
    requiredSkills: list[str] = []
    experienceLevel: str
    location: Optional[str] = None
    salary: Optional[str] = None
    status: str
    createdAt: datetime

class JobMatchOut(BaseModel):
    job: JobOut
    matchPercentage: int
    matchingSkills: list[str] = []
    missingSkills: list[str] = []


# ───── Application ─────

class ApplyRequest(BaseModel):
    jobId: int
    candidateId: int
    resumeId: int

class ApplicationOut(BaseModel):
    id: int
    jobId: int
    candidateId: int
    resumeId: int
    status: str
    matchScore: Optional[int] = None
    appliedAt: datetime
    job: Optional[JobOut] = None

class UpdateStatusRequest(BaseModel):
    status: str  # 'pending' | 'shortlisted' | 'rejected' | 'hired'


# ───── Applicant (recruiter view) ─────

class CandidateBasic(BaseModel):
    id: int
    name: str
    email: str
    role: str
    createdAt: datetime

class ApplicantOut(BaseModel):
    application: ApplicationOut
    candidate: CandidateBasic
    resume: ResumeOut
    matchScore: int


# ───── Dashboard ─────

class CandidateProfileOut(BaseModel):
    userId: int
    resume: Optional[ResumeOut] = None
    applications: list[ApplicationOut] = []
    profileCompletion: int

class TopCandidateOut(BaseModel):
    user: CandidateBasic
    resume: ResumeOut
    matchScore: int
    applicationId: int

class RecruiterDashboardOut(BaseModel):
    totalJobsPosted: int
    totalApplicants: int
    averageMatchScore: int
    topCandidates: list[TopCandidateOut] = []
