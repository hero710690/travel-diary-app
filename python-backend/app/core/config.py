from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import validator
import os


class Settings(BaseSettings):
    # Database Configuration
    DATABASE_TYPE: str = "mongodb"  # "mongodb" or "dynamodb"
    
    # MongoDB (for local development)
    MONGODB_URL: str = "mongodb://localhost:27017/travel_diary"
    DATABASE_NAME: str = "travel_diary"
    
    # DynamoDB (for AWS deployment)
    AWS_REGION: str = "us-east-1"
    USERS_TABLE: str = "travel-diary-users"
    TRIPS_TABLE: str = "travel-diary-trips"
    SESSIONS_TABLE: str = "travel-diary-sessions"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Travel Diary API"
    VERSION: str = "1.0.0"
    
    # CORS - Updated for CloudFront
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://localhost:3001", 
        "https://localhost:3001"
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                # Handle JSON-like string
                import json
                try:
                    return json.loads(v)
                except:
                    pass
            # Handle comma-separated string
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return [str(v)]
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # External APIs
    GOOGLE_MAPS_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
