"""
TalentFlow ML ATS Scorer — HuggingFace Spaces API
Standalone FastAPI service exposing the IndustryATSScorer as an HTTP endpoint.
"""

import re
import string
import datetime
import warnings
import numpy as np
import pandas as pd
from typing import Optional

warnings.filterwarnings("ignore")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    raise ImportError("pip install rank-bm25")

try:
    import spacy
except ImportError:
    raise ImportError("pip install spacy && python -m spacy download en_core_web_sm")


# ════════════════════════════════════════════════════════════════
#  Copy the entire IndustryATSScorer class from ml_scorer.py
#  We import it dynamically below
# ════════════════════════════════════════════════════════════════

import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from ml_engine import RecruiterATSScorer as IndustryATSScorer


# ════════════════════════════════════════════════════════════════
#  FastAPI Application
# ════════════════════════════════════════════════════════════════

app = FastAPI(
    title="TalentFlow ML ATS Scorer",
    description="AI-powered resume scoring using BGE, MiniLM, Cross-Encoder, BM25, and NER",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-load the ML pipeline
_scorer = None

def get_scorer():
    global _scorer
    if _scorer is None:
        print("Loading ML models... (first request will be slow)")
        _scorer = IndustryATSScorer()
        print("ML models loaded successfully!")
    return _scorer


# ════════════════════════════════════════════════════════════════
#  Request/Response Models
# ════════════════════════════════════════════════════════════════

class ScoreRequest(BaseModel):
    job_title: str = ""
    job_description: str = ""
    required_skills: list[str] = []
    experience_level: str = ""
    candidate_skills: str = ""
    candidate_education: str = ""
    candidate_experience: str = ""
    candidate_role: str = "candidate"

class ScoreResponse(BaseModel):
    match_score: int
    details: dict = {}


# ════════════════════════════════════════════════════════════════
#  Endpoints
# ════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"message": "TalentFlow ML ATS Scorer API is running", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/score", response_model=ScoreResponse)
def score_candidate(req: ScoreRequest):
    scorer = get_scorer()

    recruiter_query = (
        f"Title: {req.job_title}\n"
        f"Required Experience: {req.experience_level} years\n"
        f"Skills: {', '.join(req.required_skills)}\n"
        f"Description: {req.job_description}"
    )

    df = pd.DataFrame([{
        "id": 1,
        "Skills": req.candidate_skills,
        "Education": req.candidate_education,
        "Experience": req.candidate_experience,
        "Role": req.candidate_role,
    }])

    df["combined_resume"] = df.apply(
        lambda row: "\n".join(f"{c}: {v}" for c, v in row.items()), axis=1
    )

    try:
        try:
            exp_int = int(req.experience_level)
        except (ValueError, TypeError):
            exp_int = 0
            
        scored_df = scorer.find_top_candidates(recruiter_query=recruiter_query, df=df, min_years_exp=exp_int, top_n=1)
        if not scored_df.empty:
            score = float(scored_df.iloc[0]["match_score"])
            score = max(0, min(100, int(round(score))))
            return ScoreResponse(match_score=score, details={"match_score": score})
    except Exception as e:
        print(f"ML Scorer Error: {e}")

    # Fallback: basic string matching
    user_skills = [s.strip().lower() for s in req.candidate_skills.split(",") if s.strip()]
    required_lower = [s.lower() for s in req.required_skills]
    matching = [s for s in required_lower if s in user_skills]
    fallback_score = round(len(matching) / len(required_lower) * 100) if required_lower else 0

    return ScoreResponse(match_score=fallback_score, details={"fallback": True})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
