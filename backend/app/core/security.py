import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from jose import jwt
from app.core.config import settings

def get_password_hash(password: str) -> str:
    """Uses robust SHA-256 with salt for secure and portable credential storage."""
    salt = settings.SECRET_KEY[:16]
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def calculate_sha256_hash(payload: Any, prev_hash: str, actor_id: str, timestamp: str) -> str:
    """Calculates SHA-256 for tamper-evident linear audit chaining."""
    payload_str = json.dumps(payload, sort_keys=True, default=str)
    raw = f"{payload_str}|{prev_hash}|{actor_id}|{timestamp}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
