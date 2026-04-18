"""
TalentFlow ML Engine — IndustryATSScorer
Self-contained module for HuggingFace Spaces deployment.

Scoring Architecture:
  BUCKET          SIGNALS                         BUCKET WT  SIGNAL WT
  Semantic        BGE Bi-Encoder                    45 %       22.5 %
                  MiniLM Bi-Encoder                            22.5 %
  Precision       Cross-Encoder (DL, sigmoid)       45 %       25.0 %
                  BM25 Okapi                                   20.0 %
  Validation      NER Skill Overlap                 10 %        6.0 %
                  Temporal Recency                              4.0 %
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
HALF_LIFE_YEARS = 5
HARD_FILTER_PENALTY  = 0.50
SOFT_NEUTRAL_MULT    = 0.75

WEIGHTS = {
    "bge":           0.225,
    "minilm":        0.225,
    "cross_encoder": 0.250,
    "bm25":          0.200,
    "ner_skills":    0.060,
    "temporal":      0.040,
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


# ══════════════════════════════════════════════════════════════════════════════
#  SKILL SYNONYM TABLE
# ══════════════════════════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════════════════════════
#  NER PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

def _make_ner_patterns() -> list[dict]:
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
    doc = nlp(text[:50_000])
    return {ent.text.lower() for ent in doc.ents if ent.label_ == "TECH_SKILL"}


def _score_ner_skills(nlp, query_skills: set, texts: list) -> np.ndarray:
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


_EXP_KEYWORDS = ["experience", "years", "exp", "yrs", "tenure", "seniority"]
_NUM_RE = re.compile(r"(\d+(?:\.\d+)?)")

_EXP_TEXT_PATTERNS = [
    re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience", re.I),
    re.compile(r"experience\s*[:\-]?\s*(\d{1,2})", re.I),
    re.compile(r"over\s+(\d{1,2})\s+years?", re.I),
    re.compile(r"more\s+than\s+(\d{1,2})\s+years?", re.I),
    re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)", re.I),
]


# ══════════════════════════════════════════════════════════════════════════════
#  TEMPORAL RECENCY
# ══════════════════════════════════════════════════════════════════════════════

_SKILL_COL_KEYWORDS = ["skill", "tech", "tool", "stack", "language", "framework",
                        "competenc", "proficien", "expertise"]


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
                skill_coverage = (hit / len(query_skills))
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


# ══════════════════════════════════════════════════════════════════════════════
#  EXPERIENCE EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

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
            multipliers.append(SOFT_NEUTRAL_MULT)
        elif max_yrs >= min_years:
            multipliers.append(1.00)
        else:
            multipliers.append(HARD_FILTER_PENALTY)
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


def _banner(t):
    print("\n" + "═"*62)
    print(f"  {t}")
    print("═"*62)


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

        print("\n  ✅  All components ready.\n")

    def _score_bge(self, query, texts):
        q = self.bge.encode(query)
        r = self.bge.encode(texts, show_progress_bar=False)
        return np.maximum(0.0, cosine_similarity([q], r)[0] * 100)

    def _score_minilm(self, query, texts):
        q = self.minilm.encode(query)
        r = self.minilm.encode(texts, show_progress_bar=False)
        return np.maximum(0.0, cosine_similarity([q], r)[0] * 100)

    def _score_cross_encoder(self, query, texts):
        pairs  = [(query, t) for t in texts]
        logits = self.cross.predict(
            pairs, batch_size=32, show_progress_bar=False, convert_to_numpy=True
        )
        return _sigmoid_scale(logits)

    def _score_bm25(self, query, texts):
        tokenised = [_tokenise(t) for t in texts]
        bm25      = BM25Okapi(tokenised, k1=1.5, b=0.75)
        raw       = np.array(bm25.get_scores(_tokenise(query)), dtype=float)
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
        print(f"  NER extracted query skills: {sorted(query_skills) or '⚠ none'}\n")

        print("  [1/6] BGE Bi-Encoder …")
        bge_s   = self._score_bge(recruiter_query, texts)

        print("  [2/6] MiniLM Bi-Encoder …")
        mini_s  = self._score_minilm(recruiter_query, texts)

        print("  [3/6] Cross-Encoder …")
        cross_s = self._score_cross_encoder(recruiter_query, texts)

        print("  [4/6] BM25 Retrieval …")
        bm25_s  = self._score_bm25(recruiter_query, texts)

        print("  [5/6] NER Skill Overlap …")
        ner_s   = _score_ner_skills(self.nlp, query_skills, texts)

        print("  [6/6] Temporal Recency …")
        temp_s  = _score_temporal(query_skills, texts)

        W        = WEIGHTS
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

        df = df.copy()
        df["score_bge"]           = np.round(bge_s,    2)
        df["score_minilm"]        = np.round(mini_s,   2)
        df["score_cross_encoder"] = np.round(cross_s,  2)
        df["score_bm25"]          = np.round(bm25_s,   2)
        df["score_ner_skills"]    = np.round(ner_s,    2)
        df["score_temporal"]      = np.round(temp_s,   2)
        df["exp_multiplier"]      = np.round(multipliers, 2)
        df["match_score"]         = np.round(ensemble, 2)

        return df.sort_values("match_score", ascending=False).head(top_n)
