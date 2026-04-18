
# --- CELL 1 ---
"""
Industry-Grade Ensemble ATS Scorer  (Accuracy Release v2)
=========================================================
Key architecture change: NER Skill Overlap is now the PRIMARY discriminator
at 60% weight. Semantic embeddings (BGE/MiniLM) are de-weighted to 2.5% each
because cosine similarity between ANY English text chunks is ~0.3-0.5,
making them unable to distinguish a finance resume from an SDE resume.

Scoring Architecture
─────────────────────────────────────────────────────────────────────
SIGNAL                              WEIGHT
──────────────────────────────────  ──────
NER Skill Overlap (canonical)       60 %   ← PRIMARY DISCRIMINATOR
BM25 Keyword Retrieval              15 %
Cross-Encoder (sigmoid scaled)      10 %
Temporal Recency                    10 %
BGE Bi-Encoder                       2.5%
MiniLM Bi-Encoder                    2.5%

Pre-filter multiplier (applied after ensemble):
  years found >= required  →  × 1.00
  years found <  required  →  × 0.50
  years not detectable     →  × 0.75  (soft neutral — benefit of the doubt)
"""

import re
import string
import datetime
import warnings
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

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


# ══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

CURRENT_YEAR    = datetime.datetime.now().year
HALF_LIFE_YEARS = 5       # recency half-life in years
HARD_FILTER_PENALTY  = 0.50   # multiplier when years < required
SOFT_NEUTRAL_MULT    = 0.75   # multiplier when years can't be determined

