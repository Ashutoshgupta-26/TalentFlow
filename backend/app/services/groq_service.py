"""Groq service for ATS resume analysis."""

import json
import os
import re
from typing import Any
import httpx

from app.config import GROQ_API_KEY, GROQ_MODEL

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqServiceError(Exception):
    """Raised when Groq response cannot be used."""


def _build_prompt(resume_text: str, job_description: str) -> str:
    return (
        "You are an advanced ATS system.\n\n"
        "IMPORTANT:\n"
        "Do NOT rely on exact keyword matching.\n"
        "Perform SEMANTIC matching (understand meaning, synonyms, and context).\n\n"
        "For example:\n"
        '- "Led a team" = "Leadership"\n'
        '- "Built APIs" = "Backend Development"\n'
        '- "Used Flask" = "Web Framework Experience"\n\n'
        "-----------------------------------\n\n"
        "Tasks:\n"
        "1. Give ATS score (0-100)\n"
        "2. Classify: Strong / Good / Needs Improvement\n\n"
        "3. Matching Keywords:\n"
        "- Include BOTH exact matches AND semantic matches\n"
        "- Map resume phrases to job requirements\n\n"
        "4. Missing Keywords:\n"
        "- Only include truly missing skills (not synonyms)\n\n"
        "5. Suggestions:\n"
        "- Be specific and actionable\n"
        "- Suggest improvements based on gaps\n\n"
        "-----------------------------------\n\n"
        "Return ONLY valid JSON:\n\n"
        "{\n"
        '  "score": number,\n'
        '  "summary": "",\n'
        '  "matched_keywords": ["..."],\n'
        '  "missing_keywords": ["..."],\n'
        '  "suggestions": ["..."]\n'
        "}\n\n"
        "-----------------------------------\n\n"
        f"Resume:\n{resume_text}\n\n"
        f"Job Description:\n{job_description}\n"
    )


def _build_resume_profile_prompt(resume_text: str) -> str:
    return (
        "You are an unbiased ATS resume analyzer.\n\n"
        "Rules:\n"
        "1. Score ONLY based on resume quality, clarity, structure, relevance, and evidence of impact.\n"
        "2. Do NOT inflate score. Stay strict and objective.\n"
        "3. Extract information only if present in the resume text.\n"
        "4. If data is missing, return empty strings or empty arrays.\n\n"
        "Rubric (0-100 each):\n"
        "- structure_score: section organization and completeness\n"
        "- clarity_score: readability, concise phrasing, grammar\n"
        "- relevance_score: role-relevant technical/professional content\n"
        "- impact_score: measurable outcomes and achievements\n"
        "- ats_compatibility_score: ATS-friendly formatting and keyword coverage\n\n"
        "Return ONLY valid JSON with this exact shape:\n"
        "{\n"
        '  "ats_score": number,\n'
        '  "summary": "Strong|Good|Needs Improvement",\n'
        '  "structure_score": number,\n'
        '  "clarity_score": number,\n'
        '  "relevance_score": number,\n'
        '  "impact_score": number,\n'
        '  "ats_compatibility_score": number,\n'
        '  "skills": ["..."],\n'
        '  "education": [\n'
        "    {\n"
        '      "institution": "",\n'
        '      "degree": "",\n'
        '      "field": "",\n'
        '      "start_date": "",\n'
        '      "end_date": ""\n'
        "    }\n"
        "  ],\n"
        '  "experience": [\n'
        "    {\n"
        '      "company": "",\n'
        '      "title": "",\n'
        '      "description": "",\n'
        '      "start_date": "",\n'
        '      "end_date": ""\n'
        "    }\n"
        "  ],\n"
        '  "suggestions": ["..."]\n'
        "}\n\n"
        f"Resume Text:\n{resume_text}\n"
    )


