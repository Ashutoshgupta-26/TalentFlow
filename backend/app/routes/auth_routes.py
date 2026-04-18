"""Auth routes: signup, login."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.database import get_collection, get_next_sequence
from app.auth import hash_password, verify_password, create_access_token
from app.schemas import SignupRequest, LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest):
    users = get_collection("users")

    if users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user = {
        "id": get_next_sequence("users"),
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "created_at": datetime.now(timezone.utc),
    }
    users.insert_one(user)

    token = create_access_token({"user_id": user["id"], "role": user["role"]})
    return {
        "token": token,
        "user": UserOut(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            created_at=user["created_at"],
        ),
    }


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    users = get_collection("users")
    user = users.find_one({"email": body.email}, {"_id": 0})

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"user_id": user["id"], "role": user["role"]})
    return {
        "token": token,
        "user": UserOut(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            created_at=user["created_at"],
        ),
    }
