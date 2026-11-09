import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Waymark APAAR Hub"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "sih-aicte-apaar-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Database
    DATABASE_URL: str = "sqlite:///./waymark_apaar.db"
    
    # Storage
    UPLOAD_DIR: str = "./storage/uploads"
    EXPORT_DIR: str = "./storage/exports"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://192.168.1.5:3000",
        "http://192.168.1.5:8000"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