def _extract_json_block(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Handle accidental markdown fences or extra text around JSON.
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise GroqServiceError("Groq did not return JSON")

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise GroqServiceError("Invalid JSON from Groq") from exc


def _normalize_result(payload: dict[str, Any]) -> dict[str, Any]:
    score = int(payload.get("score", 0))
    score = max(0, min(100, score))

    summary = str(payload.get("summary", "Needs Improvement")).strip() or "Needs Improvement"
    if summary not in {"Strong", "Good", "Needs Improvement"}:
        summary = "Needs Improvement"

    matched_keywords = payload.get("matched_keywords") or []
    missing_keywords = payload.get("missing_keywords") or []
    suggestions = payload.get("suggestions") or []

    return {
        "score": score,
        "summary": summary,
        "matched_keywords": [str(item).strip() for item in matched_keywords if str(item).strip()],
        "missing_keywords": [str(item).strip() for item in missing_keywords if str(item).strip()],
        "suggestions": [str(item).strip() for item in suggestions if str(item).strip()][:5],
    }


def _normalize_resume_profile(payload: dict[str, Any]) -> dict[str, Any]:
    def _to_score(value: Any) -> int:
        try:
            parsed = int(float(value))
        except Exception:
            parsed = 0
        return max(0, min(100, parsed))

    structure_score = _to_score(payload.get("structure_score", 0))
    clarity_score = _to_score(payload.get("clarity_score", 0))
    relevance_score = _to_score(payload.get("relevance_score", 0))
    impact_score = _to_score(payload.get("impact_score", 0))
    ats_compatibility_score = _to_score(payload.get("ats_compatibility_score", 0))

    component_scores = [
        structure_score,
        clarity_score,
        relevance_score,
        impact_score,
        ats_compatibility_score,
    ]
    component_present = any(score > 0 for score in component_scores)

    weighted_score = round(
        (0.25 * structure_score)
        + (0.20 * clarity_score)
        + (0.20 * relevance_score)
        + (0.20 * impact_score)
        + (0.15 * ats_compatibility_score)
    )

    raw_ats = _to_score(payload.get("ats_score", payload.get("score", 0)))
    ats_score = weighted_score if component_present else raw_ats

    summary = str(payload.get("summary", "Needs Improvement")).strip() or "Needs Improvement"
    if summary not in {"Strong", "Good", "Needs Improvement"}:
        summary = "Needs Improvement"

    skills = [str(item).strip() for item in (payload.get("skills") or []) if str(item).strip()]

    education_rows = []
    for row in (payload.get("education") or []):
        if not isinstance(row, dict):
            continue
        education_rows.append(
            {
                "institution": str(row.get("institution", "")).strip(),
                "degree": str(row.get("degree", "")).strip(),
                "field": str(row.get("field", "")).strip(),
                "start_date": str(row.get("start_date", "")).strip() or "Unknown",
                "end_date": str(row.get("end_date", "")).strip() or "Present",
            }
        )

    experience_rows = []
    for row in (payload.get("experience") or []):
        if not isinstance(row, dict):
            continue
        experience_rows.append(
            {
                "company": str(row.get("company", "")).strip(),
                "title": str(row.get("title", "")).strip(),
                "description": str(row.get("description", "")).strip(),
                "start_date": str(row.get("start_date", "")).strip() or "Unknown",
                "end_date": str(row.get("end_date", "")).strip() or "Present",
            }
        )

    suggestions = [str(item).strip() for item in (payload.get("suggestions") or []) if str(item).strip()][:5]

    # Fairness guardrails: avoid unrealistically low scores for reasonably complete resumes.
    has_education = len(education_rows) > 0
    has_experience = len(experience_rows) > 0
    has_skills = len(skills) >= 4
    evidence_count = int(has_education) + int(has_experience) + int(has_skills)

    if evidence_count >= 2 and ats_score < 45:
        ats_score = 45
    elif evidence_count == 3 and ats_score < 50:
        ats_score = 50

    ats_score = max(0, min(100, ats_score))

    return {
        "ats_score": ats_score,
        "summary": summary,
        "structure_score": structure_score,
        "clarity_score": clarity_score,
        "relevance_score": relevance_score,
        "impact_score": impact_score,
        "ats_compatibility_score": ats_compatibility_score,
        "skills": skills,
        "education": education_rows,
        "experience": experience_rows,
        "suggestions": suggestions,
    }


async def _call_groq(prompt: str) -> dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    if not api_key:
        raise GroqServiceError("GROQ_API_KEY is not configured")

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)

    if response.status_code >= 400:
        detail = ""
        try:
            err_payload = response.json()
            detail = str(err_payload.get("error", {}).get("message") or "").strip()
        except Exception:
            detail = response.text[:300].strip()

        if detail:
            raise GroqServiceError(f"Groq API error {response.status_code}: {detail}")
        raise GroqServiceError(f"Groq API error: {response.status_code}")

    data = response.json()
    choices = data.get("choices") or []
    content = ""
    if choices and isinstance(choices[0], dict):
        message = choices[0].get("message") or {}
        content = str(message.get("content") or "")

    if not content.strip():
        raise GroqServiceError("Empty response from Groq")

    return _extract_json_block(content)


async def analyze_resume_against_jd(resume_text: str, job_description: str) -> dict[str, Any]:
    """Call Groq chat completions endpoint and return normalized ATS result."""
    parsed = await _call_groq(_build_prompt(resume_text, job_description))
    return _normalize_result(parsed)


async def analyze_resume_profile(resume_text: str) -> dict[str, Any]:
    """Extract ATS score, skills, education, and experience from resume text."""
    parsed = await _call_groq(_build_resume_profile_prompt(resume_text))
    return _normalize_resume_profile(parsed)
