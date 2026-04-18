"""Dashboard routes: candidate profile, recruiter dashboard."""

from fastapi import APIRouter
from pymongo import DESCENDING
from app.database import get_collection
from app.schemas import (
    CandidateProfileOut, RecruiterDashboardOut, TopCandidateOut,
    ApplicationOut, CandidateBasic, JobOut,
)
from app.routes.resume_routes import _build_resume

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _row_to_job(row: dict) -> JobOut:
    return JobOut(
        id=row["id"],
        recruiterId=row["recruiter_id"],
        title=row["title"],
        company=row["company"],
        description=row["description"],
        requiredSkills=row["required_skills"] or [],
        experienceLevel=row["experience_level"],
        location=row["location"],
        salary=row["salary"],
        status=row["status"],
        createdAt=row["created_at"],
    )


@router.get("/candidate/{user_id}", response_model=CandidateProfileOut)
def candidate_profile(user_id: int):
    resumes = get_collection("resumes")
    applications_collection = get_collection("applications")
    jobs = get_collection("jobs")

    resume_row = resumes.find_one({"user_id": user_id}, {"_id": 0})
    app_rows = list(
        applications_collection.find({"candidate_id": user_id}, {"_id": 0}).sort("applied_at", DESCENDING)
    )

    applications = []
    for a in app_rows:
        job_row = jobs.find_one({"id": a["job_id"]}, {"_id": 0})
        app_out = ApplicationOut(
            id=a["id"],
            jobId=a["job_id"],
            candidateId=a["candidate_id"],
            resumeId=a["resume_id"],
            status=a["status"],
            matchScore=a["match_score"],
            appliedAt=a["applied_at"],
        )
        if job_row:
            app_out.job = _row_to_job(job_row)
        applications.append(app_out)

    profile_completion = 100 if resume_row else 30

    return CandidateProfileOut(
        userId=user_id,
        resume=_build_resume(resume_row) if resume_row else None,
        applications=applications,
        profileCompletion=profile_completion,
    )


@router.get("/recruiter/{recruiter_id}", response_model=RecruiterDashboardOut)
def recruiter_dashboard(recruiter_id: int):
    jobs = get_collection("jobs")
    applications = get_collection("applications")
    users = get_collection("users")
    resumes = get_collection("resumes")

    job_rows = list(jobs.find({"recruiter_id": recruiter_id}, {"_id": 0}))
    job_ids = [j["id"] for j in job_rows]

    if not job_ids:
        return RecruiterDashboardOut(
            totalJobsPosted=0,
            totalApplicants=0,
            averageMatchScore=0,
            topCandidates=[],
        )

    app_rows = list(
        applications.find({"job_id": {"$in": job_ids}}, {"_id": 0}).sort("match_score", DESCENDING)
    )

    total_applicants = len(app_rows)
    total_match = sum(a["match_score"] or 0 for a in app_rows)
    avg_score = round(total_match / total_applicants) if total_applicants else 0

    top_apps = app_rows[:5]
    top_candidates = []
    for a in top_apps:
        user_row = users.find_one(
            {"id": a["candidate_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "created_at": 1},
        )
        resume_row = resumes.find_one({"id": a["resume_id"]}, {"_id": 0})

        if user_row and resume_row:
            top_candidates.append(
                TopCandidateOut(
                    user=CandidateBasic(
                        id=user_row["id"],
                        name=user_row["name"],
                        email=user_row["email"],
                        role=user_row["role"],
                        createdAt=user_row["created_at"],
                    ),
                    resume=_build_resume(resume_row),
                    matchScore=a["match_score"],
                    applicationId=a["id"],
                )
            )

    return RecruiterDashboardOut(
        totalJobsPosted=len(job_rows),
        totalApplicants=total_applicants,
        averageMatchScore=avg_score,
        topCandidates=top_candidates,
    )