WEIGHTS = {
    "bge":           0.025,   #  2.5% semantic (very noisy — same score for any text)
    "minilm":        0.025,   #  2.5% semantic
    "cross_encoder": 0.100,   # 10%  precision context (passage retrieval, not skill matcher)
    "bm25":          0.150,   # 15%  keyword retrieval
    "ner_skills":    0.600,   # 60%  hard skill overlap  ← THE DISCRIMINATOR
    "temporal":      0.100,   # 10%  recency / experience proxy
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


# ══════════════════════════════════════════════════════════════════════════════
#  SCORE CALIBRATION
# ══════════════════════════════════════════════════════════════════════════════

def _calibrate_single(raw_ensemble: float, skill_ratio: float, exp_mult: float) -> float:
    """
    Absolute score for a SINGLE candidate (web-app mode).

    The raw_ensemble is now dominated by skill overlap (60% weight), so it
    already encodes strong domain discrimination.  We blend it with an
    experience modifier to produce the final score.
    """
    # Experience score
    if exp_mult >= 1.0:
        exp_score = 90.0
    elif exp_mult >= 0.75:
        exp_score = 55.0
    else:
        exp_score = 25.0

    # If the candidate has 0 relevant skills, their experience in another field shouldn't boost them.
    if skill_ratio == 0:
        exp_score = 0.0
        final = raw_ensemble * 0.5  # Heavy penalty for zero skill overlap
    else:
        if skill_ratio < 0.3:
            exp_score *= 0.3  # Scale down experience if skills are severely lacking

        # Blend: 75% ensemble + 25% experience context
        final = 0.75 * raw_ensemble + 0.25 * exp_score

    return round(max(5.0, min(98.0, final)), 2)

SKILL_SYNONYMS: dict[str, list[str]] = {
    "python":                      ["py"],
    "javascript":                  ["js", "node.js", "nodejs", "node"],
    "typescript":                  ["ts"],
    "golang":                      ["go lang", "go"],
    "c++":                         ["cpp", "c plus plus"],
    "c#":                          ["csharp", "dotnet", ".net"],
    "ruby on rails":               ["rails", "ror"],
    "machine learning":            ["ml", "statistical learning"],
    "deep learning":               ["dl", "neural networks", "neural network"],
    "natural language processing": ["nlp", "text mining"],
    "computer vision":             ["cv", "image recognition"],
    "large language models":       ["llm", "llms", "generative ai", "gen ai"],
    "reinforcement learning":      ["rl"],
    "amazon web services":         ["aws", "amazon cloud"],
    "google cloud platform":       ["gcp", "google cloud"],
    "microsoft azure":             ["azure"],
    "kubernetes":                  ["k8s", "kube"],
    "docker":                      ["containerization", "containers"],
    "continuous integration":      ["ci", "ci/cd", "cicd"],
    "continuous deployment":       ["cd", "ci/cd", "cicd"],
    "infrastructure as code":      ["iac", "terraform", "pulumi"],
    "postgresql":                  ["postgres", "psql"],
    "microsoft sql server":        ["mssql", "sql server"],
    "mongodb":                     ["mongo"],
    "elasticsearch":               ["elastic", "es"],
    "apache kafka":                ["kafka"],
    "apache spark":                ["spark", "pyspark"],
    "react":                       ["react.js", "reactjs"],
    "angular":                     ["angular.js", "angularjs"],
    "vue":                         ["vue.js", "vuejs"],
    "graphql":                     ["graph ql"],
    "data science":                ["ds", "data scientist"],
    "data engineering":            ["data engineer", "de"],
    "business intelligence":       ["bi", "business analytics"],
    "etl":                         ["extract transform load", "data pipeline"],
    "agile":                       ["scrum", "kanban", "sprint"],
    "rest api":                    ["restful", "rest", "api development"],
    "microservices":               ["micro services", "soa"],
    "artificial intelligence":     ["ai"],
    "sql":                         ["structured query language"],
    "java":                        ["java ee", "java se", "spring", "spring boot"],
    "android":                     ["android development", "android sdk"],
    "ios":                         ["swift", "objective-c", "xcode"],
    "flutter":                     ["dart"],
    "devops":                      ["dev ops", "site reliability", "sre"],
}

_ALIAS_TO_CANONICAL: dict[str, str] = {
    alias: canonical
    for canonical, aliases in SKILL_SYNONYMS.items()
    for alias in aliases
}

# Also add self-mappings so canonical names map to themselves
for canonical in SKILL_SYNONYMS:
    _ALIAS_TO_CANONICAL[canonical] = canonical


# ══════════════════════════════════════════════════════════════════════════════
#  NER PIPELINE  (FIX 1 — case-insensitive token patterns)
# ══════════════════════════════════════════════════════════════════════════════

def _make_ner_patterns() -> list[dict]:
    """
    Build EntityRuler patterns using the token-level dict format:
        [{"LOWER": "machine"}, {"LOWER": "learning"}]
    spaCy applies LOWER matching case-insensitively, so "Python",
    "PYTHON", and "python" all match the same pattern.
    """
    patterns = []
    seen     = set()
    for canonical, aliases in SKILL_SYNONYMS.items():
        for surface in [canonical] + aliases:
            if surface in seen:
                continue
            seen.add(surface)
            tokens = surface.split()
            patterns.append({
                "label":   "TECH_SKILL",
                "pattern": [{"LOWER": t} for t in tokens],
            })
    return patterns


def _build_ner_pipeline():
    nlp   = spacy.load("en_core_web_sm", disable=["ner", "lemmatizer"])
    ruler = nlp.add_pipe("entity_ruler", config={"overwrite_ents": True})
    ruler.add_patterns(_make_ner_patterns())
    return nlp


def _extract_ner_skills(nlp, text: str) -> set:
    """
    Extract skills from text and map them to CANONICAL forms.
    This ensures 'js' in a resume matches 'javascript' in the query,
    'react.js' matches 'react', 'aws' matches 'amazon web services', etc.
    """
    doc = nlp(text[:50_000])
    skills = set()
    for ent in doc.ents:
        if ent.label_ == "TECH_SKILL":
            surface = ent.text.lower()
            # Map to canonical form — 'js' → 'javascript', 'aws' → 'amazon web services'
            canonical = _ALIAS_TO_CANONICAL.get(surface, surface)
            skills.add(canonical)
    return skills


def _score_ner_skills(nlp, query_skills: set, texts: list) -> np.ndarray:
    """
    Score each resume by fraction of required skills found.
    Both query_skills and resume skills are in CANONICAL form,
    so 'js' in resume correctly matches 'javascript' in query.
    """
    if not query_skills:
        return np.full(len(texts), 50.0)
    scores = []
    for text in texts:
        resume_skills = _extract_ner_skills(nlp, text)
        hit = len(query_skills & resume_skills)
        scores.append((hit / len(query_skills)) * 100.0)
    return np.array(scores)


# ══════════════════════════════════════════════════════════════════════════════
#  STRUCTURED KEY-VALUE PARSER
#  The combined_resume field is in "col: value\ncol: value" format.
#  Parsing this directly is more reliable than regex-scanning free text.
# ══════════════════════════════════════════════════════════════════════════════

def _parse_kv(combined_resume: str) -> dict[str, str]:
    """
    Parses the 'col: value\\ncol: value' format produced by load_and_prep_candidates
    into a lowercase-key dictionary.

    Example input line:  "Years of Experience: 7"
    Example output:      {"years of experience": "7"}
    """
    kv = {}
    for line in combined_resume.split("\n"):
        if ":" in line:
            key, _, val = line.partition(":")
            kv[key.strip().lower()] = val.strip()
    return kv


# Keywords that identify an experience column
_EXP_KEYWORDS = ["experience", "years", "exp", "yrs", "tenure", "seniority"]

# Regex for extracting a numeric value from strings like "7", "7.5", "7+"
_NUM_RE = re.compile(r"(\d+(?:\.\d+)?)")

# Regex for free-text fallback (when KV parsing finds nothing)
_EXP_TEXT_PATTERNS = [
    re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience", re.I),
    re.compile(r"experience\s*[:\-]?\s*(\d{1,2})", re.I),
    re.compile(r"over\s+(\d{1,2})\s+years?", re.I),
    re.compile(r"more\s+than\s+(\d{1,2})\s+years?", re.I),
    re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)", re.I),
]


