"""ATS routes: analyze resume against job description."""

from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pymongo import DESCENDING

from app.database import get_collection
from app.services.groq_service import GroqServiceError, analyze_resume_against_jd
from app.utils.pdf_parser import extract_text_from_pdf

router = APIRouter(prefix="/api/ats", tags=["ats"])


def _is_pdf(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()
    return content_type == "application/pdf" or filename.endswith(".pdf")


def _fallback_response(message: str) -> dict:
    return {
        "score": 0,
        "summary": "Needs Improvement",
        "matched_keywords": [],
        "missing_keywords": [],
        "suggestions": [
            "Could not run ATS AI analysis right now.",
            "Try again after a few minutes.",
            "Ensure your resume has clear section headings.",
            "Include role-specific keywords from the job description.",
            "Use measurable achievements in bullet points.",
        ],
        "message": message,
    }


def _serialize_history_item(item: dict) -> dict:
    created_at = item.get("created_at")
    return {
        "id": str(item.get("_id")),
        "user_id": item.get("user_id"),
        "resume_file_name": item.get("resume_file_name", ""),
        "job_description": item.get("job_description", ""),
        "score": item.get("score", 0),
        "summary": item.get("summary", "Needs Improvement"),
        "matched_keywords": item.get("matched_keywords", []),
        "missing_keywords": item.get("missing_keywords", []),
        "suggestions": item.get("suggestions", []),
        "message": item.get("message", ""),
        "created_at": created_at.isoformat() if created_at else None,
    }


@router.post("/analyze")
async def analyze_ats(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    user_id: int | None = Form(default=None),
    save_result: bool = Form(default=True),
):
    if not _is_pdf(file):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    if not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    try:
        resume_text = await extract_text_from_pdf(file)
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the uploaded PDF.")

        result = await analyze_resume_against_jd(resume_text=resume_text, job_description=job_description)

        if save_result:
            ats_results = get_collection("ats_results")
            ats_results.insert_one(
                {
                    "user_id": user_id,
                    "resume_file_name": file.filename,
                    "score": result["score"],
                    "summary": result["summary"],
                    "matched_keywords": result["matched_keywords"],
                    "missing_keywords": result["missing_keywords"],
                    "suggestions": result["suggestions"],
                    "message": result.get("message", ""),
                    "job_description": job_description,
                    "created_at": datetime.now(timezone.utc),
                }
            )

        return JSONResponse(content=result)
    except HTTPException:
        raise
    except GroqServiceError as exc:
        return JSONResponse(content=_fallback_response(str(exc)))
    except Exception:
        return JSONResponse(content=_fallback_response("Unexpected error while analyzing resume."))


@router.get("/history/{user_id}")
async def get_ats_history(user_id: int, limit: int = 20):
    safe_limit = max(1, min(limit, 100))
    ats_results = get_collection("ats_results")
    rows = list(
        ats_results
        .find({"user_id": user_id})
        .sort("created_at", DESCENDING)
        .limit(safe_limit)
    )
    return JSONResponse(content=[_serialize_history_item(row) for row in rows])
