"""Application routes: apply, list by candidate, list by job, update status."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pymongo import DESCENDING, ReturnDocument
from app.database import get_collection, get_next_sequence
from app.schemas import (
    ApplyRequest, ApplicationOut, UpdateStatusRequest,
    ApplicantOut, CandidateBasic, JobOut,
)
from app.routes.resume_routes import _build_resume

router = APIRouter(prefix="/api/applications", tags=["applications"])


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


def _row_to_application(row: dict, job: dict | None = None) -> ApplicationOut:
    app = ApplicationOut(
        id=row["id"],
        jobId=row["job_id"],
        candidateId=row["candidate_id"],
        resumeId=row["resume_id"],
        status=row["status"],
        matchScore=row["match_score"],
        appliedAt=row["applied_at"],
    )
    if job:
        app.job = _row_to_job(job)
    return app


@router.post("/apply", response_model=ApplicationOut)
def apply(body: ApplyRequest):
    applications = get_collection("applications")
    resumes = get_collection("resumes")
    jobs = get_collection("jobs")

    if applications.find_one({"job_id": body.jobId, "candidate_id": body.candidateId}):
        raise HTTPException(status_code=400, detail="Already applied to this job")

    resume = resumes.find_one({"id": body.resumeId}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job = jobs.find_one({"id": body.jobId}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    users = get_collection("users")
    user = users.find_one({"id": body.candidateId}, {"_id": 0}) or {}

    from app.services.ml_scorer import score_single_application
    match_score = score_single_application(job, resume, user)

    row = {
        "id": get_next_sequence("applications"),
        "job_id": body.jobId,
        "candidate_id": body.candidateId,
        "resume_id": body.resumeId,
        "status": "pending",
        "match_score": match_score,
        "applied_at": datetime.now(timezone.utc),
    }
    applications.insert_one(row)

    return _row_to_application(row)


@router.get("/candidate/{candidate_id}", response_model=list[ApplicationOut])
def get_by_candidate(candidate_id: int):
    applications = get_collection("applications")
    jobs = get_collection("jobs")
    app_rows = list(
        applications.find({"candidate_id": candidate_id}, {"_id": 0}).sort("applied_at", DESCENDING)
    )

    results = []
    for a in app_rows:
        job_row = jobs.find_one({"id": a["job_id"]}, {"_id": 0})
        results.append(_row_to_application(a, job_row))

    return results


@router.get("/job/{job_id}", response_model=list[ApplicantOut])
def get_by_job(job_id: int):
    applications = get_collection("applications")
    users = get_collection("users")
    resumes = get_collection("resumes")

    app_rows = list(applications.find({"job_id": job_id}, {"_id": 0}).sort("match_score", DESCENDING))

    results = []
    for a in app_rows:
        user_row = users.find_one(
            {"id": a["candidate_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "created_at": 1},
        )
        resume_row = resumes.find_one({"id": a["resume_id"]}, {"_id": 0})

        if user_row and resume_row:
            results.append(
                ApplicantOut(
                    application=_row_to_application(a),
                    candidate=CandidateBasic(
                        id=user_row["id"],
                        name=user_row["name"],
                        email=user_row["email"],
                        role=user_row["role"],
                        createdAt=user_row["created_at"],
                    ),
                    resume=_build_resume(resume_row),
                    matchScore=a["match_score"],
                )
            )

    return results


@router.patch("/{application_id}/status", response_model=ApplicationOut)
def update_status(application_id: int, body: UpdateStatusRequest):
    applications = get_collection("applications")
    row = applications.find_one_and_update(
        {"id": application_id},
        {"$set": {"status": body.status}},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    return _row_to_application(row)


@router.get("/{application_id}", response_model=ApplicantOut)
def get_applicant_detail(application_id: int):
    """Get full applicant details by application ID (used in CandidateDetail page)."""
    applications = get_collection("applications")
    users = get_collection("users")
    resumes = get_collection("resumes")

    app_row = applications.find_one({"id": application_id}, {"_id": 0})
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")

    user_row = users.find_one(
        {"id": app_row["candidate_id"]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "created_at": 1},
    )
    resume_row = resumes.find_one({"id": app_row["resume_id"]}, {"_id": 0})

    if not user_row or not resume_row:
        raise HTTPException(status_code=404, detail="Candidate or resume not found")

    return ApplicantOut(
        application=_row_to_application(app_row),
        candidate=CandidateBasic(
            id=user_row["id"],
            name=user_row["name"],
            email=user_row["email"],
            role=user_row["role"],
            createdAt=user_row["created_at"],
        ),
        resume=_build_resume(resume_row),
        matchScore=app_row["match_score"],
    )