# ══════════════════════════════════════════════════════════════════════════════
#  TEMPORAL RECENCY — structured-data-aware
#
#  Root cause of "all 50.00":
#    The Kaggle dataset is a structured CSV, NOT a free-text resume.
#    There are no "Python (2019–2023)" strings to parse.
#
#  New approach (two-tier):
#    Tier 1 — KV column scan: look for a "skills" or "technology" column and
#             check whether each required skill is explicitly listed there.
#             Skills found in a dedicated column → confidently current (high score).
#             Skills absent from the column → likely not in toolkit (low score).
#    Tier 2 — Experience-year proxy: use years_of_experience to estimate
#             recency. A professional with 8 years of exp presumably used
#             their listed skills within the last few years.
# ══════════════════════════════════════════════════════════════════════════════

# Column name fragments that indicate a dedicated skills/tech column
_SKILL_COL_KEYWORDS = ["skill", "tech", "tool", "stack", "language", "framework",
                        "competenc", "proficien", "expertise"]


def _score_temporal(query_skills: set, texts: list) -> np.ndarray:
    """
    Structured-CSV temporal scoring.

    For each resume:
      1. Parse KV pairs.
      2. Find any 'skills'/'technology' column → check query skill coverage.
         coverage = fraction of required skills explicitly listed in that column.
         Mapped to [60, 100]: present = assumed current.
      3. Find 'years of experience' column → estimate activity recency.
         Professionals with ≥5 yrs likely still using their stack → boost toward 80.
      4. Blend both signals. If neither is available → 50.0 (neutral).
    """
    if not query_skills:
        return np.full(len(texts), 50.0)

    scores = []
    for text in texts:
        kv = _parse_kv(text)

        # ── Tier 1: skill-column coverage ────────────────────────────────────
        skill_coverage = None
        for key, val in kv.items():
            if any(kw in key for kw in _SKILL_COL_KEYWORDS):
                val_lower = val.lower()
                hit = sum(1 for s in query_skills if s in val_lower)
                skill_coverage = (hit / len(query_skills))   # 0.0 – 1.0
                break   # use the first matching skills column

        # ── Tier 2: experience-year proxy ────────────────────────────────────
        exp_years = None
        for key, val in kv.items():
            if any(kw in key for kw in _EXP_KEYWORDS):
                m = _NUM_RE.search(val)
                if m:
                    candidate_val = float(m.group(1))
                    if 0 < candidate_val < 60:
                        exp_years = candidate_val
                        break

        # ── Blend ─────────────────────────────────────────────────────────────
        if skill_coverage is not None and exp_years is not None:
            # Skills present in dedicated column + decent experience → high recency
            coverage_score = 60.0 + skill_coverage * 40.0   # 60–100
            exp_boost      = min(20.0, exp_years * 2.0)      # 0–20 bonus
            score          = min(100.0, coverage_score + exp_boost * (1 - skill_coverage))
        elif skill_coverage is not None:
            score = 60.0 + skill_coverage * 40.0
        elif exp_years is not None:
            # No skills column — use experience as a weak proxy
            # More years → likely more recent relevant activity
            score = min(85.0, 40.0 + exp_years * 3.5)
        else:
            score = 50.0   # truly unknown → neutral

        scores.append(score)

    return np.array(scores)


# ══════════════════════════════════════════════════════════════════════════════
#  HARD-REQUIREMENT PRE-FILTER — structured-data-aware
#
#  Root cause of "all 0.75":
#    _extract_max_years built a fake single-column Series and called
#    row.index — so the original CSV column names were never visible.
#    Also, the KV parser wasn't being used, so "Years of Experience: 7"
#    in combined_resume was missed entirely.
#
#  New approach:
#    Pass 0 — KV parse of combined_resume (catches "Years of Experience: 7").
#    Pass 1 — original CSV row column scan (catches numeric columns directly).
#    Pass 2 — free-text regex fallback.
# ══════════════════════════════════════════════════════════════════════════════

