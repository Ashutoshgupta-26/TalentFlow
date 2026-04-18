"""PDF parsing utilities for ATS analysis."""

from io import BytesIO
from fastapi import UploadFile
from PyPDF2 import PdfReader


def extract_text_from_pdf_bytes(content: bytes) -> str:
    """Extract plain text from PDF bytes."""
    if not content:
        return ""

    reader = PdfReader(BytesIO(content))
    pages_text: list[str] = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages_text.append(page_text.strip())

    return "\n".join(pages_text).strip()


async def extract_text_from_pdf(file: UploadFile) -> str:
    """Extract plain text from an uploaded PDF file."""
    content = await file.read()
    return extract_text_from_pdf_bytes(content)
