"""Resume routes: upload, get by user, get by id."""

from datetime import datetime, timezone
from pymongo import ASCENDING
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.database import get_collection, get_next_sequence
from app.schemas import ResumeOut, EducationOut, ExperienceOut
from app.services.cloudinary_storage import (
    CloudinaryStorageError,
    delete_asset_if_exists,
    upload_resume_pdf,
)
from app.services.groq_service import GroqServiceError, analyze_resume_profile
from app.utils.pdf_parser import extract_text_from_pdf_bytes

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


def _build_resume(row: dict) -> ResumeOut:
    """Build a ResumeOut with nested education & experience from a resume row."""
    resume_id = row["id"]
    education = get_collection("education")
    experience = get_collection("experience")

    edu_rows = list(education.find({"resume_id": resume_id}, {"_id": 0}).sort("id", ASCENDING))
    exp_rows = list(experience.find({"resume_id": resume_id}, {"_id": 0}).sort("id", ASCENDING))

    return ResumeOut(
        id=row["id"],
        userId=row["user_id"],
        fileName=row["file_name"],
        fileUrl=row.get("file_url") or row.get("cloudinary_pdf_url", ""),
        atsScore=row["ats_score"],
        skills=row["skills"] or [],
        education=[
            EducationOut(
                id=e["id"],
                institution=e["institution"],
                degree=e["degree"],
                field=e["field"],
                start_date=e["start_date"],
                end_date=e["end_date"],
            )
            for e in edu_rows
        ],
        experience=[
            ExperienceOut(
                id=e["id"],
                company=e["company"],
                title=e["title"],
                description=e["description"],
                start_date=e["start_date"],
                end_date=e["end_date"],
            )
            for e in exp_rows
        ],
        uploadedAt=row["uploaded_at"],
    )


@router.post("/upload", response_model=ResumeOut)
async def upload_resume(file: UploadFile = File(...), userId: int = Form(...)):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        file_url, public_id = upload_resume_pdf(userId, file.filename, file_bytes)
    except CloudinaryStorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to upload resume to Cloudinary") from exc

    ai_result = {
        "ats_score": 0,
        "skills": [],
        "education": [],
        "experience": [],
    }

    try:
        resume_text = extract_text_from_pdf_bytes(file_bytes)
    except Exception:
        resume_text = ""

    if resume_text.strip():
        try:
            ai_result = await analyze_resume_profile(resume_text)
        except GroqServiceError:
            # Keep upload successful even when AI analysis is temporarily unavailable.
            pass
        except Exception:
            pass

    resumes = get_collection("resumes")
    education = get_collection("education")
    experience = get_collection("experience")

    # Delete old resume for this user (one resume per user)
    old = resumes.find_one({"user_id": userId}, {"_id": 0, "id": 1, "public_id": 1})
    if old:
        resumes.delete_one({"id": old["id"]})
        education.delete_many({"resume_id": old["id"]})
        experience.delete_many({"resume_id": old["id"]})
        delete_asset_if_exists(old.get("public_id"))

    resume_row = {
        "id": get_next_sequence("resumes"),
        "user_id": userId,
        "file_name": file.filename,
        "file_url": file_url,
        "cloudinary_pdf_url": file_url,
        "storage_provider": "cloudinary",
        "public_id": public_id,
        "ats_score": ai_result["ats_score"],
        "skills": ai_result["skills"],
        "uploaded_at": datetime.now(timezone.utc),
    }
    resumes.insert_one(resume_row)

    for edu in ai_result["education"]:
        education.insert_one(
            {
                "id": get_next_sequence("education"),
                "resume_id": resume_row["id"],
                "institution": edu["institution"],
                "degree": edu["degree"],
                "field": edu["field"],
                "start_date": edu["start_date"],
                "end_date": edu["end_date"],
            }
        )

    for exp in ai_result["experience"]:
        experience.insert_one(
            {
                "id": get_next_sequence("experience"),
                "resume_id": resume_row["id"],
                "company": exp["company"],
                "title": exp["title"],
                "description": exp["description"],
                "start_date": exp["start_date"],
                "end_date": exp["end_date"],
            }
        )

    return _build_resume(resume_row)


@router.get("/user/{user_id}", response_model=ResumeOut | None)
def get_resume_by_user(user_id: int):
    resumes = get_collection("resumes")
    row = resumes.find_one({"user_id": user_id}, {"_id": 0})
    if not row:
        return None
    return _build_resume(row)


@router.get("/{resume_id}", response_model=ResumeOut | None)
def get_resume_by_id(resume_id: int):
    resumes = get_collection("resumes")
    row = resumes.find_one({"id": resume_id}, {"_id": 0})
    if not row:
        return None
    return _build_resume(row)