def _extract_max_years(row: pd.Series) -> int | None:
    """
    Three-pass experience year extraction.

    Pass 0 — Parse structured KV lines from combined_resume.
             Catches "Years of Experience: 7" or "Experience: Senior (8 yrs)".
    Pass 1 — Scan original CSV column values directly by column name.
    Pass 2 — Free-text regex fallback across the full resume string.
    """
    resume_text = str(row.get("combined_resume", ""))

    # ── Pass 0: KV parse (PRIMARY — most reliable for this dataset) ───────────
    kv = _parse_kv(resume_text)
    for key, val in kv.items():
        if any(kw in key for kw in _EXP_KEYWORDS):
            m = _NUM_RE.search(val)
            if m:
                candidate = float(m.group(1))
                if 0 < candidate < 60:
                    return int(candidate)

    # ── Pass 1: original CSV row column scan ──────────────────────────────────
    for col in row.index:
        col_norm = col.lower().replace(" ", "_").replace("-", "_")
        if any(kw in col_norm for kw in _EXP_KEYWORDS):
            try:
                val = float(row[col])
                if 0 < val < 60:
                    return int(val)
            except (ValueError, TypeError):
                # Non-numeric value in column — try extracting number from string
                m = _NUM_RE.search(str(row[col]))
                if m:
                    candidate = float(m.group(1))
                    if 0 < candidate < 60:
                        return int(candidate)

    # ── Pass 2: free-text regex ───────────────────────────────────────────────
    found = []
    for pattern in _EXP_TEXT_PATTERNS:
        for m in pattern.finditer(resume_text):
            try:
                found.append(int(float(m.group(1))))
            except (IndexError, ValueError):
                pass

    return max(found) if found else None


def _hard_filter_multipliers(df: pd.DataFrame, min_years: int) -> np.ndarray:
    """
    Returns per-candidate multiplier:
      years_found >= min_years  →  1.00  (pass)
      years_found <  min_years  →  0.50  (hard fail)
      years not detectable      →  0.75  (soft neutral)
    """
    multipliers = []
    detected    = {"pass": 0, "fail": 0, "unknown": 0}
    sample_shown = False

    for _, row in df.iterrows():
        max_yrs = _extract_max_years(row)

        # Print one example to confirm extraction is working
        if not sample_shown:
            print(f"  Sample experience extraction: {max_yrs} years detected")
            sample_shown = True

        if max_yrs is None:
            mult = SOFT_NEUTRAL_MULT
            detected["unknown"] += 1
        elif max_yrs >= min_years:
            mult = 1.00
            detected["pass"] += 1
        else:
            mult = HARD_FILTER_PENALTY
            detected["fail"] += 1
        multipliers.append(mult)

    print(
        f"  Pre-filter — ✅ pass: {detected['pass']}  "
        f"❌ fail: {detected['fail']}  ❓ unknown: {detected['unknown']}"
    )
    return np.array(multipliers)


# ══════════════════════════════════════════════════════════════════════════════
#  SHARED HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _expand_text(text: str) -> str:
    t = text.lower()
    for alias, canonical in _ALIAS_TO_CANONICAL.items():
        t = re.sub(rf"\b{re.escape(alias)}\b", canonical, t)
    return t


def _tokenise(text: str) -> list[str]:
    expanded = _expand_text(text)
    return expanded.translate(str.maketrans("", "", string.punctuation)).split()


def _normalise(arr: np.ndarray) -> np.ndarray:
    lo, hi = float(arr.min()), float(arr.max())
    if hi == lo:
        return np.full(len(arr), 50.0)
    return ((arr - lo) / (hi - lo)) * 100.0


def _sigmoid_scale(logits: np.ndarray) -> np.ndarray:
    return (1.0 / (1.0 + np.exp(-logits.astype(float)))) * 100.0


# ══════════════════════════════════════════════════════════════════════════════
#  DIAGNOSTIC HELPER  (run this to debug zero scores)
# ══════════════════════════════════════════════════════════════════════════════

