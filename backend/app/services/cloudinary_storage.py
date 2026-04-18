"""Cloudinary storage helpers for resume files."""

from __future__ import annotations

import io
import uuid

import cloudinary
import cloudinary.uploader

from app.config import (
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_FOLDER,
)


class CloudinaryStorageError(Exception):
    """Raised when Cloudinary is not configured or upload fails."""


def _ensure_configured() -> None:
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        raise CloudinaryStorageError(
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
        )

    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_resume_pdf(user_id: int, file_name: str, content: bytes) -> tuple[str, str]:
    """Upload PDF bytes to Cloudinary and return (file_url, public_id)."""
    _ensure_configured()

    safe_name = file_name.replace("/", "_").replace("\\", "_")
    extension = ".pdf"
    if "." in safe_name:
        extension = safe_name[safe_name.rfind(".") :]

    public_id = f"user_{user_id}_{uuid.uuid4()}"

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
        message = str(exc)
        if "Customer is marked as untrusted" in message:
            raise CloudinaryStorageError(
                "Cloudinary account is marked as untrusted. Verify your Cloudinary account and contact Cloudinary Support to remove the trust restriction."
            ) from exc
        raise CloudinaryStorageError(f"Cloudinary upload failed: {message}") from exc

    file_url = result.get("secure_url") or result.get("url")
    uploaded_public_id = result.get("public_id")
    if not file_url or not uploaded_public_id:
        raise CloudinaryStorageError("Cloudinary upload succeeded but response did not include URL/public_id")

    return str(file_url), str(uploaded_public_id)


def delete_asset_if_exists(public_id: str | None) -> None:
    if not public_id:
        return

    _ensure_configured()
    try:
        cloudinary.uploader.destroy(public_id, resource_type="raw", invalidate=True)
    except Exception:
        # Keep resume replacement resilient even if old file delete fails.
        pass
