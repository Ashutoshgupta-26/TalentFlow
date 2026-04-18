"""Job routes: create, list, get by id, get matches."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pymongo import DESCENDING
from app.database import get_collection, get_next_sequence
from app.schemas import JobCreateRequest, JobOut, JobMatchOut

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


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


@router.post("/", response_model=JobOut)
def create_job(body: JobCreateRequest):
    jobs = get_collection("jobs")
    row = {
        "id": get_next_sequence("jobs"),
        "recruiter_id": body.recruiterId,
        "title": body.title,
        "company": body.company,
        "description": body.description,
        "required_skills": body.requiredSkills,
        "experience_level": body.experienceLevel,
        "location": body.location,
        "salary": body.salary,
        "status": body.status,
        "created_at": datetime.now(timezone.utc),
    }
    jobs.insert_one(row)
    return _row_to_job(row)


@router.get("/", response_model=list[JobOut])
def get_active_jobs():
    jobs = get_collection("jobs")
    rows = list(jobs.find({"status": "active"}, {"_id": 0}).sort("created_at", DESCENDING))
    return [_row_to_job(r) for r in rows]


@router.get("/recruiter/{recruiter_id}", response_model=list[JobOut])
def get_jobs_by_recruiter(recruiter_id: int):
    jobs = get_collection("jobs")
    rows = list(jobs.find({"recruiter_id": recruiter_id}, {"_id": 0}).sort("created_at", DESCENDING))
    return [_row_to_job(r) for r in rows]


@router.get("/matches/{user_id}", response_model=list[JobMatchOut])
def get_job_matches(user_id: int):
    """Compute skill-match percentage between user's resume and all active jobs using ML Scorer."""
    resumes = get_collection("resumes")
    jobs_collection = get_collection("jobs")
    users = get_collection("users")

    resume = resumes.find_one({"user_id": user_id}, {"_id": 0})
    if not resume:
        return []

    user = users.find_one({"id": user_id}, {"_id": 0}) or {}
    jobs = list(jobs_collection.find({"status": "active"}, {"_id": 0}).sort("created_at", DESCENDING))

    from app.services.ml_scorer import score_single_application

    results = []
    for job_row in jobs:
        required = job_row.get("required_skills") or []
        
        pct = score_single_application(job_row, resume, user)

        results.append(
            JobMatchOut(
                job=_row_to_job(job_row),
                matchPercentage=pct,
                matchingSkills=[],
                missingSkills=[],
            )
        )

    results.sort(key=lambda m: m.matchPercentage, reverse=True)
    return results


@router.get("/{job_id}", response_model=JobOut | None)
def get_job_by_id(job_id: int):
    jobs = get_collection("jobs")
    row = jobs.find_one({"id": job_id}, {"_id": 0})
    if not row:
        return None
    return _row_to_job(row)