def diagnose(scorer, query: str, sample_resume: str):
    """
    Prints a full diagnostic for one resume.
    Usage:
        diagnose(scorer, recruiter_query, candidates_df.iloc[0]['combined_resume'])
    """
    print("\n" + "═"*62)
    print("  DIAGNOSTIC REPORT  (first candidate)")
    print("═"*62)

    # ── NER ───────────────────────────────────────────────────────────────────
    q_skills = _extract_ner_skills(scorer.nlp, query)
    r_skills = _extract_ner_skills(scorer.nlp, sample_resume)
    overlap  = q_skills & r_skills
    print(f"\n  NER query skills   : {sorted(q_skills) or '⚠ NONE — add to SKILL_SYNONYMS'}")
    print(f"  NER resume skills  : {sorted(r_skills) or '⚠ NONE'}")
    print(f"  NER overlap        : {sorted(overlap)  or '⚠ NONE'}")

    # ── KV parse ──────────────────────────────────────────────────────────────
    kv = _parse_kv(sample_resume)
    print(f"\n  Structured KV columns detected ({len(kv)} total):")
    for k, v in list(kv.items())[:12]:
        print(f"    '{k}' → '{v[:60]}'")
    if len(kv) > 12:
        print(f"    … and {len(kv)-12} more")

    # ── Experience ────────────────────────────────────────────────────────────
    fake_row = pd.Series({"combined_resume": sample_resume})
    yrs = _extract_max_years(fake_row)
    print(f"\n  Experience detected : {yrs} years  {'✅' if yrs else '⚠ not found — check column names above'}")

    # ── Temporal ──────────────────────────────────────────────────────────────
    temp_score = _score_temporal(q_skills, [sample_resume])[0]
    print(f"  Temporal score     : {temp_score:.1f}")

    # ── Skill columns ─────────────────────────────────────────────────────────
    skill_kv = {k: v for k, v in kv.items() if any(kw in k for kw in _SKILL_COL_KEYWORDS)}
    if skill_kv:
        print(f"\n  Skill columns found:")
        for k, v in skill_kv.items():
            print(f"    '{k}' → '{v[:80]}'")
    else:
        print("\n  ⚠ No dedicated skill columns found in KV pairs")

    print("\n" + "═"*62)


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN SCORER CLASS
# ══════════════════════════════════════════════════════════════════════════════

