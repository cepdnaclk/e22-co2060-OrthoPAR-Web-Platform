from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Auth Settings (from friend's branch)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/tabelname")

    # AWS/Clinical Settings (from ML branch)
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "your_access_key")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "your_secret_key")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "orthoapp-scans")

    class Config:
        env_file = ".env"

settings = Settings()

# Maintain backward compatibility for loose imports
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
DATABASE_URL = settings.DATABASE_URL

