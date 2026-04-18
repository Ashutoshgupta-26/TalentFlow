"""MongoDB connection and helpers."""

from datetime import datetime, timezone
import bcrypt
from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument
from app.config import MONGODB_DB_NAME, MONGODB_URI

_client: MongoClient | None = None
_db = None


def _ensure_demo_users() -> None:
    """Seed demo users only when the users collection is empty."""
    users = get_collection("users")
    if users.count_documents({}, limit=1) > 0:
        return

    hashed = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)

    users.insert_many(
        [
            {
                "id": 1,
                "name": "John Candidate",
                "email": "candidate@demo.com",
                "password_hash": hashed,
                "role": "candidate",
                "created_at": now,
            },
            {
                "id": 2,
                "name": "Jane Recruiter",
                "email": "recruiter@demo.com",
                "password_hash": hashed,
                "role": "recruiter",
                "created_at": now,
            },
        ]
    )

    counters = get_collection("counters")
    counters.update_one(
        {"_id": "users"},
        {"$max": {"sequence_value": 2}},
        upsert=True,
    )


def init_db() -> None:
    """Initialize MongoDB client and required indexes."""
    global _client, _db
    _client = MongoClient(MONGODB_URI)
    _db = _client[MONGODB_DB_NAME]

    # Basic connectivity check
    _client.admin.command("ping")

    # Uniqueness and query indexes
    _db.users.create_index([("email", ASCENDING)], unique=True)
    _db.resumes.create_index([("user_id", ASCENDING)], unique=True)
    _db.jobs.create_index([("recruiter_id", ASCENDING)])
    _db.jobs.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
    _db.applications.create_index([("job_id", ASCENDING)])
    _db.applications.create_index([("candidate_id", ASCENDING)])
    _db.applications.create_index([("status", ASCENDING)])
    _db.applications.create_index([("match_score", DESCENDING)])
    _db.applications.create_index(
        [("job_id", ASCENDING), ("candidate_id", ASCENDING)],
        unique=True,
    )
    _db.ats_results.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    _db.education.create_index([("resume_id", ASCENDING)])
    _db.experience.create_index([("resume_id", ASCENDING)])

    _ensure_demo_users()


def close_db() -> None:
    """Close MongoDB client."""
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


def get_db():
    if _db is None:
        raise RuntimeError("Database is not initialized")
    return _db


def get_collection(name: str):
    return get_db()[name]


def get_next_sequence(name: str) -> int:
    counters = get_collection("counters")
    doc = counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["sequence_value"])