class IndustryATSScorer:

    def __init__(
        self,
        bge_model:   str = "BAAI/bge-small-en-v1.5",
        mini_model:  str = "sentence-transformers/all-MiniLM-L6-v2",
        cross_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    ):
        _banner("INDUSTRY-GRADE ATS SCORER — initialising")

        print(f"\n  [1/4] BGE bi-encoder     : {bge_model}")
        self.bge    = SentenceTransformer(bge_model)

        print(f"  [2/4] MiniLM bi-encoder  : {mini_model}")
        self.minilm = SentenceTransformer(mini_model)

        print(f"  [3/4] Cross-Encoder (DL) : {cross_model}")
        self.cross  = CrossEncoder(
            cross_model, max_length=512, default_activation_function=None
        )

        print("  [4/4] spaCy NER pipeline (case-insensitive patterns) …")
        self.nlp = _build_ner_pipeline()

        print("\n  Success:  All components ready.\n")

    def load_and_prep_candidates(
        self, uri: str = "mongodb://localhost:27017", limit: int = None
    ) -> pd.DataFrame:
        import pymongo
        print(f"Loading candidates from MongoDB at: {uri}")
        client = pymongo.MongoClient(uri)
        db = client["ats_db"]
        
        rows = []
        for r in db.resumes.find():
            u_id = r.get("userId") or r.get("user_id")
            user = db.users.find_one({"id": u_id}) or {}
            
            r_id = r.get("id")
            edu_cur = db.education.find({"resume_id": r_id})
            edu_str = " | ".join([f"{e.get('degree', '')} {e.get('field', '')} {e.get('institution', '')}" for e in edu_cur])
            
            exp_cur = db.experience.find({"resume_id": r_id})
            exp_str = " | ".join([f"{x.get('title', '')} {x.get('company', '')} {x.get('description', '')}" for x in exp_cur])
            
            skills = ", ".join(r.get("skills", []))
            
            rows.append({
                "id": r_id,
                "Skills": skills,
                "Education": edu_str,
                "Experience": exp_str,
                "Role": user.get("role", "candidate")
            })
            if limit and len(rows) >= limit:
                break
                
        df = pd.DataFrame(rows)
        if df.empty:
            df = pd.DataFrame([{"id": -1, "Skills": "None", "Experience": "0", "Education": "None", "Role": "None"}])
            
        df["combined_resume"] = df.apply(
            lambda row: "\n".join(f"{c}: {v}" for c, v in row.items()), axis=1
        )
        
        exp_cols = [c for c in df.columns if c.lower().replace(" ", "_") in _EXP_COL_NAMES]
        print(f"Prepared {len(df)} profiles.  Experience columns detected: {exp_cols or 'none — will use regex'}\n")
        return df
    def _score_bge(self, query, texts):
        """BGE semantic similarity — raw cosine * 100, NO 2x inflation."""
        q = self.bge.encode(query)
        r = self.bge.encode(texts, show_progress_bar=True)
        raw = cosine_similarity([q], r)[0] * 100
        return np.clip(raw, 0.0, 100.0)

    def _score_minilm(self, query, texts):
        """MiniLM semantic similarity — raw cosine * 100, NO 2x inflation."""
        q = self.minilm.encode(query)
        r = self.minilm.encode(texts, show_progress_bar=True)
        raw = cosine_similarity([q], r)[0] * 100
        return np.clip(raw, 0.0, 100.0)

    def _score_cross_encoder(self, query, texts):
        """
        Cross-encoder scoring with sigmoid scaling to [0, 100].
        NO artificial floor — irrelevant text should score near 0.
        """
        pairs  = [(query, t) for t in texts]
        logits = self.cross.predict(
            pairs, batch_size=32, show_progress_bar=True, convert_to_numpy=True
        )
        return _sigmoid_scale(logits)

    def _score_bm25(self, query, texts):
        """
        BM25 keyword retrieval.
        For single candidates: use sigmoid-based absolute scoring instead of
        _normalise which always returns 50.0 when there's only one candidate.
        """
        tokenised = [_tokenise(t) for t in texts]
        bm25      = BM25Okapi(tokenised, k1=1.5, b=0.75)
        raw       = np.array(bm25.get_scores(_tokenise(query)), dtype=float)
        if len(texts) <= 2:
            # Absolute scoring: sigmoid maps raw BM25 to [0, 100]
            return np.round(np.clip(100.0 / (1.0 + np.exp(-0.1 * (raw - 15))), 0, 100), 2)
        return _normalise(raw)

    def find_top_candidates(
        self,
        recruiter_query: str,
        df: pd.DataFrame,
        min_years_exp: int = 0,
        top_n: int = 5,
        run_diagnostic: bool = False,
    ) -> pd.DataFrame:

        texts        = df["combined_resume"].tolist()
        query_skills = _extract_ner_skills(self.nlp, recruiter_query)
        print(f"  NER extracted query skills: {sorted(query_skills) or '⚠ none — check synonym table'}\n")

        if run_diagnostic and len(texts) > 0:
            diagnose(self, recruiter_query, texts[0])

        print("─" * 62)
        print("[Semantic  1/2]  BGE Bi-Encoder …")
        bge_s   = self._score_bge(recruiter_query, texts)

        print("\n[Semantic  2/2]  MiniLM Bi-Encoder …")
        mini_s  = self._score_minilm(recruiter_query, texts)

        print("\n[Precision 1/2]  Cross-Encoder (sigmoid) …")
        cross_s = self._score_cross_encoder(recruiter_query, texts)

        print("\n[Precision 2/2]  BM25 Retrieval …")
        bm25_s  = self._score_bm25(recruiter_query, texts)

        print("\n[Validation 1/2]  NER Skill Overlap …")
        ner_s   = _score_ner_skills(self.nlp, query_skills, texts)

        print("\n[Validation 2/2]  Temporal Recency …")
        temp_s  = _score_temporal(query_skills, texts)

        calibrated = np.zeros(len(texts))

        # ── Calibrate ─────────────────────────────────────────────────────
        if len(texts) >= 3:
            # Pool mode: raw ensemble is used (already normalized/weighted)
            calibrated = ensemble
        else:
            # Single-candidate mode (web app): absolute scoring using
            # skill overlap as the primary discriminator (60% weight in ensemble)
            for i in range(len(texts)):
                if query_skills:
                    resume_skills = _extract_ner_skills(self.nlp, texts[i])
                    skill_ratio = len(query_skills & resume_skills) / len(query_skills)
                else:
                    skill_ratio = 0.5   # no skills to check → neutral
                calibrated[i] = _calibrate_single(
                    ensemble[i], skill_ratio, multipliers[i]
                )

        df = df.copy()
        df["score_bge"]           = np.round(bge_s,    2)
        df["score_minilm"]        = np.round(mini_s,   2)
        df["score_cross_encoder"] = np.round(cross_s,  2)
        df["score_bm25"]          = np.round(bm25_s,   2)
        df["score_ner_skills"]    = np.round(ner_s,    2)
        df["score_temporal"]      = np.round(temp_s,   2)
        df["exp_multiplier"]      = np.round(multipliers, 2)
        df["match_score"]         = np.round(calibrated, 2)

        return df.sort_values("match_score", ascending=False)


