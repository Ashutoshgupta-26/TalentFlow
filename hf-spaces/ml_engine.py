import re
import string
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
#  CONFIGURATION & WEIGHTS
#
#  NER Skill Overlap is the PRIMARY discriminator (60%).
#  Semantic matchers are heavily de-weighted because cosine similarity between
#  ANY two English text chunks is ~0.3-0.5, which makes them poor at
#  discriminating between a finance resume and an SDE resume for an SDE job.
# ══════════════════════════════════════════════════════════════════════════════

HARD_FILTER_PENALTY = 0.50
SOFT_NEUTRAL_MULT   = 0.75

WEIGHTS = {
    "bge":           0.025,   #  2.5% semantic (very noisy — same score for any text)
    "minilm":        0.025,   #  2.5% semantic
    "cross_encoder": 0.100,   # 10%  precision context (passage retrieval, not skill matcher)
    "bm25":          0.150,   # 15%  keyword retrieval
    "ner_skills":    0.600,   # 60%  hard skill overlap  ← THE DISCRIMINATOR
    "temporal":      0.100,   # 10%  recency / experience proxy
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9

_EXP_KEYWORDS = ["experience", "years", "exp", "yrs", "tenure", "seniority"]
_NUM_RE = re.compile(r"(\d+(?:\.\d+)?)")
_EXP_TEXT_PATTERNS = [
    re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience", re.I),
    re.compile(r"experience\s*[:\-]?\s*(\d{1,2})", re.I),
    re.compile(r"over\s+(\d{1,2})\s+years?", re.I),
    re.compile(r"more\s+than\s+(\d{1,2})\s+years?", re.I),
    re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)", re.I),
]

_SKILL_COL_KEYWORDS = [
    "skill", "tech", "tool", "stack", "language", "framework",
    "competenc", "proficien", "expertise",
]


# ══════════════════════════════════════════════════════════════════════════════
#  SCORE CALIBRATION
#
#  POOL MODE  (≥ 3 candidates):  percentile stretch  p10 → 30,  p90 → 92
#  SINGLE MODE (1-2 candidates): absolute scoring driven by raw ensemble
#       (which is now 60% skill overlap) plus experience modifier.
#       Finance resume → ~8-18 for SDE job.  SDE resume → ~72-88.
# ══════════════════════════════════════════════════════════════════════════════

TARGET_LOW  = 30.0
TARGET_HIGH = 92.0


def _calibrate_pool(raw: np.ndarray) -> np.ndarray:
    """Percentile stretch for pools of ≥ 3 candidates."""
    x   = raw.astype(float)
    p10 = float(np.percentile(x, 10))
    p90 = float(np.percentile(x, 90))

    if p90 - p10 < 1e-6:
        return np.full(len(x), round((TARGET_LOW + TARGET_HIGH) / 2, 2))

    slope  = (TARGET_HIGH - TARGET_LOW) / (p90 - p10)
    mapped = TARGET_LOW + slope * (x - p10)
    return np.round(np.clip(mapped, 5.0, 98.0), 2)


