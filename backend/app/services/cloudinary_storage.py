"""Cloudinary storage helpers for resume files, with local fallback."""

from __future__ import annotations

import io
import os
import uuid

import cloudinary
import cloudinary.uploader

from app.config import (
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_FOLDER,
    UPLOAD_DIR,
)


class CloudinaryStorageError(Exception):
    """Raised when Cloudinary is not configured or upload fails."""


def _is_configured() -> bool:
    return bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

def _ensure_configured() -> None:
    if _is_configured():
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )


def upload_resume_pdf(user_id: int, file_name: str, content: bytes) -> tuple[str, str]:
    """Upload PDF bytes to Cloudinary or Local, and return (file_url, public_id)."""
    safe_name = file_name.replace("/", "_").replace("\\", "_")
    extension = ".pdf"
    if "." in safe_name:
        extension = safe_name[safe_name.rfind(".") :]

    public_id = f"user_{user_id}_{uuid.uuid4()}"

    if _is_configured():
        _ensure_configured()
        try:
            result = cloudinary.uploader.upload(
                io.BytesIO(content),
                resource_type="raw",
                folder=CLOUDINARY_UPLOAD_FOLDER,
                public_id=public_id,
                overwrite=True,
                filename_override=safe_name,
                format=extension.lstrip("."),
            )
        except Exception as exc:
            raise CloudinaryStorageError(f"Cloudinary upload failed: {exc}") from exc

        file_url = result.get("secure_url") or result.get("url")
        uploaded_public_id = result.get("public_id")
        if not file_url or not uploaded_public_id:
            raise CloudinaryStorageError("Cloudinary upload succeeded but response did not include URL/public_id")
        return str(file_url), str(uploaded_public_id)
    else:
        # Fallback to local storage
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = f"{public_id}{extension}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        
        file_url = f"http://127.0.0.1:8000/uploads/{filename}"
        return file_url, public_id


def delete_asset_if_exists(public_id: str | None) -> None:
    if not public_id:
        return

    if _is_configured():
        _ensure_configured()
        try:
            cloudinary.uploader.destroy(public_id, resource_type="raw", invalidate=True)
        except Exception:
            pass
    else:
        # Fallback local delete
        for ext in [".pdf", ".docx"]:
            filepath = os.path.join(UPLOAD_DIR, f"{public_id}{ext}")
            if os.path.exists(filepath):
                os.remove(filepath)