# ══════════════════════════════════════════════════════════════════════════════
#  DISPLAY
# ══════════════════════════════════════════════════════════════════════════════

SCORE_COLS = [
    "score_bge", "score_minilm", "score_cross_encoder", "score_bm25",
    "score_ner_skills", "score_temporal", "exp_multiplier", "match_score",
]
# Column names commonly used in CSVs to represent experience
_EXP_COL_NAMES = ["years_of_experience", "experience", "total_experience", "yrs_exp", "experience_years"]

SIGNAL_LABELS = {
    "score_bge":           f"BGE Bi-Encoder         ({WEIGHTS['bge']*100:.4g}%)",
    "score_minilm":        f"MiniLM Bi-Encoder      ({WEIGHTS['minilm']*100:.4g}%)",
    "score_cross_encoder": f"Cross-Encoder [DL]     ({WEIGHTS['cross_encoder']*100:.4g}%)",
    "score_bm25":          f"BM25 Retrieval         ({WEIGHTS['bm25']*100:.4g}%)",
    "score_ner_skills":    f"NER Skill Overlap      ({WEIGHTS['ner_skills']*100:.4g}%)",
    "score_temporal":      f"Temporal Recency       ({WEIGHTS['temporal']*100:.4g}%)",
    "exp_multiplier":      "Experience Multiplier  (pre-filter)",
    "match_score":         "FINAL SCORE",
}


def _banner(t):
    print("\n" + "═"*62)
    print(f"  {t}")
    print("═"*62)


def display_results(top_df: pd.DataFrame, job_position: str):
    _banner(f"TOP {len(top_df)} CANDIDATES — {job_position.upper()}")
    try:
        from IPython.display import display as ipy_display
        _ipython_display(top_df, job_position, ipy_display)
    except (ImportError, ModuleNotFoundError):
        _ascii_display(top_df)


def _ipython_display(top_df, job_position, ipy_display):
    display_df         = top_df[SCORE_COLS].copy()
    display_df.index   = [f"Rank #{i+1}" for i in range(len(display_df))]
    display_df.columns = [SIGNAL_LABELS.get(c, c) for c in display_df.columns]

    def _colour(val):
        if isinstance(val, float) and val <= 1.0:
            return "background-color: #ffe0e0; font-weight: bold; text-align:center" if val < 1.0 \
                   else "background-color: #f0f0f0; text-align:center"
        colour = "#c6efce" if val >= 75 else "#ffeb9c" if val >= 50 else "#ffc7ce"
        return f"background-color: {colour}; font-weight: bold; text-align: center"

    styled = (
        display_df.style
        .applymap(_colour)
        .set_caption(f"<b>ATS Results — {job_position}</b>")
        .set_table_styles([
            {"selector": "caption",
             "props": [("font-size","16px"),("text-align","left"),("padding","8px 0")]},
            {"selector": "th",
             "props": [("background-color","#2d3748"),("color","white"),
                       ("padding","6px 12px"),("font-size","12px")]},
            {"selector": "td",
             "props": [("padding","6px 14px"),("font-size","13px")]},
        ])
        .format("{:.2f}")
    )
    ipy_display(styled)

    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(8, 3))
    ranks  = [f"Rank #{i+1}" for i in range(len(top_df))]
    scores = top_df["match_score"].values
    cols   = ["#276749" if s >= 75 else "#b7791f" if s >= 50 else "#c53030" for s in scores]
    bars   = ax.barh(ranks[::-1], scores[::-1], color=cols[::-1])
    ax.bar_label(bars, fmt="%.1f", padding=4, fontsize=11, fontweight="bold")
    ax.set_xlim(0, 105)
    ax.set_xlabel("ATS Match Score (0–100)")
    ax.set_title(f"Candidate Rankings — {job_position}", fontweight="bold")
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.show()


def _ascii_display(top_df):
    seps = {"score_cross_encoder", "score_ner_skills", "exp_multiplier", "match_score"}
    for rank, (_, row) in enumerate(top_df.iterrows(), start=1):
        print(f"\n{'─'*64}")
        print(f"  RANK #{rank}")
        snippet = row["combined_resume"].replace("\n", " | ")[:155]
        print(f"  {snippet}…\n")
        print(f"  ┌{'─'*42}┬{'─'*11}┐")
        print(f"  │ {'Signal':<40} │  {'Score':>7}  │")
        for col in SCORE_COLS:
            if col in seps:
                print(f"  ├{'─'*42}┼{'─'*11}┤")
            label  = SIGNAL_LABELS.get(col, col)
            value  = row[col]
            marker = "  ◄" if col == "match_score" else ""
            flag   = "  ⚠" if col == "exp_multiplier" and value < 1.0 else ""
            print(f"  │ {label:<40} │  {value:>6.2f}   │{marker}{flag}")
        print(f"  └{'─'*42}┴{'─'*11}┘")
    print("\n" + "═"*64)