def _calibrate_single(raw_ensemble: float, skill_ratio: float, exp_mult: float) -> float:
    """
    Absolute score for a SINGLE candidate (web-app mode).

    The raw_ensemble is now dominated by skill overlap (60% weight), so it
    already encodes strong domain discrimination.  We blend it with an
    experience modifier to produce the final score.

    Finance resume with 0% skill overlap → raw_ensemble ≈ 8-15 → final ≈ 10-18
    SDE resume with 80% skill overlap   → raw_ensemble ≈ 55-70 → final ≈ 72-85
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


# ══════════════════════════════════════════════════════════════════════════════
#  SKILL SYNONYM TABLE
# ══════════════════════════════════════════════════════════════════════════════

SKILL_SYNONYMS = {
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
    "amazon web services":         ["aws", "amazon cloud"],
    "google cloud platform":       ["gcp", "google cloud"],
    "microsoft azure":             ["azure"],
    "kubernetes":                  ["k8s", "kube"],
    "docker":                      ["containerization", "containers"],
    "continuous integration":      ["ci", "ci/cd", "cicd"],
    "postgresql":                  ["postgres", "psql"],
    "mongodb":                     ["mongo"],
    "elasticsearch":               ["elastic", "es"],
    "apache kafka":                ["kafka"],
    "apache spark":                ["spark", "pyspark"],
    "react":                       ["react.js", "reactjs"],
    "angular":                     ["angular.js", "angularjs"],
    "vue":                         ["vue.js", "vuejs"],
    "sql":                         ["structured query language"],
    "java":                        ["java ee", "java se", "spring", "spring boot"],
    "android":                     ["android development", "android sdk"],
    "ios":                         ["swift", "objective-c", "xcode"],
    "flutter":                     ["dart"],
    "devops":                      ["dev ops", "site reliability", "sre"],
    "data science":                ["ds", "data scientist"],
    "data engineering":            ["data engineer", "de"],
    "rest api":                    ["restful", "rest", "api development"],
    "microservices":               ["micro services", "soa"],
    "artificial intelligence":     ["ai"],
    "agile":                       ["scrum", "kanban", "sprint"],
    # Finance / non-tech (so NER can detect them and NOT match SDE jobs)
    "financial modeling":          ["financial analysis", "dcf"],
    "accounting":                  ["bookkeeping", "ledger"],
    "investment banking":          ["ib", "m&a"],
    "risk management":             ["risk analysis", "var"],
}

_ALIAS_TO_CANONICAL = {
    alias: canonical
    for canonical, aliases in SKILL_SYNONYMS.items()
    for alias in aliases
}

# Also add self-mappings so canonical names map to themselves
for canonical in SKILL_SYNONYMS:
    _ALIAS_TO_CANONICAL[canonical] = canonical


# ══════════════════════════════════════════════════════════════════════════════
#  NER PIPELINE — with canonical skill resolution
# ══════════════════════════════════════════════════════════════════════════════

def _token_pattern(token_str: str) -> dict:
    if token_str.isalpha():
        return {"LOWER": token_str.lower()}
    return {"TEXT": token_str}

def _make_ner_patterns() -> list[dict]:
    patterns = []
    seen     = set()
    for canonical, aliases in SKILL_SYNONYMS.items():
        for surface in [canonical] + aliases:
            surface_clean = surface.strip()
            if surface_clean in seen:
                continue
            seen.add(surface_clean)
            token_dicts = [_token_pattern(t) for t in surface_clean.split()]
            patterns.append({"label": "TECH_SKILL", "pattern": token_dicts})
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
    doc = nlp(text[:25_000])
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
# ══════════════════════════════════════════════════════════════════════════════

def _parse_kv(combined_resume: str) -> dict[str, str]:
    kv = {}
    for line in combined_resume.split("\n"):
        if ":" in line:
            key, _, val = line.partition(":")
            kv[key.strip().lower()] = val.strip()
    return kv


# ══════════════════════════════════════════════════════════════════════════════
#  TEMPORAL RECENCY & EXPERIENCE EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

def _score_temporal(query_skills: set, texts: list) -> np.ndarray:
    if not query_skills:
        return np.full(len(texts), 50.0)

    scores = []
    for text in texts:
        kv = _parse_kv(text)

        skill_coverage = None
        for key, val in kv.items():
            if any(kw in key for kw in _SKILL_COL_KEYWORDS):
                val_lower = val.lower()
                hit = sum(1 for s in query_skills if s in val_lower)
                skill_coverage = hit / len(query_skills)
                break

        exp_years = None
        for key, val in kv.items():
            if any(kw in key for kw in _EXP_KEYWORDS):
                m = _NUM_RE.search(val)
                if m:
                    candidate_val = float(m.group(1))
                    if 0 < candidate_val < 60:
                        exp_years = candidate_val
                        break

        if skill_coverage is not None and exp_years is not None:
            coverage_score = 60.0 + skill_coverage * 40.0
            exp_boost      = min(20.0, exp_years * 2.0)
            score          = min(100.0, coverage_score + exp_boost * (1 - skill_coverage))
        elif skill_coverage is not None:
            score = 60.0 + skill_coverage * 40.0
        elif exp_years is not None:
            score = min(85.0, 40.0 + exp_years * 3.5)
        else:
            score = 50.0

        scores.append(score)

    return np.array(scores)


def _extract_max_years(row: pd.Series) -> int | None:
    resume_text = str(row.get("combined_resume", ""))

    kv = _parse_kv(resume_text)
    for key, val in kv.items():
        if any(kw in key for kw in _EXP_KEYWORDS):
            m = _NUM_RE.search(val)
            if m:
                candidate = float(m.group(1))
                if 0 < candidate < 60:
                    return int(candidate)

    for col in row.index:
        col_norm = col.lower().replace(" ", "_").replace("-", "_")
        if any(kw in col_norm for kw in _EXP_KEYWORDS):
            try:
                val = float(row[col])
                if 0 < val < 60:
                    return int(val)
            except (ValueError, TypeError):
                m = _NUM_RE.search(str(row[col]))
                if m:
                    candidate = float(m.group(1))
                    if 0 < candidate < 60:
                        return int(candidate)

    found = []
    for pattern in _EXP_TEXT_PATTERNS:
        for m in pattern.finditer(resume_text):
            try:
                found.append(int(float(m.group(1))))
            except (IndexError, ValueError):
                pass

    return max(found) if found else None


def _hard_filter_multipliers(df: pd.DataFrame, min_years: int) -> np.ndarray:
    multipliers = []
    for _, row in df.iterrows():
        max_yrs = _extract_max_years(row)
        if max_yrs is None:
            mult = SOFT_NEUTRAL_MULT
        elif max_yrs >= min_years:
            mult = 1.00
        else:
            mult = HARD_FILTER_PENALTY
        multipliers.append(mult)
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


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN SCORER CLASS
# ══════════════════════════════════════════════════════════════════════════════

class RecruiterATSScorer:
    def __init__(
        self,
        bge_model:   str = "BAAI/bge-small-en-v1.5",
        mini_model:  str = "sentence-transformers/all-MiniLM-L6-v2",
        cross_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    ):
        print("\n[1/4] Loading BGE model...")
        self.bge = SentenceTransformer(bge_model)
        self.bge.eval()

        print("[2/4] Loading MiniLM model...")
        self.minilm = SentenceTransformer(mini_model)
        self.minilm.eval()

        print("[3/4] Loading Cross-Encoder...")
        self.cross = CrossEncoder(cross_model, max_length=512, default_activation_function=None)

        print("[4/4] Loading spaCy NER...")
        self.nlp = _build_ner_pipeline()
        print("Success: Models loaded.\n")

    def load_and_prep_candidates(self, csv_path: str, limit: int = None) -> pd.DataFrame:
        """Loads Kaggle CSV into DataFrame."""
        print(f"Loading candidate dataset from {csv_path}...")
        df = pd.read_csv(csv_path)
        df = df.fillna('')

        df['combined_resume'] = df.apply(
            lambda r: '\n'.join([f"{c}: {str(v)}" for c, v in r.items()]),
            axis=1
        )
        if limit:
            df = df.head(limit)

        print(f"Prepared {len(df)} candidate profiles.")
        return df

    def _score_bge(self, query, texts):
        """BGE semantic similarity — NO 2x inflation, raw cosine * 100."""
        q = self.bge.encode(query)
        r = self.bge.encode(texts, show_progress_bar=False)
        raw = cosine_similarity([q], r)[0] * 100
        return np.clip(raw, 0.0, 100.0)

    def _score_minilm(self, query, texts):
        """MiniLM semantic similarity — NO 2x inflation, raw cosine * 100."""
        q = self.minilm.encode(query)
        r = self.minilm.encode(texts, show_progress_bar=False)
        raw = cosine_similarity([q], r)[0] * 100
        return np.clip(raw, 0.0, 100.0)

    def _score_cross_encoder(self, query, texts):
        """
        Cross-encoder scoring with sigmoid scaling to [0, 100].
        NO artificial floor — irrelevant text should score near 0.
        """
        pairs  = [(query, t) for t in texts]
        logits = self.cross.predict(
            pairs, batch_size=32, show_progress_bar=False, convert_to_numpy=True
        ).astype(float)
        # Sigmoid maps logits to [0, 1], then scale to [0, 100]
        scaled = (1.0 / (1.0 + np.exp(-logits))) * 100.0
        return np.round(scaled, 2)

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
    ) -> pd.DataFrame:
        texts        = df["combined_resume"].tolist()
        query_skills = _extract_ner_skills(self.nlp, recruiter_query)
        n_candidates = len(texts)

        # ── Run all 6 scoring signals ─────────────────────────────────────
        bge_s   = self._score_bge(recruiter_query, texts)
        mini_s  = self._score_minilm(recruiter_query, texts)
        cross_s = self._score_cross_encoder(recruiter_query, texts)
        bm25_s  = self._score_bm25(recruiter_query, texts)
        ner_s   = _score_ner_skills(self.nlp, query_skills, texts)
        temp_s  = _score_temporal(query_skills, texts)

        W = WEIGHTS
        ensemble = (
            W["bge"]           * bge_s
            + W["minilm"]      * mini_s
            + W["cross_encoder"] * cross_s
            + W["bm25"]        * bm25_s
            + W["ner_skills"]  * ner_s
            + W["temporal"]    * temp_s
        )

        multipliers = _hard_filter_multipliers(df, min_years_exp)
        ensemble    = ensemble * multipliers

        # ── Calibrate ─────────────────────────────────────────────────────
        if n_candidates >= 3:
            # Pool mode: percentile stretch gives wide spread across pool
            calibrated = _calibrate_pool(ensemble)
        else:
            # Single-candidate mode (web app): absolute scoring using
            # skill overlap as the primary discriminator (60% weight in ensemble)
            calibrated = np.zeros(n_candidates)
            for i in range(n_candidates):
                if query_skills:
                    resume_skills = _extract_ner_skills(self.nlp, texts[i])
                    skill_ratio = len(query_skills & resume_skills) / len(query_skills)
                else:
                    skill_ratio = 0.5   # no skills to check → neutral
                calibrated[i] = _calibrate_single(
                    ensemble[i], skill_ratio, multipliers[i]
                )

        df = df.copy()
        df["match_score"] = calibrated
        return df.sort_values("match_score", ascending=False).head(top_n)


# ==========================================
# Recruiter Execution Script
# ==========================================
if __name__ == "__main__":
    scorer = RecruiterATSScorer()

    print("\n" + "=" * 50)
    print("📝 RECRUITER INPUT DASHBOARD")
    print("=" * 50)

    job_position = input("1. Enter Job Title (e.g., Senior Backend Developer): ")
    try:
        years_of_experience = int(input("2. Enter Required Years of Experience (e.g., 5): "))
    except ValueError:
        years_of_experience = 0

    skillset = input("3. Enter Required Skills (e.g., Python, AWS, SQL): ")
    job_description = input("4. Enter a Brief Job Description: ")

    recruiter_query = f"""
    Title: {job_position}
    Required Experience: {years_of_experience} years
    Skills: {skillset}
    Description: {job_description}
    """

    KAGGLE_CANDIDATE_PATH = '/kaggle/input/datasets/ckshetty/candidate-job-role-dataset/candidate_job_role_dataset.csv'

    try:
        candidates_df = scorer.load_and_prep_candidates(KAGGLE_CANDIDATE_PATH, limit=1000)
    except FileNotFoundError:
        print(f"\nError: Could not find {KAGGLE_CANDIDATE_PATH}. Attach it to your notebook.")
        exit()

    print("\nScoring candidates... (running deep learning ensemble)")
    scored_candidates = scorer.find_top_candidates(
        recruiter_query, candidates_df, min_years_exp=years_of_experience
    )

    top_resumes = scored_candidates.head(5)

    print("\n" + "=" * 50)
    print(f"TOP 5 CANDIDATES FOR: {job_position.upper()}")
    print("=" * 50)

    for _, row in top_resumes.iterrows():
        print(f"Match Score: {row['match_score']:.2f} / 100")
        snippet = row['combined_resume'].replace('\n', ' | ')[:120]
        print(f"Profile Snapshot: {snippet}...")
        print("-" * 50)