# ══════════════════════════════════════════════════════════════════════════════
#  FASTAPI BACKEND INTEGRATION
# ══════════════════════════════════════════════════════════════════════════════

_ml_pipeline = None

def get_ml_pipeline() -> IndustryATSScorer:
    global _ml_pipeline
    if _ml_pipeline is None:
        _ml_pipeline = IndustryATSScorer()
    return _ml_pipeline

def score_single_application(job_details: dict, candidate_resume: dict, candidate_user: dict) -> int:
    from app.database import get_collection
    import pandas as pd
    
    required_skills = job_details.get("required_skills", []) or []
    recruiter_query = (
        f"Title: {job_details.get('title', '')}\n"
        f"Required Experience: {job_details.get('experience_level', '')} years\n"
        f"Skills: {', '.join(required_skills)}\n"
        f"Description: {job_details.get('description', '')}"
    )
    
    resume_skills = ", ".join(candidate_resume.get("skills", []))
    r_id = candidate_resume.get("id")
    
    edu_cur = get_collection("education").find({"resume_id": r_id})
    edu_str = " | ".join([f"{e.get('degree', '')} {e.get('field', '')} {e.get('institution', '')}" for e in edu_cur])
    
    exp_cur = get_collection("experience").find({"resume_id": r_id})
    exp_str = " | ".join([f"{x.get('title', '')} {x.get('company', '')} {x.get('description', '')}" for x in exp_cur])
    
    df = pd.DataFrame([{
        "id": r_id,
        "Skills": resume_skills,
        "Education": edu_str,
        "Experience": exp_str,
        "Role": candidate_user.get("role", "candidate")
    }])
    
    df["combined_resume"] = df.apply(
        lambda row: "\n".join(f"{c}: {v}" for c, v in row.items()), axis=1
    )
    
    # 🚨 BLANK PDF INTERCEPTOR:
    # If the total parsed text from skills, education, and experience is essentially empty,
    # block the AI and immediately return 0. Sentence embeddings for empty strings natively 
    # sit near the vector origin which mathematically generates a ~20% "baseline" similarity!
    total_resume_content = (resume_skills + edu_str + exp_str).strip()
    if len(total_resume_content) < 10:
        return 0
    
    from app.config import HF_SPACES_URL
    import requests

    if HF_SPACES_URL:
        try:
            payload = {
                "job_title": job_details.get("title", ""),
                "job_description": job_details.get("description", ""),
                "required_skills": required_skills,
                "experience_level": str(job_details.get("experience_level", "0")),
                "candidate_skills": resume_skills,
                "candidate_education": edu_str,
                "candidate_experience": exp_str,
                "candidate_role": candidate_user.get("role", "candidate")
            }
            resp = requests.post(f"{HF_SPACES_URL.rstrip('/')}/score", json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("match_score", 0)
            else:
                print("HF Space returned error:", resp.text)
        except Exception as e:
            print("HF ML Scorer Error (Is the Space still building?):", e)
            
        # VERY IMPORTANT: If the cloud is still building or failed, 
        # do NOT fallback to the exact local AI load because it freezes the PC!
        # Fallback to the ultra-fast secondary string matching instead!
        user_skills = [s.lower() for s in (candidate_resume.get("skills", []) or [])]
        required_lower = [s.lower() for s in required_skills]
        matching = [s for s in required_lower if s in user_skills]
        return round(len(matching) / len(required_lower) * 100) if required_lower else 0

    # (Original Local ML Logic if HF_SPACES_URL is not set at all)
    try:
        scorer = get_ml_pipeline()
        scored_df = scorer.find_top_candidates(recruiter_query, df, top_n=1)
        if not scored_df.empty:
            score = float(scored_df.iloc[0]["match_score"])
            return max(0, min(100, int(score)))
    except Exception as e:
        print("ML Scorer Error:", e)
        
    user_skills = [s.lower() for s in (candidate_resume.get("skills", []) or [])]
    required_lower = [s.lower() for s in required_skills]
    matching = [s for s in required_lower if s in user_skills]
    return round(len(matching) / len(required_lower) * 100) if required_lower else 0
